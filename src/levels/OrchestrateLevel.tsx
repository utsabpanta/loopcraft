import { useMemo, useState } from 'react'
import { Panel } from '../components/ui'
import { LANES, LANE_LABEL, ORCH_TASK, TARGET, UNITS, gradeSchedule, simulate, type Lane } from '../engine/orchestrate'
import type { LevelProps } from './types'

const initial = Object.fromEntries(UNITS.map((u) => [u.id, 'main' as Lane]))

export function OrchestrateLevel({ onGrade }: LevelProps) {
  const [assignment, setAssignment] = useState<Record<string, Lane>>(initial)
  const schedule = useMemo(() => simulate(assignment), [assignment])
  const conflicted = new Set(schedule.conflicts.flatMap((c) => [c.a, c.b]))
  const span = Math.max(schedule.makespan, TARGET + 2)

  return (
    <div className="stack">
      <div className="mission">
        <span className="mission-tag">Task</span> {ORCH_TASK}
      </div>
      <Panel title="Assign work to agents">
        <div className="assign">
          {UNITS.map((u) => (
            <div key={u.id} className="assign-row">
              <span className="assign-label">
                {u.label}
                <span className="muted small">
                  {' '}· {u.duration}t{u.deps.length ? ` · after ${u.deps.length > 2 ? 'everything' : u.deps.join(', ')}` : ''}
                  {u.files.length ? ` · edits ${u.files.join(', ')}` : ''}
                </span>
              </span>
              <span className="lane-picker" role="radiogroup" aria-label={`Lane for ${u.label}`}>
                {LANES.map((l) => (
                  <button
                    key={l}
                    role="radio"
                    aria-checked={assignment[u.id] === l}
                    className={`lane-btn lane-${l} ${assignment[u.id] === l ? 'is-on' : ''}`}
                    onClick={() => setAssignment((a) => ({ ...a, [u.id]: l }))}
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
      <Panel title={`Timeline · ${schedule.makespan} time units (target ≤ ${TARGET})`}>
        <div className="gantt" style={{ ['--span' as string]: span }}>
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
                      title={`${s.unit.label}: t${s.start}–t${s.end}${s.spinUp ? ' (incl. 1t briefing)' : ''}`}
                    >
                      {s.spinUp && <span className="gantt-spin" style={{ width: `${(1 / (s.end - s.start)) * 100}%` }} />}
                      <span className="gantt-text">{s.unit.id}</span>
                    </div>
                  ))}
              </div>
            </div>
          ))}
          <div className="gantt-row">
            <span />
            <div className="gantt-axis">
              <span className="gantt-target" style={{ left: `${(TARGET / span) * 100}%` }}>target</span>
            </div>
          </div>
        </div>
        <p className="muted small">Hatched segment = briefing a fresh subagent (1t). Red = two agents editing the same file at once.</p>
        <button className="btn primary" onClick={() => onGrade(gradeSchedule(schedule))}>
          ▶ Run the team
        </button>
      </Panel>
    </div>
  )
}
