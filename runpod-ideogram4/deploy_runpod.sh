#!/usr/bin/env bash
set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
RUNPOD_API_KEY="${RUNPOD_API_KEY:?Set RUNPOD_API_KEY}"
HF_TOKEN="${HF_TOKEN:?Set HF_TOKEN}"
GH_USER="${GH_USER:-Sumitshrm12}"
IMAGE="ghcr.io/${GH_USER}/ideogram4-runpod:latest"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── 1. Copy vendored ideogram4 source ─────────────────────────────────────────
echo "=== Preparing ideogram4 source ==="
IDEOGRAM_SRC="/tmp/ideogram4-src/src/ideogram4"
if [[ ! -d "$IDEOGRAM_SRC" ]]; then
  echo "Cloning ideogram4 from GitHub..."
  rm -rf /tmp/ideogram4-src
  git clone --depth 1 https://github.com/ideogram-oss/ideogram4.git /tmp/ideogram4-src
fi
rm -rf "${SCRIPT_DIR}/ideogram4"
cp -r "$IDEOGRAM_SRC" "${SCRIPT_DIR}/ideogram4"
echo "Vendored ideogram4 source ✅"

# ── 2. Build Docker image (linux/amd64) ──────────────────────────────────────
echo "=== Building Docker image: ${IMAGE} ==="
docker buildx build \
  --platform linux/amd64 \
  --provenance=false \
  -t "${IMAGE}" \
  --push \
  "${SCRIPT_DIR}"
echo "Image pushed ✅"

# ── 3. Create RunPod serverless endpoint via GraphQL API ─────────────────────
echo "=== Creating RunPod template ==="
TEMPLATE_NAME="ideogram4-fp8-$(date +%s)"

TEMPLATE_RESP=$(curl -sS "https://api.runpod.io/graphql?api_key=${RUNPOD_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "$(cat <<GRAPHQL
{
  "query": "mutation { saveTemplate(input: { name: \"${TEMPLATE_NAME}\", imageName: \"${IMAGE}\", isServerless: true, containerDiskInGb: 30, volumeInGb: 80, env: [{ key: \"HF_TOKEN\", value: \"${HF_TOKEN}\" }], dockerArgs: \"\" }) { id name imageName } }"
}
GRAPHQL
)")

TEMPLATE_ID=$(echo "$TEMPLATE_RESP" | python3 -c "
import json, sys
d = json.load(sys.stdin)
t = d.get('data',{}).get('saveTemplate',{})
print(t.get('id',''))
" 2>/dev/null)

if [[ -z "$TEMPLATE_ID" ]]; then
  echo "Template creation failed:"
  echo "$TEMPLATE_RESP" | python3 -m json.tool 2>/dev/null || echo "$TEMPLATE_RESP"
  exit 1
fi
echo "Template: ${TEMPLATE_ID} ✅"

echo "=== Creating RunPod serverless endpoint ==="
ENDPOINT_NAME="ideogram4-fp8"

ENDPOINT_RESP=$(curl -sS "https://api.runpod.io/graphql?api_key=${RUNPOD_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "$(cat <<GRAPHQL
{
  "query": "mutation { saveEndpoint(input: { templateId: \"${TEMPLATE_ID}\", name: \"${ENDPOINT_NAME}\", gpuIds: \"NVIDIA L40S,NVIDIA RTX A6000,NVIDIA A40,NVIDIA A100 80GB PCIe\", workersMin: 0, workersMax: 1, idleTimeout: 5, scalerType: \"QUEUE_DELAY\", scalerValue: 4, flashboot: true, executionTimeoutMs: 1800000 }) { id name templateId } }"
}
GRAPHQL
)")

ENDPOINT_ID=$(echo "$ENDPOINT_RESP" | python3 -c "
import json, sys
d = json.load(sys.stdin)
e = d.get('data',{}).get('saveEndpoint',{})
print(e.get('id',''))
" 2>/dev/null)

if [[ -z "$ENDPOINT_ID" ]]; then
  echo "Endpoint creation failed:"
  echo "$ENDPOINT_RESP" | python3 -m json.tool 2>/dev/null || echo "$ENDPOINT_RESP"
  exit 1
fi

echo "==========================================="
echo " ✅  RunPod endpoint deployed!"
echo " ID:        ${ENDPOINT_ID}"
echo " Run URL:   https://api.runpod.ai/v2/${ENDPOINT_ID}/runsync"
echo " Health:    https://api.runpod.ai/v2/${ENDPOINT_ID}/health"
echo ""
echo " Test:"
echo "   curl -sS https://api.runpod.ai/v2/${ENDPOINT_ID}/runsync \\"
echo "     -H 'Authorization: Bearer ${RUNPOD_API_KEY}' \\"
echo "     -H 'Content-Type: application/json' \\"
echo '     -d '"'"'{"input":{"prompt":"a cat in space"}}'"'"
echo "==========================================="

# Clean up vendored source from build context
rm -rf "${SCRIPT_DIR}/ideogram4"
