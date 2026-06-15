#!/usr/bin/env bash
# Package the extension into a Chrome Web Store-ready zip.
# Usage: ./scripts/package.sh   (from chrome-extension/ or repo root)
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

VERSION=$(node -p "JSON.parse(require('fs').readFileSync('manifest.json','utf8')).version")
OUT="trayarunya-copilot-v${VERSION}.zip"

node scripts/make-icons.mjs

rm -f "$OUT"
zip -r "$OUT" \
  manifest.json \
  background.js \
  popup.html popup.css popup.js \
  content icons \
  -x "*.DS_Store"

echo ""
echo "✓ Packaged: $DIR/$OUT"
echo "  Upload at https://chrome.google.com/webstore/devconsole"
