import { useState } from 'react'
import { Panel } from '../components/ui'
import { CANDIDATES, PLAN_TASK, gradePlan } from '../engine/plan'
import type { LevelProps } from './types'

const text = (id: string) => CANDIDATES.find((c) => c.id === id)!.text

export function PlanLevel({ onGrade }: LevelProps) {
  const [plan, setPlan] = useState<string[]>([])
  const pool = CANDIDATES.filter((c) => !plan.includes(c.id))

  const move = (i: number, d: -1 | 1) =>
    setPlan((p) => {
      const j = i + d
      if (j < 0 || j >= p.length) return p
      const next = [...p]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })

  return (
    <div className="stack">
      <div className="mission">
        <span className="mission-tag">Task</span> {PLAN_TASK}
      </div>
      <div className="split">
        <Panel title="Candidate steps">
          <p className="muted small">Click a step to add it to the plan. Not every step belongs.</p>
          <ul className="pool">
            {pool.map((c) => (
              <li key={c.id}>
                <button className="choice" onClick={() => setPlan((p) => [...p, c.id])}>
                  + {c.text}
                </button>
              </li>
            ))}
            {pool.length === 0 && <li className="muted small">Pool is empty.</li>}
          </ul>
        </Panel>
        <Panel title="Your plan" actions={plan.length > 0 && <button className="btn ghost" onClick={() => setPlan([])}>Clear</button>}>
          <ol className="plan">
            {plan.map((id, i) => (
              <li key={id} className="plan-step">
                <span className="plan-num">{i + 1}</span>
                <span className="plan-text">{text(id)}</span>
                <span className="plan-ctrls">
                  <button className="icon-btn" aria-label="Move up" onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
                  <button className="icon-btn" aria-label="Move down" onClick={() => move(i, 1)} disabled={i === plan.length - 1}>↓</button>
                  <button className="icon-btn" aria-label="Remove" onClick={() => setPlan((p) => p.filter((x) => x !== id))}>✕</button>
                </span>
              </li>
            ))}
          </ol>
          {plan.length === 0 && <p className="muted small">Empty. A plan written down before coding is a contract the agent (and you) can check progress against.</p>}
          <button className="btn primary block" disabled={plan.length === 0} onClick={() => onGrade(gradePlan(plan))}>
            ✓ Review plan
          </button>
        </Panel>
      </div>
    </div>
  )
}
