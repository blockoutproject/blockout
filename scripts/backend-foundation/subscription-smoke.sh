#!/usr/bin/env bash

# Verifies API receipt -> durable job -> real worker -> PostgreSQL against an isolated provider fixture.
# Uses only the fixed disposable foundation project; never calls live RevenueCat or Auth0.
set -euo pipefail
cd "$(dirname "$0")/../.."
export BLOCKOUT_REVENUECAT_BASE_URL=http://subscription-fixture:8080
export BLOCKOUT_REVENUECAT_SECRET_KEY=smoke-only
export BLOCKOUT_REVENUECAT_ENTITLEMENT_ID=smoke-pro
export BLOCKOUT_REVENUECAT_WEBHOOK_SIGNING_SECRET=smoke-only
export BLOCKOUT_IDENTITY_BILLING_PROJECT_ID=smoke-project
export BLOCKOUT_IDENTITY_BILLING_ENVIRONMENT=sandbox
compose=(docker compose --project-name blockout-foundation --file infra/compose/docker-compose.backend.yml --profile subscription-smoke)
"${compose[@]}" up -d --wait --wait-timeout 180
python3 scripts/backend-foundation/subscription-smoke.py
