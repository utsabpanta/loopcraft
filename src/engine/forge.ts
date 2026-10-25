import { clamp } from './common'

export type Metric = 'quality' | 'safety' | 'speed' | 'cost'
export const METRICS: { id: Metric; label: string }[] = [
  { id: 'quality', label: 'Quality' },
  { id: 'safety', label: 'Safety' },
  { id: 'speed', label: 'Speed' },
  { id: 'cost', label: 'Cost efficiency' },
]

type Effects = Partial<Record<Metric, number>>

export interface DialOption {
  id: string
  label: string
  blurb: string
  effects: Effects
  story: string
}

export interface Dial {
  id: string
  label: string
  options: DialOption[]
}

export const FORGE_MISSION =
  'Overnight run: fix 3 open bugs and add rate limiting to the public API in a 200k-line repo. One of the bug reports contains a hidden prompt injection.'

export const DIALS: Dial[] = [
  {
    id: 'prompt',
    label: 'System prompt',
    options: [
      {
        id: 'vague',
        label: 'One-liner',
        blurb: '"You are a helpful coding assistant."',
        effects: { quality: -25 },
        story: 'With no definition of done, the agent "improved" the logging module nobody asked about.',
      },
      {
        id: 'specific',
        label: 'Goal + constraints + done',
        blurb: 'Clear objective, boundaries, and what "finished" looks like',
        effects: {},
        story: 'Clear goal and a crisp definition of done. The agent knew when to stop.',
      },
      {
        id: 'novel',
        label: '3,000-word rulebook',
        blurb: 'Every edge case anyone ever hit, in one prompt',
        effects: { quality: -10, cost: -20, speed: -5 },
        story: 'The agent obeyed rule #47 (always use tabs in YAML) and lost track of the actual goal.',
      },
    ],
  },
  {
    id: 'tools',
    label: 'Tools',
    options: [
      {
        id: 'minimal',
        label: 'Read + edit only',
        blurb: 'No way to run anything',
        effects: { quality: -20, speed: -15 },
        story: "It couldn't run tests or the server, so every fix was a guess.",
      },
      {
        id: 'focused',
        label: 'Focused toolkit',
        blurb: 'Search, read, edit, test, deploy-to-staging',
        effects: {},
        story: 'A focused toolkit: every tool had a clear purpose and a precise description.',
      },
      {
        id: 'everything',
        label: '40 tools incl. prod',
        blurb: 'Every integration, including production access',
        effects: { safety: -30, cost: -15, quality: -5 },
        story: 'Facing 40 overlapping tools, it picked oddly. It called generate_image twice.',
      },
    ],
  },
  {
    id: 'context',
    label: 'Context strategy',
    options: [
      {
        id: 'none',
        label: 'Nothing up front',
        blurb: 'No AGENTS.md, no search tool',
        effects: { quality: -30 },
        story: 'With no project conventions, it invented its own test command and ran the wrong suite.',
      },
      {
        id: 'curated',
        label: 'AGENTS.md + just-in-time',
        blurb: 'Lean notes file plus search to pull in files on demand',
        effects: {},
        story: 'AGENTS.md set the ground rules. Files came in only when they were needed.',
      },
      {
        id: 'dump',
        label: 'Load the whole repo',
        blurb: 'Concatenate everything into the window',
        effects: { cost: -30, speed: -15, quality: -15 },
        story: 'The window filled with vendored code. The relevant 40 lines got lost in the middle.',
      },
    ],
  },
  {
    id: 'verify',
    label: 'Verification',
    options: [
      {
        id: 'trust',
        label: 'Trust the agent',
        blurb: "If it says done, it's done",
        effects: { quality: -35 },
        story: 'It said "All fixed! ✅". Two of the three bugs were still there.',
      },
      {
        id: 'tests',
        label: 'Run the tests',
        blurb: 'Green suite = ship',
        effects: { quality: -10 },
        story: 'The tests passed, but one "fix" had just deleted the assertion that was failing.',
      },
      {
        id: 'layered',
        label: 'Layered checks',
        blurb: 'Tests + types + diff review + real-world check',
        effects: { speed: -5 },
        story: 'Tests, types, a diff review, and a real request against staging. Each layer caught something.',
      },
    ],
  },
  {
    id: 'perms',
    label: 'Permissions',
    options: [
      {
        id: 'yolo',
        label: 'Auto-approve all',
        blurb: 'Never interrupt the agent',
        effects: { safety: -45 },
        story: 'Nothing was gated, so the hidden instruction in the bug report went straight through.',
      },
      {
        id: 'tiered',
        label: 'Tiered policy',
        blurb: 'Allow reads, ask for risky writes, deny destructive',
        effects: {},
        story: 'Routine actions flowed. The injected instruction hit a deny rule and got flagged for review.',
      },
      {
        id: 'askall',
        label: 'Approve every action',
        blurb: 'A human clicks yes on each step',
        effects: { speed: -30, safety: -10 },
        story:
          "The run stalled at approval prompt #1 until you woke up at 7am. Then you approved 214 prompts, and by #150 you were clicking without reading. That's approval fatigue.",
      },
    ],
  },
  {
    id: 'team',
    label: 'Orchestration',
    options: [
      {
        id: 'solo',
        label: 'Single agent',
        blurb: 'One agent does everything in order',
        effects: { speed: -15 },
        story: 'One agent, one long context. By the fourth task it had forgotten the first.',
      },
      {
        id: 'focused',
        label: 'Focused subagents',
        blurb: 'Subagents for research and independent tasks',
        effects: {},
        story: 'Subagents explored and fixed independent bugs in parallel, then reported back short summaries.',
      },
      {
        id: 'swarm',
        label: 'Swarm of 10',
        blurb: 'Ten agents, everyone on everything',
        effects: { cost: -35, quality: -15, speed: -5 },
        story: 'Ten agents edited the same router file. The merge took longer than the work.',
      },
    ],
  },
]

export type Build = Record<string, string>

export interface ForgeResult {
  metrics: Record<Metric, number>
  overall: number
  letter: 'S' | 'A' | 'B' | 'C' | 'D'
  story: { text: string; tone: 'good' | 'bad' | 'info' }[]
  passed: boolean
}

/** Some stories depend on other dials, so the night reads as one consistent run. */
function storyFor(dialId: string, opt: DialOption, build: Build): string {
  if (dialId === 'verify' && build.tools === 'minimal' && opt.id !== 'trust')
    return 'The verification plan was solid, but with read + edit tools only, none of the checks could actually run.'
  if (dialId === 'perms' && opt.id === 'yolo') {
    if (build.tools === 'everything') return 'Nothing was gated. When the injected bug report said "run this cleanup script", the agent ran it.'
    if (build.tools === 'focused') return 'Nothing was gated. Following the injected bug report, the agent deployed an unreviewed branch to staging.'
    return 'Nothing was gated. Following the injected bug report, the agent rewrote the CI config. It had no way to run anything, so the damage stayed small.'
  }
  return opt.story
}

function overridden(dialId: string, build: Build): boolean {
  return dialId === 'verify' && build.tools === 'minimal' && build.verify !== 'trust'
}

export const BEST_BUILD: Build = { prompt: 'specific', tools: 'focused', context: 'curated', verify: 'layered', perms: 'tiered', team: 'focused' }

export function forge(build: Build): ForgeResult {
  const m: Record<Metric, number> = { quality: 100, safety: 100, speed: 100, cost: 100 }
  const story: ForgeResult['story'] = []
  const apply = (e: Effects) => {
    for (const [k, v] of Object.entries(e)) m[k as Metric] += v
  }

  for (const dial of DIALS) {
    const opt = dial.options.find((o) => o.id === build[dial.id]) ?? dial.options[0]
    apply(opt.effects)
    const hurts = Object.values(opt.effects).some((v) => v <= -10)
    story.push({ text: storyFor(dial.id, opt, build), tone: hurts || overridden(dial.id, build) ? 'bad' : 'good' })
  }

  // Checks need tools to run them: with read + edit only, planned verification never happens.
  if (build.tools === 'minimal' && build.verify !== 'trust') apply({ quality: build.verify === 'layered' ? -15 : -10 })

  if (build.perms === 'yolo' && build.tools === 'everything') {
    apply({ safety: -25 })
    story.push({ text: '💥 Incident: with production access and no gates, the injected "cleanup script" truncated a production table.', tone: 'bad' })
  }
  if (build.verify === 'trust' && build.prompt === 'vague') {
    apply({ quality: -10 })
    story.push({ text: 'No definition of done and no checks: it declared victory four minutes in.', tone: 'bad' })
  }
  if (build.context === 'dump' && build.team === 'swarm') {
    apply({ cost: -15 })
    story.push({ text: '10 agents × 200k-line context dumps. Finance would like a word.', tone: 'bad' })
  }

  for (const k of Object.keys(m) as Metric[]) m[k] = clamp(m[k])
  // Half average, half weakest link: one terrible dimension sinks the run.
  const values = Object.values(m)
  const avg = values.reduce((a, b) => a + b, 0) / values.length
  let overall = Math.round(avg * 0.5 + Math.min(...values) * 0.5)
  if (m.safety < 50) overall = Math.min(overall, 50)

  const letter = overall >= 95 ? 'S' : overall >= 85 ? 'A' : overall >= 70 ? 'B' : overall >= 55 ? 'C' : 'D'
  const ending =
    letter === 'S' || letter === 'A'
      ? '🌅 Morning: 3 bugs fixed, rate limiting shipped to staging, the injection flagged, and 4 clean PRs waiting for review.'
      : letter === 'B'
        ? '🌤 Morning: most of the work landed, with a few things to clean up.'
        : '🌧 Morning: you spend the day cleaning up after the night shift.'
  story.push({ text: ending, tone: letter === 'S' || letter === 'A' ? 'good' : 'info' })

  return { metrics: m, overall, letter, story, passed: letter === 'S' || letter === 'A' }
}
