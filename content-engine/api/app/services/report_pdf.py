"""Server-side PDF rendering for client-facing reports.

Builds a clean, branded PDF from a :class:`~app.models.report.Report`'s frozen
``data`` snapshot using ReportLab (pure-python, no system deps).  The renderer
is intentionally defensive: it tolerates missing / partial snapshot fields so a
report created by any version of ``_build_snapshot`` still produces a valid PDF.
"""
from __future__ import annotations

import io
from typing import Any

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# --- Brand palette ---------------------------------------------------------
BRAND_PRIMARY = colors.HexColor("#6D28D9")  # violet
BRAND_DARK = colors.HexColor("#1E1B2E")
BRAND_MUTED = colors.HexColor("#6B7280")
BRAND_LIGHT = colors.HexColor("#F3F0FF")
BRAND_BORDER = colors.HexColor("#E5E7EB")


def _fmt_num(value: Any) -> str:
    """Human-friendly number formatting (1.2k / 3.4M)."""
    try:
        n = float(value)
    except (TypeError, ValueError):
        return str(value or 0)
    if abs(n) >= 1_000_000:
        return f"{n / 1_000_000:.1f}M"
    if abs(n) >= 1_000:
        return f"{n / 1_000:.1f}k"
    if n == int(n):
        return f"{int(n)}"
    return f"{n:.2f}"


def _styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "brand": ParagraphStyle(
            "brand", parent=base["Normal"], fontName="Helvetica-Bold",
            fontSize=11, textColor=BRAND_PRIMARY, spaceAfter=2,
        ),
        "title": ParagraphStyle(
            "title", parent=base["Title"], fontName="Helvetica-Bold",
            fontSize=24, textColor=BRAND_DARK, spaceAfter=4, alignment=TA_LEFT,
            leading=28,
        ),
        "subtitle": ParagraphStyle(
            "subtitle", parent=base["Normal"], fontSize=10,
            textColor=BRAND_MUTED, spaceAfter=2,
        ),
        "section": ParagraphStyle(
            "section", parent=base["Heading2"], fontName="Helvetica-Bold",
            fontSize=13, textColor=BRAND_DARK, spaceBefore=14, spaceAfter=6,
        ),
        "cell": ParagraphStyle(
            "cell", parent=base["Normal"], fontSize=9, textColor=BRAND_DARK,
        ),
        "cellhead": ParagraphStyle(
            "cellhead", parent=base["Normal"], fontName="Helvetica-Bold",
            fontSize=9, textColor=colors.white,
        ),
        "metricval": ParagraphStyle(
            "metricval", parent=base["Normal"], fontName="Helvetica-Bold",
            fontSize=16, textColor=BRAND_PRIMARY, alignment=TA_CENTER,
        ),
        "metriclbl": ParagraphStyle(
            "metriclbl", parent=base["Normal"], fontSize=8,
            textColor=BRAND_MUTED, alignment=TA_CENTER,
        ),
        "footer": ParagraphStyle(
            "footer", parent=base["Normal"], fontSize=8, textColor=BRAND_MUTED,
            alignment=TA_CENTER,
        ),
    }


def _metric_cards(data: dict[str, Any], st: dict[str, ParagraphStyle]) -> Table:
    totals = data.get("totals") or {}
    ctr = data.get("ctr", 0)
    cards = [
        ("Impressions", _fmt_num(totals.get("impressions", 0))),
        ("Clicks", _fmt_num(totals.get("clicks", 0))),
        ("Engagements", _fmt_num(totals.get("engagements", 0))),
        ("Conversions", _fmt_num(totals.get("conversions", 0))),
        ("CTR", f"{float(ctr or 0):.2f}%"),
    ]
    row = [
        [Paragraph(val, st["metricval"]), Paragraph(lbl, st["metriclbl"])]
        for lbl, val in cards
    ]
    # Each card is a tiny 2-row table so value sits above label.
    card_tables = []
    for cell in row:
        t = Table([[cell[0]], [cell[1]]], colWidths=[33 * mm])
        t.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), BRAND_LIGHT),
                    ("BOX", (0, 0), (-1, -1), 0.5, BRAND_BORDER),
                    ("TOPPADDING", (0, 0), (-1, -1), 8),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ]
            )
        )
        card_tables.append(t)
    outer = Table([card_tables], colWidths=[35 * mm] * len(card_tables))
    outer.setStyle(
        TableStyle(
            [
                ("LEFTPADDING", (0, 0), (-1, -1), 1),
                ("RIGHTPADDING", (0, 0), (-1, -1), 1),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    return outer


def _kv_table(rows: list[tuple[str, str]], st: dict[str, ParagraphStyle]) -> Table:
    body = [
        [Paragraph(k, st["cellhead"]), Paragraph(v, st["cell"])] for k, v in rows
    ]
    t = Table(body, colWidths=[55 * mm, 110 * mm])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), BRAND_PRIMARY),
                ("ROWBACKGROUNDS", (1, 0), (1, -1), [colors.white, BRAND_LIGHT]),
                ("GRID", (0, 0), (-1, -1), 0.5, BRAND_BORDER),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
        )
    )
    return t


def _source_table(data: dict[str, Any], st: dict[str, ParagraphStyle]) -> Table | None:
    by_source = data.get("by_source") or {}
    if not by_source:
        return None
    header = ["Source", "Impressions", "Clicks", "Engagements", "Conversions"]
    rows = [[Paragraph(h, st["cellhead"]) for h in header]]
    for src, vals in by_source.items():
        rows.append(
            [
                Paragraph(str(src), st["cell"]),
                Paragraph(_fmt_num(vals.get("impressions", 0)), st["cell"]),
                Paragraph(_fmt_num(vals.get("clicks", 0)), st["cell"]),
                Paragraph(_fmt_num(vals.get("engagements", 0)), st["cell"]),
                Paragraph(_fmt_num(vals.get("conversions", 0)), st["cell"]),
            ]
        )
    t = Table(rows, colWidths=[45 * mm, 30 * mm, 30 * mm, 30 * mm, 30 * mm])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), BRAND_PRIMARY),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BRAND_LIGHT]),
                ("GRID", (0, 0), (-1, -1), 0.5, BRAND_BORDER),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
        )
    )
    return t


def _posts_table(data: dict[str, Any], st: dict[str, ParagraphStyle]) -> Table | None:
    posts = data.get("posts") or []
    if not posts:
        return None
    header = ["Post", "Platform", "Impr.", "Clicks", "Eng.", "Likes"]
    rows = [[Paragraph(h, st["cellhead"]) for h in header]]
    for p in posts[:15]:
        title = (p.get("title") or "Untitled")
        if len(title) > 48:
            title = title[:45] + "…"
        rows.append(
            [
                Paragraph(title, st["cell"]),
                Paragraph(str(p.get("platform", "—")), st["cell"]),
                Paragraph(_fmt_num(p.get("impressions", 0)), st["cell"]),
                Paragraph(_fmt_num(p.get("clicks", 0)), st["cell"]),
                Paragraph(_fmt_num(p.get("engagements", 0)), st["cell"]),
                Paragraph(_fmt_num(p.get("likes", 0)), st["cell"]),
            ]
        )
    t = Table(rows, colWidths=[60 * mm, 28 * mm, 20 * mm, 20 * mm, 20 * mm, 20 * mm])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), BRAND_PRIMARY),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BRAND_LIGHT]),
                ("GRID", (0, 0), (-1, -1), 0.5, BRAND_BORDER),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
        )
    )
    return t


def _build_pdf_bytes(report: Any, workspace_name: str) -> bytes:
    st = _styles()
    data: dict[str, Any] = getattr(report, "data", None) or {}

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        title=getattr(report, "title", "Report") or "Report",
        author=workspace_name,
    )

    story: list[Any] = []

    # --- Header ----------------------------------------------------------
    story.append(Paragraph(workspace_name.upper(), st["brand"]))
    story.append(Paragraph(getattr(report, "title", "Performance Report") or "Performance Report", st["title"]))

    client = getattr(report, "client_name", None)
    if client:
        story.append(Paragraph(f"Prepared for <b>{client}</b>", st["subtitle"]))

    date_from = getattr(report, "date_from", None)
    date_to = getattr(report, "date_to", None)
    if date_from or date_to:
        story.append(
            Paragraph(
                f"Reporting period: {date_from or '—'} → {date_to or '—'}",
                st["subtitle"],
            )
        )
    created = getattr(report, "created_at", None)
    if created is not None:
        try:
            story.append(Paragraph(f"Generated: {created.strftime('%d %b %Y')}", st["subtitle"]))
        except Exception:
            pass

    story.append(Spacer(1, 6))
    story.append(HRFlowable(width="100%", thickness=1.2, color=BRAND_PRIMARY))
    story.append(Spacer(1, 10))

    # --- Key metrics -----------------------------------------------------
    story.append(Paragraph("Key Metrics", st["section"]))
    story.append(_metric_cards(data, st))

    # --- Overview --------------------------------------------------------
    totals = data.get("totals") or {}
    overview_rows = [
        ("Total Spend", _fmt_num(totals.get("spend", 0))),
        ("Content Pieces", _fmt_num(data.get("content_count", 0))),
        ("Published", _fmt_num(data.get("published_count", 0))),
        ("Tracked Posts", _fmt_num(len(data.get("posts") or []))),
    ]
    story.append(Paragraph("Overview", st["section"]))
    story.append(_kv_table(overview_rows, st))

    # --- By source -------------------------------------------------------
    src_tbl = _source_table(data, st)
    if src_tbl is not None:
        story.append(Paragraph("Performance by Source", st["section"]))
        story.append(src_tbl)

    # --- Highlights / top posts -----------------------------------------
    posts_tbl = _posts_table(data, st)
    if posts_tbl is not None:
        story.append(Paragraph("Highlights — Top Posts", st["section"]))
        story.append(posts_tbl)

    # --- Footer ----------------------------------------------------------
    story.append(Spacer(1, 16))
    story.append(HRFlowable(width="100%", thickness=0.5, color=BRAND_BORDER))
    story.append(Spacer(1, 4))
    story.append(
        Paragraph(
            f"Confidential — prepared by {workspace_name}. Powered by Trayarunya Ventures.",
            st["footer"],
        )
    )

    doc.build(story)
    return buf.getvalue()


async def render_report_pdf(report: Any, workspace_name: str = "Trayarunya Ventures") -> bytes:
    """Render a branded PDF for ``report`` and return the raw bytes.

    The function is async to fit the FastAPI request flow, but ReportLab is
    synchronous and CPU-light, so it runs inline.
    """
    name = workspace_name or "Trayarunya Ventures"
    return _build_pdf_bytes(report, name)
