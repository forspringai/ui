#!/usr/bin/env bash
# min+gzip of each trial entry (bun build --minify --production, browser target)
cd "$(dirname "$0")"
for f in "$@"; do
  out=$(mktemp -d)
  bun build "$f" --minify --production --target browser --format esm --outdir "$out" >/dev/null 2>&1 || { echo "$f build failed"; continue; }
  js=$(ls "$out"/*.js | head -1)
  echo "$f raw=$(wc -c <"$js") gzip=$(gzip -9c "$js" | wc -c)"
  rm -rf "$out"
done
