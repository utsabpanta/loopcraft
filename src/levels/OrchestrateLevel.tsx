import { useMemo, useState } from 'react'
import { Panel } from '../components/ui'
import { LANES, LANE_LABEL, MERGE_COST, ORCH_TASK, SPIN_UP, TARGET, UNITS, gradeSchedule, simulate, type Lane } from '../engine/orchestrate'
import type { LevelProps } from './types'

const initial = Object.fromEntries(UNITS.map((u) => [u.id, 'main' as Lane]))
const short = (id: string) => UNITS.find((u) => u.id === id)!.short

export function OrchestrateLevel({ onGrade, onReset }: LevelProps) {
  const [assignment, setAssignment] = useState<Record<string, Lane>>(initial)
  const schedule = useMemo(() => simulate(assignment), [assignment])
  const conflicted = new Set(schedule.conflicts.flatMap((c) => [c.a, c.b]))
  const span = Math.max(schedule.makespan, TARGET + 2)
  const rawEnd = Math.max(...schedule.items.map((s) => s.end))

  return (
    <div className="stack">
      <div className="mission">
        <span className="mission-tag">Task</span> {ORCH_TASK}
      </div>
      <Panel title="Assign work to agents">
        <p className="muted small">
          Everything starts on the main agent. Move tasks to subagents (α, β, γ) to run them in parallel. Each task handed to a subagent costs {SPIN_UP}t of
          briefing. The timeline below updates as you go.
        </p>
        <div className="assign">
          {UNITS.map((u) => (
            <div key={u.id} className="assign-row">
              <span className="assign-label">
                {u.label}
                <span className="muted small">
                  {' '}
                  · {u.duration}t{u.deps.length ? ` · after ${u.deps.length > 2 ? 'all migrations + docs' : u.deps.map(short).join(', ')}` : ''}
                  {u.files.length ? ` · edits ${u.files.join(', ')}` : ''}
                </span>
              </span>
              <span className="lane-picker" role="radiogroup" aria-label={`Who runs: ${u.label}`}>
                {LANES.map((l) => (
                  <button
                    key={l}
                    role="radio"
                    aria-checked={assignment[u.id] === l}
                    aria-label={LANE_LABEL[l]}
                    className={`lane-btn lane-${l} ${assignment[u.id] === l ? 'is-on' : ''}`}
                    onClick={() => {
                      onReset()
                      setAssignment((a) => ({ ...a, [u.id]: l }))
                    }}
                    title={LANE_LABEL[l]}
                  >
                    {l === 'main' ? 'main' : LANE_LABEL[l].split(' ')[1]}
                  </button>
                ))}
              </span>
            </div>
          ))}
        </div>
      </Panel>
      <Panel
        title={`Timeline · ${schedule.makespan} time units (target ≤ ${TARGET})${schedule.conflicts.length ? ` · includes +${schedule.conflicts.length * MERGE_COST}t of merge cleanup` : ''}`}
      >
        <div className="gantt" style={{ ['--span' as string]: span, ['--target' as string]: TARGET / span }}>
          {LANES.map((lane) => (
            <div key={lane} className="gantt-row">
              <span className="gantt-lane">{LANE_LABEL[lane]}</span>
              <div className="gantt-track">
                {schedule.items
                  .filter((s) => s.lane === lane)
                  .map((s) => (
                    <div
                      key={s.unit.id}
                      className={`gantt-bar lane-${lane} ${conflicted.has(s.unit.id) ? 'is-conflict' : ''}`}
                      style={{ left: `${(s.start / span) * 100}%`, width: `${((s.end - s.start) / span) * 100}%` }}
                      title={`${s.unit.label}: t${s.start}–t${s.end}${s.spinUp ? ` (incl. ${SPIN_UP}t briefing)` : ''}`}
                    >
                      {s.spinUp && <span className="gantt-spin" style={{ width: `${(SPIN_UP / (s.end - s.start)) * 100}%` }} />}
                      <span className="gantt-text">{s.unit.short}</span>
                    </div>
                  ))}
                {lane === 'main' && schedule.conflicts.length > 0 && (
                  <div
                    className="gantt-bar is-merge"
                    style={{ left: `${(rawEnd / span) * 100}%`, width: `${((schedule.makespan - rawEnd) / span) * 100}%` }}
                    title="Untangling merge conflicts"
                  >
                    <span className="gantt-text">merge fix</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          <span className="gantt-target" aria-hidden>
            target
          </span>
        </div>
        <p className="muted small">Hatched segment = briefing a subagent ({SPIN_UP}t). Red = two agents editing the same file at once.</p>
        <button className="btn primary" onClick={() => onGrade(gradeSchedule(schedule))}>
          ▶ Run the team
        </button>
      </Panel>
    </div>
  )
}
