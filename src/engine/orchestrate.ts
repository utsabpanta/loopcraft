import { bad, clamp, good, info, type Grade, type Note } from './common'

export const LANES = ['main', 'sub1', 'sub2', 'sub3'] as const
export type Lane = (typeof LANES)[number]

export const LANE_LABEL: Record<Lane, string> = {
  main: 'Main agent',
  sub1: 'Subagent α',
  sub2: 'Subagent β',
  sub3: 'Subagent γ',
}

/** Briefing a fresh subagent costs time: it starts with an empty context. */
export const SPIN_UP = 1
export const TARGET = 14
export const OPTIMUM = 12

export interface WorkUnit {
  id: string
  label: string
  duration: number
  files: string[]
  deps: string[]
}

export const ORCH_TASK = 'Migrate four services to the new structured-logging library, then update the docs.'

// Listed in a valid dependency order; the simulator relies on that.
export const UNITS: WorkUnit[] = [
  { id: 'scout', label: 'Survey which services use the old logger', duration: 2, files: [], deps: [] },
  { id: 'config', label: 'Update the shared logger config package', duration: 2, files: ['packages/logger'], deps: ['scout'] },
  { id: 'billing', label: 'Migrate billing service', duration: 3, files: ['services/billing', 'services/gateway/routes.ts'], deps: ['config'] },
  { id: 'auth', label: 'Migrate auth service', duration: 3, files: ['services/auth', 'services/gateway/routes.ts'], deps: ['config'] },
  { id: 'search', label: 'Migrate search service', duration: 3, files: ['services/search'], deps: ['config'] },
  { id: 'notify', label: 'Migrate notify service', duration: 3, files: ['services/notify'], deps: ['config'] },
  { id: 'docs', label: 'Rewrite docs/logging.md', duration: 2, files: ['docs/logging.md'], deps: ['config'] },
  { id: 'integ', label: 'Run the integration suite and fix fallout', duration: 2, files: [], deps: ['billing', 'auth', 'search', 'notify', 'docs'] },
]

export interface Scheduled {
  unit: WorkUnit
  lane: Lane
  start: number
  end: number
  spinUp: boolean
}

export interface Conflict {
  a: string
  b: string
  file: string
}

export interface Schedule {
  items: Scheduled[]
  makespan: number
  conflicts: Conflict[]
  subagentsUsed: number
}

export function simulate(assignment: Record<string, Lane>): Schedule {
  const laneFree: Record<Lane, number> = { main: 0, sub1: 0, sub2: 0, sub3: 0 }
  const laneUsed = new Set<Lane>()
  const end = new Map<string, number>()
  const items: Scheduled[] = []

  for (const unit of UNITS) {
    const lane = assignment[unit.id] ?? 'main'
    const ready = Math.max(0, ...unit.deps.map((d) => end.get(d) ?? 0))
    const spinUp = lane !== 'main' && !laneUsed.has(lane)
    laneUsed.add(lane)
    const start = Math.max(laneFree[lane], ready)
    const finish = start + unit.duration + (spinUp ? SPIN_UP : 0)
    laneFree[lane] = finish
    end.set(unit.id, finish)
    items.push({ unit, lane, start, end: finish, spinUp })
  }

  const conflicts: Conflict[] = []
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const x = items[i]
      const y = items[j]
      if (x.lane === y.lane) continue
      const overlap = x.start < y.end && y.start < x.end
      const file = x.unit.files.find((f) => y.unit.files.includes(f))
      if (overlap && file) conflicts.push({ a: x.unit.id, b: y.unit.id, file })
    }
  }

  return {
    items,
    makespan: Math.max(...items.map((s) => s.end)),
    conflicts,
    subagentsUsed: [...laneUsed].filter((l) => l !== 'main').length,
  }
}

export function gradeSchedule(s: Schedule): Grade {
  const notes: Note[] = []
  const label = (id: string) => UNITS.find((u) => u.id === id)!.label.toLowerCase()

  for (const c of s.conflicts) {
    notes.push(bad(`Merge conflict: "${label(c.a)}" and "${label(c.b)}" both edited ${c.file} at the same time. Two writers on one file need to run one after the other.`))
  }
  if (s.makespan <= OPTIMUM && !s.conflicts.length) notes.push(good(`Finished in ${s.makespan} time units. That's the best possible schedule.`))
  else if (s.makespan <= TARGET) notes.push(good(`Finished in ${s.makespan} time units (target: ${TARGET}).`))
  else notes.push(bad(`Took ${s.makespan} time units (target: ${TARGET}). Independent work is still running one piece at a time.`))

  if (s.subagentsUsed === 0) notes.push(info('No subagents: everything runs serially and every file the main agent reads piles up in its context.'))
  const mainLoad = s.items.filter((i) => i.lane === 'main').reduce((n, i) => n + i.unit.duration, 0)
  if (s.subagentsUsed > 0 && mainLoad <= 10) notes.push(good('Subagents did the heavy lifting in their own context windows and sent back short summaries. The main agent stays focused.'))

  const score = clamp(100 - Math.max(0, s.makespan - OPTIMUM) * 6 - s.conflicts.length * 30)
  return { score, passed: s.makespan <= TARGET && s.conflicts.length === 0, notes }
}
