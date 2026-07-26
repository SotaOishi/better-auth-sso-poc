#!/bin/sh

set -eu

CAROOT="$(mkcert -CAROOT)"
export NODE_EXTRA_CA_CERTS="$CAROOT/rootCA.pem"

concurrently \
  --kill-others \
  --names idp,apps \
  "pnpm dev:idp" \
  "wait-on --timeout 30000 https-get://auth.localtest.me:3000/health && pnpm --parallel --filter @better-auth-sso-poc/app-a --filter @better-auth-sso-poc/app-b run dev"
