import { bad, clamp, good, info, type Grade, type Note } from './common'

export type StepKind = 'core' | 'verify' | 'optional' | 'creep'

export interface PlanStep {
  id: string
  text: string
  kind: StepKind
  deps: string[]
}

export const PLAN_TASK = 'Add an "Export to CSV" button to the Reports page.'

// Deliberately not in dependency order: ordering the plan is part of the puzzle.
export const CANDIDATES: PlanStep[] = [
  { id: 'button', text: 'Add the Export button, wired to toCsv and a file download', kind: 'core', deps: ['util', 'explore'] },
  { id: 'pdf', text: "Also add PDF and Excel export while we're here", kind: 'creep', deps: [] },
  { id: 'pr', text: 'Summarize the change and open a PR', kind: 'core', deps: ['button', 'util_test', 'e2e'] },
  { id: 'util_test', text: 'Unit-test toCsv on tricky values', kind: 'verify', deps: ['util'] },
  { id: 'explore', text: 'Read the Reports page and find how its data is loaded', kind: 'core', deps: [] },
  { id: 'redesign', text: 'Migrate the Reports page to the new design system', kind: 'creep', deps: [] },
  { id: 'e2e', text: 'Run the app, click Export, open the file', kind: 'verify', deps: ['button'] },
  { id: 'util', text: 'Write a toCsv(rows) helper that escapes commas, quotes and newlines', kind: 'core', deps: ['explore'] },
  { id: 'conventions', text: 'Check AGENTS.md for testing conventions', kind: 'optional', deps: [] },
]

const byId = new Map(CANDIDATES.map((s) => [s.id, s]))

export function gradePlan(plan: string[]): Grade {
  const notes: Note[] = []
  let score = 100
  const position = new Map(plan.map((id, i) => [id, i]))

  for (const step of CANDIDATES) {
    const included = position.has(step.id)
    if (step.kind === 'core' && !included) {
      score -= 25
      notes.push(bad(`Missing a core step: "${step.text}".`))
    }
    if (step.kind === 'creep' && included) {
      score -= 15
      notes.push(bad(`Scope creep: "${step.text}". Bigger diffs are harder to review and easier to break.`))
    }
  }

  const verifies = plan.filter((id) => byId.get(id)?.kind === 'verify')
  if (verifies.length === 0) {
    score -= 30
    notes.push(bad('The plan never checks its own work. Without a verify step, "done" just means "stopped typing".'))
  } else if (verifies.length === 2) {
    notes.push(good('Two independent checks: unit tests for the logic, a real click-through for the UI.'))
  } else {
    notes.push(good('The plan includes a verification step.'))
  }

  for (const id of plan) {
    const step = byId.get(id)
    if (!step) continue
    for (const dep of step.deps) {
      const depPos = position.get(dep)
      if (depPos !== undefined && depPos > position.get(id)!) {
        score -= 15
        notes.push(bad(`Order: "${step.text}" comes before "${byId.get(dep)!.text}", which it depends on.`))
      }
    }
  }

  const firstEdit = Math.min(...['util', 'button'].map((id) => position.get(id) ?? Infinity))
  if (position.has('conventions') && position.get('conventions')! < firstEdit)
    notes.push(good("Reading AGENTS.md first is cheap, and it stops you from fighting the codebase's conventions."))
  if (plan[0] === 'explore' || plan[0] === 'conventions') notes.push(good('The plan starts by exploring before it edits anything.'))
  if (plan.length === 0) notes.push(info('Add steps from the pool to build a plan.'))

  const missingCore = CANDIDATES.some((c) => c.kind === 'core' && !position.has(c.id))
  const final = clamp(score)
  return { score: final, passed: final >= 75 && !missingCore, notes }
}
