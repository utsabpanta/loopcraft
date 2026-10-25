import { useState } from 'react'
import { Panel } from '../components/ui'
import { CHECKS, CHECK_BUDGET, CLAIM, gradeVerification } from '../engine/verify'
import type { LevelProps } from './types'

export function VerifyLevel({ onGrade, onReset }: LevelProps) {
  const [used, setUsed] = useState<string[]>([])
  const left = CHECK_BUDGET - used.length

  const runCheck = (id: string) => {
    if (left <= 0 || used.includes(id)) return
    const next = [...used, id]
    setUsed(next)
    if (next.length === CHECK_BUDGET) onGrade(gradeVerification(next))
  }

  return (
    <div className="stack">
      <div className="claim">
        <span className="claim-avatar" aria-hidden>
          🤖
        </span>
        <p>{CLAIM}</p>
      </div>
      <div className="split">
        <Panel
          title={`Pick your checks · ${left} left`}
          actions={
            used.length > 0 && (
              <button
                className="btn ghost"
                onClick={() => {
                  onReset()
                  setUsed([])
                }}
              >
                Reset
              </button>
            )
          }
        >
          <p className="muted small">Three hidden problems are in this change. You have time for {CHECK_BUDGET} checks. Choose wisely.</p>
          <div className="choices">
            {CHECKS.map((c) => (
              <button
                key={c.id}
                className={`choice ${used.includes(c.id) ? 'is-on' : ''}`}
                disabled={left <= 0 && !used.includes(c.id)}
                onClick={() => runCheck(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </Panel>
        <div id="level-output">
          <Panel title="Evidence">
            {used.length === 0 && <p className="muted small">Run a check to see its output.</p>}
            <ul className="evidence">
              {used.map((id) => {
                const c = CHECKS.find((x) => x.id === id)!
                return (
                  <li key={id} className={c.catches.length ? 'is-fail' : 'is-ok'}>
                    <span className="small muted">{c.label}</span>
                    <pre className="code">{c.output}</pre>
                  </li>
                )
              })}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  )
}
