import { bad, clamp, good, info, type Grade, type Note } from './common'

export type ToolRisk = 'safe' | 'write' | 'danger'

export interface Tool {
  id: string
  name: string
  description: string
  risk: ToolRisk
  /** Approximate tokens the schema costs on every single model call. */
  schemaTokens: number
}

export const MISSION = 'Checkout returns HTTP 500 in staging. Find the root cause, fix it, and ship the fix to staging.'

export const TOOLBOX: Tool[] = [
  { id: 'read_file', name: 'read_file', description: 'Read a file from the repo', risk: 'safe', schemaTokens: 90 },
  { id: 'grep', name: 'grep', description: 'Search the repo with a regex', risk: 'safe', schemaTokens: 110 },
  // query_logs' description is chosen in panel 2; its tokens are added from DESCRIPTION_OPTIONS.
  { id: 'query_logs', name: 'query_logs', description: 'Search staging application logs', risk: 'safe', schemaTokens: 60 },
  { id: 'http_request', name: 'http_request', description: 'Call a staging HTTP endpoint', risk: 'safe', schemaTokens: 160 },
  { id: 'edit_file', name: 'edit_file', description: 'Apply an exact string replacement to a file', risk: 'write', schemaTokens: 130 },
  { id: 'run_tests', name: 'run_tests', description: 'Run the test suite (optionally filtered)', risk: 'safe', schemaTokens: 100 },
  { id: 'deploy_staging', name: 'deploy_staging', description: 'Deploy the current branch to staging', risk: 'write', schemaTokens: 120 },
  { id: 'deploy_production', name: 'deploy_production', description: 'Deploy the current branch to production', risk: 'danger', schemaTokens: 120 },
  { id: 'run_sql', name: 'run_sql', description: 'Execute SQL against the production database', risk: 'danger', schemaTokens: 150 },
  { id: 'shell', name: 'shell', description: 'Run any shell command, unrestricted', risk: 'danger', schemaTokens: 80 },
  { id: 'web_search', name: 'web_search', description: 'Search the public web', risk: 'safe', schemaTokens: 100 },
  { id: 'send_slack', name: 'send_slack', description: 'Post a message to any Slack channel', risk: 'write', schemaTokens: 140 },
  { id: 'create_ticket', name: 'create_ticket', description: 'Create a Jira ticket', risk: 'write', schemaTokens: 180 },
  { id: 'generate_image', name: 'generate_image', description: 'Generate an image from a prompt', risk: 'safe', schemaTokens: 170 },
]

export interface DescriptionOption {
  text: string
  quality: 'vague' | 'precise' | 'bloated'
  why: string
  tokens: number
}

export const DESCRIPTION_OPTIONS: DescriptionOption[] = [
  {
    text: 'Gets logs.',
    quality: 'vague',
    why: "Too vague. The model can't tell which logs, how to filter them, or what comes back, so it will guess arguments and flood its context.",
    tokens: 5,
  },
  {
    text: 'Search application logs. Args: service (e.g. "checkout"), since ("15m", "2h" or ISO time), level ("error" | "warn" | "info"). Returns at most 50 matching lines, newest first. Use to find stack traces for failing requests.',
    quality: 'precise',
    why: 'Precise. It says what the tool does, what each argument means with examples, what it returns, its limits, and when to use it. Write tool docs the way you would for a new teammate.',
    tokens: 80,
  },
  {
    text: 'This tool wraps our internal LogHub v3 gRPC client (see go/loghub-arch), which shards across 12 Elasticsearch clusters with a tiered retention policy (hot: 3d, warm: 30d, cold: 1y). Queries use the Lucene syntax subset described in RFC-0042, except for the deprecated fields listed in Appendix C, and…',
    quality: 'bloated',
    why: "Bloated. It's all implementation trivia and nothing about how to call it. This text is billed on every model call and still leaves out the arguments.",
    tokens: 420,
  },
]

export function toolboxTokens(selected: Set<string>, descriptionIdx: number | null): number {
  const base = TOOLBOX.filter((t) => selected.has(t.id)).reduce((n, t) => n + t.schemaTokens, 0)
  const desc = selected.has('query_logs') && descriptionIdx !== null ? DESCRIPTION_OPTIONS[descriptionIdx].tokens : 0
  return base + desc
}

export interface ToolRunStep {
  stage: string
  ok: boolean
  text: string
}

export interface ToolRun {
  steps: ToolRunStep[]
  completed: boolean
  shippedToProd: boolean
  grade: Grade
  schemaTokens: number
}

export function runToolMission(selected: Set<string>, descriptionIdx: number | null): ToolRun {
  const has = (id: string) => selected.has(id)
  const steps: ToolRunStep[] = []
  const notes: Note[] = []
  let score = 100
  let shippedToProd = false

  // Each stage only makes sense if the earlier ones succeeded, so messages follow the chain.
  const missing: string[] = []

  // Reproduce (optional, but cheap)
  if (has('http_request')) steps.push({ stage: 'Reproduce', ok: true, text: 'POST /checkout → 500. Bug reproduced.' })
  else if (has('shell')) steps.push({ stage: 'Reproduce', ok: true, text: 'Used `shell` to curl the endpoint. Works, but with a lot more power than needed.' })
  else {
    steps.push({ stage: 'Reproduce', ok: false, text: "Couldn't call the endpoint, so it took the bug report on faith." })
    score -= 5
    notes.push(info('Optional: a way to call the endpoint would let the agent reproduce the bug before changing anything.'))
  }

  // Investigate
  const canSee = has('query_logs') || has('shell')
  if (has('query_logs')) {
    const vague = descriptionIdx === null || DESCRIPTION_OPTIONS[descriptionIdx].quality !== 'precise'
    if (vague) {
      steps.push({ stage: 'Investigate', ok: true, text: 'query_logs() with no filters → 10,000 lines dumped into context. Eventually found the stack trace.' })
      score -= 10
      notes.push(bad('A weak query_logs description made the agent call it with no filters and flood its context.'))
    } else {
      steps.push({
        stage: 'Investigate',
        ok: true,
        text: 'query_logs(service="checkout", since="15m", level="error") → TypeError: cannot read "currency" of undefined at pricing.ts:42',
      })
      notes.push(good('A precise query_logs description led to a focused, cheap call.'))
    }
  } else if (has('shell')) {
    steps.push({ stage: 'Investigate', ok: true, text: 'Grepped raw log files over `shell`. Found the stack trace after several tries.' })
    score -= 5
  } else {
    steps.push({ stage: 'Investigate', ok: false, text: 'No way to see what the server logged, so the real error stayed hidden.' })
    score -= 30
    missing.push('a way to observe the running system, so the agent can see the actual error')
  }

  // Locate
  const canRead = has('grep') || has('read_file') || has('shell')
  if (!canRead) {
    steps.push({ stage: 'Locate', ok: false, text: "Can't search or open the source code." })
    score -= 25
    missing.push('a way to find and read source code')
  } else if (!canSee) {
    steps.push({ stage: 'Locate', ok: false, text: 'Read through the code, but without the error message it had no idea where to look.' })
  } else if (has('grep') || has('read_file')) {
    steps.push({
      stage: 'Locate',
      ok: true,
      text: has('grep') ? 'grep "currency" → pricing.ts:42 reads cart.region.currency' : 'read_file("src/pricing.ts") → line 42 reads cart.region.currency',
    })
  } else {
    steps.push({ stage: 'Locate', ok: true, text: 'cat src/pricing.ts over shell → line 42 reads cart.region.currency' })
  }
  const diagnosed = canSee && canRead

  // Fix
  const canEdit = has('edit_file') || has('shell')
  if (!canEdit) {
    steps.push({
      stage: 'Fix',
      ok: false,
      text: diagnosed ? 'Found the bug, but has no way to change the code.' : 'No way to change the code (and no diagnosis to act on yet).',
    })
    score -= 25
    missing.push('a way to change code')
  } else if (!diagnosed) {
    steps.push({ stage: 'Fix', ok: false, text: 'Could edit files, but without a diagnosis any change would be a guess. Held off.' })
  } else if (has('edit_file')) {
    steps.push({ stage: 'Fix', ok: true, text: 'edit_file: fall back to DEFAULT_CURRENCY when region is missing.' })
  } else {
    steps.push({ stage: 'Fix', ok: true, text: 'sed -i over shell. It works, but nobody can review the edit as a clean diff.' })
  }
  const fixed = diagnosed && canEdit

  // Verify
  if (!has('run_tests')) {
    steps.push({ stage: 'Verify', ok: false, text: fixed ? 'No way to run tests, so the fix is unverified.' : 'No way to run tests.' })
    score -= 15
    missing.push('a way to check that a fix actually works')
  } else if (!fixed) {
    steps.push({ stage: 'Verify', ok: false, text: 'Ran the tests, but there was no fix to verify yet.' })
  } else {
    steps.push({ stage: 'Verify', ok: true, text: 'run_tests("pricing") → 22 passed, including a new regression test.' })
  }

  // Ship
  if (!fixed) {
    steps.push({ stage: 'Ship', ok: false, text: 'Nothing to ship.' })
    if (!has('deploy_staging') && !has('deploy_production') && !has('shell')) missing.push('a way to ship the fix to staging')
  } else if (has('deploy_staging')) {
    steps.push({ stage: 'Ship', ok: true, text: 'deploy_staging() → checkout returns 200. ✅' })
  } else if (has('deploy_production')) {
    steps.push({ stage: 'Ship', ok: false, text: 'No staging deploy available… so the agent called deploy_production(). 😱' })
    shippedToProd = true
    score -= 50
    notes.push(bad("The agent used the most powerful tool that fit the goal. Don't hand it tools you wouldn't want it to use."))
  } else if (has('shell')) {
    steps.push({ stage: 'Ship', ok: true, text: 'Ran the deploy script over shell. Hopefully with the right target…' })
    score -= 5
  } else {
    steps.push({ stage: 'Ship', ok: false, text: 'The fix is ready, but nothing can ship it.' })
    missing.push('a way to ship the fix to staging')
  }
  if (!has('deploy_staging') && !has('deploy_production') && !has('shell')) score -= 15
  const completed = fixed && has('run_tests') && (has('deploy_staging') || has('shell'))

  // Hints name the missing capability, not the tool, so the puzzle stays a puzzle.
  notes.unshift(...missing.map((m) => bad(`Missing: ${m}.`)))

  // Toolbox hygiene
  const count = selected.size
  const dangerous = TOOLBOX.filter((t) => t.risk === 'danger' && has(t.id))
  const irrelevant = ['web_search', 'send_slack', 'create_ticket', 'generate_image'].filter(has)
  const schemaTokens = toolboxTokens(selected, descriptionIdx)

  if (dangerous.length) {
    score -= dangerous.length * 10
    notes.unshift(
      bad(
        `High-risk tools in reach: ${dangerous.map((t) => t.name).join(', ')}. This level fails while you hold any of them. Least privilege: an agent can misuse anything you give it, and a prompt injection can make it try.`,
      ),
    )
  }
  if (irrelevant.length) {
    score -= irrelevant.length * 4
    notes.push(info(`Unneeded tools (${irrelevant.join(', ')}) cost tokens on every call and give the model more ways to wander off.`))
  }
  if (count > 8) {
    score -= 10
    notes.push(bad(`${count} tools is a crowded toolbox. Tool selection accuracy drops as overlapping options pile up.`))
  }
  if (descriptionIdx !== null) {
    const d = DESCRIPTION_OPTIONS[descriptionIdx]
    notes.push(d.quality === 'precise' ? good(d.why) : bad(d.why))
    if (d.quality === 'bloated') score -= 5
  }
  if (completed && !shippedToProd && !dangerous.length) notes.unshift(good('Mission complete with a focused, least-privilege toolbox.'))

  const final = clamp(score)
  return {
    steps,
    completed,
    shippedToProd,
    schemaTokens,
    grade: { score: final, passed: completed && !shippedToProd && !dangerous.length && final >= 70, notes },
  }
}
