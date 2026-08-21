#!/usr/bin/env bash
#
# check-favorites-boot.sh — provider-nesting regression guard for the
# bug-favorites-400 cycle. Mirrors the verify-phase merge gate from
# design §5.3 (spec scenario 6).
#
# Per the spec scenario:
#   - GET / → HTTP 200 (the page must render)
#   - The rendered body MUST NOT contain the runtime error
#     "useFavorites must be used within a FavoritesProvider" thrown
#     at src/features/favorites/context/FavoritesContext.tsx:90.
#
# This guards against provider-nesting regressions that strict-TDD
# mocks cannot catch (playbook #1645-2, cart-cycle precedent).
#
# Usage (from the project root):
#   1. Terminal A: cd ../e-commerce-relojes-bv-beni-api && npm run develop
#   2. Terminal B: npm run dev
#   3. Terminal C: bash scripts/check-favorites-boot.sh
#
# Exit code 0 = boot check passes (HTTP 200, no runtime error).
# Exit code non-zero = provider-nesting regression — do NOT merge.

set -euo pipefail

PORT="${PORT:-3000}"
URL="http://localhost:${PORT}/"

echo "[check-favorites-boot] GET ${URL}"

status=$(curl -s -m 15 -o /tmp/check-favorites-boot-body -w "%{http_code}" "${URL}" || echo "000")
echo "[check-favorites-boot] HTTP ${status}"

if [ "${status}" != "200" ]; then
  echo "[check-favorites-boot] FAIL — expected HTTP 200, got HTTP ${status}" >&2
  exit 1
fi

if grep -qi "useFavorites must be used" /tmp/check-favorites-boot-body; then
  echo "[check-favorites-boot] FAIL — runtime provider-nesting error detected in page body" >&2
  echo "[check-favorites-boot] This usually means a <FavoritesProvider> is missing or its parent" >&2
  echo "[check-favorites-boot> chain broke. Check src/app/layout.tsx:" >&2
  echo "[check-favorites-boot]   AuthProviderWrapper > CartProvider > FavoritesProvider" >&2
  exit 1
fi

echo "[check-favorites-boot] PASS — provider nesting intact, no runtime error"
exit 0
