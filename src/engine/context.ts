import { bad, clamp, good, info, type Grade, type Note } from './common'

export type Relevance = 'required' | 'critical' | 'high' | 'helpful' | 'noise' | 'misleading'

export interface ContextItem {
  id: string
  label: string
  detail: string
  tokens: number
  relevance: Relevance
  /** Runtime evidence (like logs) isn't in the repo, so a file-search tool can't fetch it later. */
  notInRepo?: boolean
}

export const BUDGET = 10_000

export const TASK = 'Bug: the refund webhook sometimes refunds a customer twice. Find and fix it.'

export const ITEMS: ContextItem[] = [
  { id: 'system', label: 'System prompt', detail: 'Role, goals, and definition of done', tokens: 600, relevance: 'required' },
  { id: 'task', label: 'The task', detail: TASK, tokens: 150, relevance: 'required' },
  {
    id: 'trace',
    label: 'Error log + stack trace',
    detail: 'Two refund events processed 40ms apart for the same charge',
    tokens: 900,
    relevance: 'critical',
    notInRepo: true,
  },
  { id: 'refund', label: 'src/webhooks/refund.ts', detail: 'The handler under suspicion (rewritten in 2023)', tokens: 2_400, relevance: 'critical' },
  { id: 'test', label: 'src/webhooks/refund.test.ts', detail: 'Existing tests for the handler', tokens: 1_200, relevance: 'high' },
  { id: 'agents', label: 'AGENTS.md', detail: 'Project conventions, how to run tests, gotchas', tokens: 500, relevance: 'high' },
  { id: 'idem', label: 'Payment provider docs: idempotency keys', detail: 'Short excerpt on webhook retries and dedupe', tokens: 1_100, relevance: 'helpful' },
  { id: 'summary', label: 'Summary of earlier session', detail: 'A 300-token recap: "we suspect retries"', tokens: 300, relevance: 'helpful' },
  {
    id: 'design',
    label: 'refunds-design-2021.md',
    detail: 'Original design doc for the refunds system (last edited 2021)',
    tokens: 1_800,
    relevance: 'misleading',
  },
  { id: 'chat', label: 'Full raw chat history', detail: '40 earlier turns, mostly about an unrelated CSS bug', tokens: 4_800, relevance: 'noise' },
  { id: 'changelog', label: 'CHANGELOG.md', detail: '3 years of release notes', tokens: 1_500, relevance: 'noise' },
  { id: 'repo', label: 'Entire src/ directory', detail: 'Every file, concatenated', tokens: 38_000, relevance: 'noise' },
]

export interface ContextResult {
  used: number
  overflow: boolean
  noiseRatio: number
  grade: Grade
}

export function evaluateContext(selected: Set<string>, justInTime: boolean): ContextResult {
  const picked = ITEMS.filter((i) => i.relevance === 'required' || selected.has(i.id))
  const used = picked.reduce((n, i) => n + i.tokens, 0)
  const overflow = used > BUDGET
  const noiseTokens = picked.filter((i) => i.relevance === 'noise').reduce((n, i) => n + i.tokens, 0)
  const noiseRatio = used ? noiseTokens / used : 0
  const notes: Note[] = []
  let score = 100

  if (overflow) {
    notes.push(
      bad(
        `${used.toLocaleString()} tokens is over the ${BUDGET.toLocaleString()} budget. The window got truncated, and what survived in the middle got lost in the noise.`,
      ),
    )
    return { used, overflow, noiseRatio, grade: { score: 20, passed: false, notes } }
  }

  for (const item of ITEMS) {
    const inside = picked.includes(item)
    if (item.relevance === 'critical' && !inside) {
      if (justInTime && item.notInRepo) {
        score -= 35
        notes.push(
          bad(
            `Missing "${item.label}". A file-search tool can't help here: production logs aren't in the repo. Runtime evidence has to be handed to the agent.`,
          ),
        )
      } else if (justInTime) {
        score -= 10
        notes.push(info(`Missing "${item.label}", but the agent fetched it just-in-time with a search tool. It cost a few extra turns.`))
      } else {
        score -= 35
        notes.push(bad(`Missing "${item.label}". Without it, the agent is debugging blind.`))
      }
    }
    if (item.relevance === 'high' && !inside) {
      score -= justInTime ? 4 : 12
      notes.push(info(`Missing "${item.label}"${justInTime ? ' (the agent found it on its own, a bit slower)' : ''}.`))
    }
    if (item.relevance === 'misleading' && inside) {
      score -= 30
      notes.push(
        bad(`"${item.label}" sent the agent hunting for a queue that no longer exists. Stale context is worse than none, and it led to the wrong fix.`),
      )
    }
  }

  if (noiseRatio > 0) {
    const penalty = Math.round(noiseRatio * 45)
    score -= penalty
    notes.push(bad(`${Math.round(noiseRatio * 100)}% of the window is noise. Every irrelevant token competes with the signal for the model's attention.`))
  }

  if (justInTime) notes.push(good('Just-in-time retrieval: the agent keeps a lean window and pulls in files only when it needs them.'))
  if (selected.has('summary') && !selected.has('chat')) notes.push(good('Compaction: a 300-token summary instead of 4,800 tokens of raw history.'))
  if (score >= 85)
    notes.unshift(good(`Found the bug: two webhook retries raced past a missing idempotency check. Context used: ${used.toLocaleString()} tokens.`))

  const misled = picked.some((i) => i.relevance === 'misleading')
  if (misled) notes.push(info('Clue for next time: check the date. The refund code was rewritten in 2023, two years after that design doc.'))
  const final = clamp(score)
  return { used, overflow, noiseRatio, grade: { score: final, passed: final >= 70 && !misled, notes } }
}
