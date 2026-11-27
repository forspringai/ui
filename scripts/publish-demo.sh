#!/usr/bin/env bash
# pnpm publish:demo: puts the built demo on https://ui.appspring.app (ui D-62), so a customer or their agent can
# preview a theme file without this repository: https://ui.appspring.app/theme-preview.
#
# Redirects, not rewrites: the pages load their files by relative paths from dist/demo/. The targets have no
# .html, as the assets server serves them (one hop, not two).
# The site is the package's dist/ and fonts/ as `pnpm demo` serves them (the pages load ../tokens.css and
# ../fonts/), an assets-only Worker `ui-demo` on the custom domain ui.appspring.app. Run it after a release
# tag, from the tagged commit, under forspring/prd_deploy:
#
#   doppler run --project forspring --config prd_deploy -- pnpm publish:demo
#
# Peter approved the host on 2026-11-27 (D-64). It deploys with UI_DEMO_DEPLOY_TOKEN (forspring/prd_deploy), a
# user token with only Workers Scripts Write on the account and Workers Routes, DNS Write and Zone Read on
# appspring.app; the suite's deploy token has no rights on appspring.app.
#
# Nothing in it is secret: the repository is public and so is everything in dist/.
set -euo pipefail
cd "$(dirname "$0")/.."
export CLOUDFLARE_API_TOKEN="${UI_DEMO_DEPLOY_TOKEN:?run it under doppler run --project forspring --config prd_deploy}"

version=$(node -p 'require("./package.json").version')
site=$(mktemp -d)
trap 'rm -rf "$site"' EXIT
cp -R dist fonts "$site/"
cat >"$site/_redirects" <<'EOF'
/ /dist/demo/theme-preview 302
/theme-preview /dist/demo/theme-preview 302
/components /dist/demo/ 302
EOF
# The demo frames its own pages (same origin) and loads only its own files, plus a theme's https: or data: logo.
cat >"$site/_headers" <<'EOF'
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Content-Security-Policy: default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'self'; base-uri 'none'; form-action 'self'
EOF
cat >"$site/wrangler.jsonc" <<EOF
{
  "name": "ui-demo",
  "compatibility_date": "2026-10-01",
  "assets": { "directory": ".", "not_found_handling": "404-page" },
  "routes": [{ "pattern": "ui.appspring.app", "custom_domain": true }],
  "workers_dev": false,
  "preview_urls": false
}
EOF
printf 'wrangler.jsonc\n' >"$site/.assetsignore"
(cd "$site" && wrangler deploy --message "ui v${version}")
echo "published ui v${version}: https://ui.appspring.app/theme-preview"
