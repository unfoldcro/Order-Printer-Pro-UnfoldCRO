#!/bin/sh
# start.sh — Validates required environment variables and starts the app.
# Runs inside the Docker container on Render (or any host).

set -e

echo ""
echo "=== Order Docs Printer — startup ==="
echo ""

# ── 1. Validate required environment variables ────────────────
MISSING=""

check_var() {
  local name="$1"
  local value="$2"
  if [ -z "$value" ]; then
    echo "  ✗ $name  → NOT SET"
    MISSING="$MISSING $name"
  else
    # Print first 6 chars only so secrets aren't fully exposed in logs
    PREVIEW=$(echo "$value" | cut -c1-6)
    echo "  ✓ $name  → ${PREVIEW}..."
  fi
}

echo "Checking environment variables:"
check_var "SHOPIFY_API_KEY"    "$SHOPIFY_API_KEY"
check_var "SHOPIFY_API_SECRET" "$SHOPIFY_API_SECRET"
check_var "SHOPIFY_APP_URL"    "$SHOPIFY_APP_URL"
check_var "DATABASE_URL"       "$DATABASE_URL"
echo ""

if [ -n "$MISSING" ]; then
  echo "ERROR: The following required environment variables are not set:"
  echo " $MISSING"
  echo ""
  echo "Set them in Render Dashboard → Your Service → Environment."
  echo "See RENDER_DEPLOY.md for a full copy-paste list."
  echo ""
  exit 1
fi

# ── 2. Apply database schema ──────────────────────────────────
echo "Running prisma db push..."
npx prisma db push --accept-data-loss
echo "Database schema applied."
echo ""

# ── 3. Start the web server ───────────────────────────────────
echo "Starting server on port ${PORT:-3000}..."
exec node server.js
