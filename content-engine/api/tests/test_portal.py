"""Client portal: token-scope isolation (pure) + end-to-end flow (DB-backed).

The DB-backed test is skipped automatically when no test database is reachable
(see ``conftest.requires_db``), so the pure checks always run in CI.
"""
from __future__ import annotations

import uuid

import pytest

from app.security import create_portal_token, decode_token
from tests.conftest import requires_db


# --------------------------------------------------------------------------- #
# Pure: portal token carries the right scope and is distinguishable
# --------------------------------------------------------------------------- #
def test_portal_token_has_scope_and_workspace():
    ws = str(uuid.uuid4())
    user = str(uuid.uuid4())
    token = create_portal_token(user, ws)
    payload = decode_token(token)
    assert payload is not None
    assert payload["scope"] == "portal"
    assert payload["wsid"] == ws
    assert payload["sub"] == user


# --------------------------------------------------------------------------- #
# DB-backed: full invite -> accept -> isolation -> approve -> revoke
# --------------------------------------------------------------------------- #
@requires_db
@pytest.mark.asyncio
async def test_portal_end_to_end():
    import httpx
    from httpx import ASGITransport

    from app.db import AsyncSessionLocal, engine
    from app.main import app
    from app.models import ContentItem, ContentStatus, ContentType
    from app.models.base import Base

    # The DB-availability probe in conftest opens connections on a different
    # event loop; dispose the pool so every connection here is bound to the
    # current test loop.
    await engine.dispose()

    # Ensure portal tables exist (idempotent).
    async with engine.begin() as conn:
        await conn.run_sync(
            lambda c: Base.metadata.create_all(
                c,
                tables=[
                    Base.metadata.tables["client_portal_invites"],
                    Base.metadata.tables["client_portal_members"],
                ],
            )
        )

    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://t") as c:
        sfx = uuid.uuid4().hex[:8]

        # Agency signup + workspace
        r = await c.post(
            "/api/v1/auth/signup",
            json={
                "email": f"ag_{sfx}@t.com",
                "password": "secret12",
                "full_name": "Owner",
                "org_name": f"Ag {sfx}",
                "org_type": "agency",
            },
        )
        assert r.status_code == 200, r.text
        ah = {"Authorization": f"Bearer {r.json()['access_token']}"}
        wsid = (await c.get("/api/v1/auth/me", headers=ah)).json()["workspaces"][0]["id"]
        wsh = {**ah, "X-Workspace-Id": wsid}

        # Content in review
        async with AsyncSessionLocal() as db:
            item = ContentItem(
                workspace_id=uuid.UUID(wsid),
                content_type=ContentType.social_post,
                status=ContentStatus.in_review,
                title="Review me",
                body="body",
            )
            db.add(item)
            await db.commit()
            await db.refresh(item)
            cid = str(item.id)

        # Invite (approver) + accept
        r = await c.post(
            "/api/v1/portal/invites",
            headers=wsh,
            json={"email": f"cl_{sfx}@t.com", "role": "approver"},
        )
        assert r.status_code == 201, r.text
        raw = r.json()["token"]

        r = await c.post(
            "/api/v1/portal/accept",
            json={"token": raw, "full_name": "Client", "password": "clientpw1"},
        )
        assert r.status_code == 200, r.text
        ph = {"Authorization": f"Bearer {r.json()['access_token']}"}

        # Isolation both ways
        assert (await c.get("/api/v1/auth/me", headers=ph)).status_code == 403
        assert (await c.get("/api/v1/portal/overview", headers=ah)).status_code == 401

        # Overview + approve
        ov = (await c.get("/api/v1/portal/overview", headers=ph)).json()
        assert ov["pending_approvals"] >= 1
        r = await c.post(
            f"/api/v1/portal/approvals/{cid}",
            headers=ph,
            json={"decision": "approved", "note": "ok"},
        )
        assert r.status_code == 200 and r.json()["status"] == "approved"

        # Agency sees the client's decision
        cur = (
            await c.get(
                f"/api/v1/collab/approvals?entity_type=content&entity_id={cid}",
                headers=wsh,
            )
        ).json()["current"]
        assert cur and cur["status"] == "approved"

        # Revoke -> access blocked
        mid = (await c.get("/api/v1/portal/members", headers=wsh)).json()[0]["id"]
        assert (
            await c.post(f"/api/v1/portal/members/{mid}/revoke", headers=wsh)
        ).status_code == 200
        assert (await c.get("/api/v1/portal/overview", headers=ph)).status_code == 403
