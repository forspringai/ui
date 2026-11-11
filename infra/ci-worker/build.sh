#!/usr/bin/env bash
# The ui-ci Workers Build: the verdict on every push, to main and to every branch, so a PR shows
# the check "Workers Builds: ui-ci" (ui D-31).
#
# GitHub Actions cannot run for the forspringai org, so CI lives on Cloudflare Workers Builds, on
# the suite's model (hub docs/suite-infrastructure.md, "CI on Cloudflare"; this file follows
# forspringai/account's). This script is the build command of the `ui-ci` project; its deploy
# command ships an inert stub (infra/ci-worker/wrangler.jsonc). Every product pins this package by
# tag, so a red build here is a red build in every product's next upgrade.
#
# Not here, because the builder has no browser: the design audit (`pnpm run audit`), the audit's own
# test (test/audit.test.ts, which launches Chromium) and the visual tests. They are the local gate
# before a merge and a release (.githooks/pre-push, `pnpm test:browser`).
#
# Limits of the builder: 4 vCPU, 8 GB, a 20 minute cap, no browser.
#
# `-E` (errtrace) is load-bearing: without it the ERR trap does not fire for a command that fails
# inside the `stage` function, which is every command here.
set -Eeuo pipefail

# The last line of the log must say what failed: Cloudflare's own ending names neither the stage nor
# the exit status. scripts/ci-log.ts prints the VERDICT lines; keep their shape.
CURRENT_STAGE="(startup)"
on_err() {
  local rc=$?
  echo "──── VERDICT stage='${CURRENT_STAGE}' exit=${rc} elapsed=${SECONDS}s ────"
  if [ "$rc" -ge 128 ]; then
    echo "──── VERDICT: signal $((rc - 128)) killed the stage (137=SIGKILL/OOM, 143=SIGTERM): the runner ended it, not a failing test ────"
    free -m 2>/dev/null || true
  fi
  exit "$rc"
}
trap on_err ERR

# Output goes through `cat`: node children can set the inherited pipe to O_NONBLOCK, and the next
# `echo` then dies with EAGAIN under log backpressure (canonify build bd7ad165).
stage() {
  local label="$1"
  shift
  local t0=$SECONDS
  CURRENT_STAGE="$label"
  echo "──── ${label} ────"
  "$@" 2>&1 | cat
  echo "──── ${label}: $((SECONDS - t0))s ────"
  CURRENT_STAGE="(after ${label})"
}

echo "ui-ci: commit ${WORKERS_CI_COMMIT_SHA:-$(git rev-parse HEAD 2>/dev/null || echo unknown)} on $(nproc 2>/dev/null || echo '?') cpus"
node --version
pnpm --version

stage "install" pnpm install --frozen-lockfile
stage "typecheck" pnpm typecheck
# test/build.test.ts compares dist/ with a fresh build of the sources, so a commit that forgot
# `pnpm build` fails here. Workers are limited: the builder is shared by the suite.
stage "test" pnpm test:ci --maxWorkers="${CI_TEST_WORKERS:-2}"

echo "──── VERDICT ok elapsed=${SECONDS}s ────"
echo "──── total: ${SECONDS}s ────"
