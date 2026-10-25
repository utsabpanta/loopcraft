import { useState } from 'react'
import { Panel } from '../components/ui'
import { GUARD_TASK, REQUESTS, gradeGuard, type Verdict } from '../engine/guard'
import type { LevelProps } from './types'

export function GuardLevel({ onGrade, onReset }: LevelProps) {
  const [decisions, setDecisions] = useState<Record<string, Verdict>>({})
  const idx = Object.keys(decisions).length
  const current = REQUESTS[idx]

  const decide = (v: Verdict) => {
    const next = { ...decisions, [current.id]: v }
    setDecisions(next)
    if (Object.keys(next).length === REQUESTS.length) onGrade(gradeGuard(next))
  }

  return (
    <div className="stack">
      <div className="mission">
        <span className="mission-tag">Agent's task</span> {GUARD_TASK}
      </div>
      <div className="split">
        <Panel title={current ? `Permission request ${idx + 1} of ${REQUESTS.length}` : 'All requests reviewed'}>
          {current ? (
            <div className="perm" key={current.id}>
              <div className="perm-head">
                <code className="perm-tool">{current.tool}</code>
                <span className="muted small">wants to run</span>
              </div>
              <pre className="code">{current.command}</pre>
              <p className="perm-reason">“{current.reason}”</p>
              <div className="row">
                <button className="btn allow" onClick={() => decide('allow')}>
                  Allow
                </button>
                <button className="btn deny" onClick={() => decide('deny')}>
                  Deny
                </button>
              </div>
            </div>
          ) : (
            <button
              className="btn ghost"
              onClick={() => {
                onReset()
                setDecisions({})
              }}
            >
              Review again
            </button>
          )}
        </Panel>
        <div id="level-output">
          <Panel title={current ? 'Decision log' : 'Decision log · green = good call, red = wrong call'}>
            <ol className="decisions">
              {REQUESTS.slice(0, idx).map((r) => {
                const d = decisions[r.id]
                const right = d === r.expected || !!r.either
                return (
                  <li key={r.id} className={current ? '' : right ? 'is-ok' : 'is-fail'}>
                    <span className={`pill pill-${d}`}>{d}</span>
                    <code>{r.command}</code>
                    {!current && <span className="small muted">{r.why}</span>}
                  </li>
                )
              })}
            </ol>
            {idx === 0 && <p className="muted small">Your decisions show up here. Explanations appear once you've reviewed them all.</p>}
          </Panel>
        </div>
      </div>
    </div>
  )
}
