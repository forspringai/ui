/**
 * Read a Workers Build's verdict: CI on Cloudflare (AGENTS.md, "CI", ui D-31). Copied from forspringai/account.
 *
 *   doppler run --project forspring --config prd_deploy -- node scripts/ci-log.ts [options]
 *
 *   (no options)          the newest ui-ci build: outcome, stage times, failures
 *   --watch               wait for the build of --commit (default: HEAD) to appear and finish.
 *                         Exits 3 if none appears: a push can start no build at all (a
 *                         dropped webhook), and nothing else would notice
 *   --commit <sha>        the build of this commit (prefix ok)
 *   --build <uuid>        a specific build (prefix ok)
 *   --project <worker>    another Workers Build project (default ui-ci)
 *   --tail <n>            also print the last n log lines
 *   --retrigger           with --watch: if no build appears, start one on the main trigger
 *
 * Exit: 0 green, 1 red, 2 usage or API error, 3 no build appeared, 4 still running.
 *
 * The logs endpoint pages (about 1800 lines a page, `truncated` + `cursor`): a
 * one-page read of a long suite looks like a run that simply stopped. This
 * reads to the end.
 */
import { execFileSync } from 'node:child_process'

type Build = {
  build_uuid: string
  status: string
  build_outcome: string | null
  created_on: string
  stopped_on?: string | null
  trigger?: { trigger_uuid: string }
  build_trigger_metadata?: { commit_hash?: string; branch?: string; commit_message?: string }
}

const args = process.argv.slice(2)
const flag = (name: string): boolean => args.includes(name)
const opt = (name: string): string | undefined => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}

const token = process.env.CLOUDFLARE_API_TOKEN
const account = process.env.CLOUDFLARE_ACCOUNT_ID
if (!token || !account) {
  console.error(
    'ci-log: CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are not set. Run it under\n' +
      '  doppler run --project forspring --config prd_deploy -- node scripts/ci-log.ts',
  )
  process.exit(2)
}
const project = opt('--project') ?? 'ui-ci'
const base = `https://api.cloudflare.com/client/v4/accounts/${account}`

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
  const body = (await res.json()) as { success: boolean; errors: unknown; result: T }
  if (!body.success) {
    console.error(`ci-log: ${init?.method ?? 'GET'} ${path} failed: ${JSON.stringify(body.errors)}`)
    process.exit(2)
  }
  return body.result
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const tag = (
  await api<{ default_environment: { script_tag: string } }>(`/workers/services/${project}`)
).default_environment.script_tag
const builds = () => api<Build[]>(`/builds/workers/${tag}/builds?per_page=25`)

const wantBuild = opt('--build')
let wantCommit = opt('--commit')
if (flag('--watch') && !wantCommit && !wantBuild) {
  wantCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
}
const matches = (b: Build) =>
  wantBuild
    ? b.build_uuid.startsWith(wantBuild)
    : wantCommit
      ? (b.build_trigger_metadata?.commit_hash ?? '').startsWith(wantCommit)
      : true

let build = (await builds()).find(matches)

if (!build && flag('--watch')) {
  console.log(`ci-log: waiting for a ${project} build of ${wantCommit?.slice(0, 8)}…`)
  const until = Date.now() + 5 * 60_000
  while (!build && Date.now() < until) {
    await sleep(15_000)
    build = (await builds()).find(matches)
  }
  if (!build && flag('--retrigger') && wantCommit && wantCommit.length === 40) {
    const triggers = await api<{ trigger_uuid: string; branch_includes: string[] }[]>(
      `/builds/workers/${tag}/triggers`,
    )
    const main = triggers.find((t) => t.branch_includes.includes('main'))
    if (main) {
      console.log(`ci-log: no build appeared; starting one on trigger ${main.trigger_uuid}`)
      await api(`/builds/triggers/${main.trigger_uuid}/builds`, {
        method: 'POST',
        body: JSON.stringify({ branch: 'main', commit_hash: wantCommit }),
      })
      const again = Date.now() + 2 * 60_000
      while (!build && Date.now() < again) {
        await sleep(10_000)
        build = (await builds()).find(matches)
      }
    }
  }
}
if (!build) {
  console.error(
    `ci-log: NO ${project} build of ${wantBuild ?? wantCommit ?? 'anything'} found.` +
      (flag('--watch')
        ? ' A push whose paths match the trigger should have started one: rerun with --retrigger.'
        : ''),
  )
  process.exit(3)
}

if (flag('--watch')) {
  const until = Date.now() + 25 * 60_000
  while (build.status !== 'stopped' && Date.now() < until) {
    await sleep(20_000)
    build = await api<Build>(`/builds/builds/${build.build_uuid}`)
  }
}

// Read every page of the log.
const lines: string[] = []
let cursor: string | undefined
for (;;) {
  const page = await api<{ lines: [number, string][]; truncated: boolean; cursor: string }>(
    `/builds/builds/${build.build_uuid}/logs${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`,
  )
  for (const [, line] of page.lines) lines.push(line)
  if (!page.truncated || !page.cursor || page.cursor === cursor) break
  cursor = page.cursor
}

const meta = build.build_trigger_metadata ?? {}
const secs =
  build.stopped_on != null
    ? Math.round((Date.parse(build.stopped_on) - Date.parse(build.created_on)) / 1000)
    : undefined
console.log(
  `${project} build ${build.build_uuid.slice(0, 8)}  commit ${(meta.commit_hash ?? '?').slice(0, 8)} (${meta.branch ?? '?'})  ` +
    `${build.status}/${build.build_outcome ?? 'running'}${secs != null ? `  ${secs}s` : ''}`,
)
console.log(`  ${(meta.commit_message ?? '').split('\n')[0]}`)

// Stage markers and the verdict (infra/ci-worker/build.sh), and vitest's
// failure lines, which name the failing file and test.
const interesting =
  /^──── |VERDICT| FAIL |^ *(×|✗) |Test Files .*failed|Tests .*failed|error TS\d+|^Failed:|Success! Build/
for (const line of lines) if (interesting.test(line)) console.log(`  ${line}`)

const tail = Number(opt('--tail') ?? 0)
if (tail > 0) {
  console.log(`  ── last ${tail} log lines ──`)
  for (const line of lines.slice(-tail)) console.log(`  ${line}`)
}

if (build.status !== 'stopped') process.exit(4)
const green = build.build_outcome === 'success'
// A green build that skipped tests would be the worst kind of green: say so.
if (green && project === 'ui-ci' && !lines.some((l) => l.includes('VERDICT ok'))) {
  console.log('  note: the build is green but its log has no "VERDICT ok" line (log tail missing?)')
}
process.exit(green ? 0 : 1)
