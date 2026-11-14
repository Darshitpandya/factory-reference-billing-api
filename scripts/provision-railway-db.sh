#!/usr/bin/env bash
# provision-railway-db.sh — add PostgreSQL to Railway billing service and set DATABASE_URL
# Prerequisites:
#   1. railway login   (one-time browser auth)
#   2. Run this script
#
# Usage: ./scripts/provision-railway-db.sh

set -e

echo "🚂 Provisioning PostgreSQL for factory-reference-billing-api on Railway"
echo ""

# Link to the project (finds it by repo)
railway link --yes 2>/dev/null || true

# Check current service
echo "Current Railway service:"
railway status 2>/dev/null || echo "(run railway link first)"

echo ""
echo "Adding PostgreSQL plugin..."
# Add PostgreSQL via Railway CLI
railway add --plugin postgresql 2>&1 || {
  echo ""
  echo "⚠  Automated plugin add failed. Manual steps (< 2 minutes):"
  echo ""
  echo "1. Go to: https://railway.com/project/factory-reference-billing-api"
  echo "2. Click '+ New' → 'Database' → 'Add PostgreSQL'"
  echo "3. Click the PostgreSQL service → 'Connect' tab"
  echo "4. Copy DATABASE_URL"
  echo "5. Go to billing API service → 'Variables'"
  echo "6. Add: DATABASE_URL = <paste from step 4>"
  echo "7. Railway will redeploy automatically"
  echo ""
  exit 0
}

echo ""
echo "✓ PostgreSQL added. Getting DATABASE_URL..."
DB_URL=$(railway variables --json 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('DATABASE_URL','NOT_FOUND'))" 2>/dev/null || echo "NOT_FOUND")

if [ "$DB_URL" != "NOT_FOUND" ]; then
  echo "✓ DATABASE_URL is set"
  echo ""
  echo "Redeploying billing API..."
  railway up --detach 2>&1 | tail -3
  echo ""
  echo "✓ Done. Billing API will be available at:"
  railway status 2>/dev/null | grep "URL:" || echo "  (check railway dashboard)"
else
  echo "DATABASE_URL not found automatically — set it manually in Railway dashboard"
fi
