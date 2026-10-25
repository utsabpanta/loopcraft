import { useEffect, useRef, useState } from 'react'
import { LoopDiagram } from '../components/LoopDiagram'
import { Panel } from '../components/ui'
import { CHECKPOINTS, TRACE, gradeLoop } from '../engine/loop'
import type { LevelProps } from './types'

const KIND_LABEL = { user: 'user', think: 'thinks', tool: 'calls', observe: 'sees', done: 'reports' } as const

export function LoopLevel({ onGrade, onReset }: LevelProps) {
  const [cursor, setCursor] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const logRef = useRef<HTMLOListElement>(null)
  const stepRef = useRef<HTMLButtonElement>(null)
  const answered = useRef(false)

  const pendingIdx = CHECKPOINTS.findIndex((cp, i) => cp.after === cursor && answers[i] === undefined)
  const pending = pendingIdx >= 0 ? CHECKPOINTS[pendingIdx] : null
  const finished = cursor >= TRACE.length - 1

  useEffect(() => {
    // Scroll the trace list itself, never the page.
    const el = logRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [cursor, answers])

  // The clicked choice unmounts after answering, so hand keyboard focus to the Step button.
  useEffect(() => {
    if (answered.current) stepRef.current?.focus()
    answered.current = false
  }, [answers])

  const answer = (opt: number) => {
    answered.current = true
    setAnswers((a) => Object.assign([...a], { [pendingIdx]: opt }))
  }
  const step = () => {
    const next = cursor + 1
    setCursor(next)
    if (next >= TRACE.length - 1) onGrade(gradeLoop(answers))
  }
  const reset = () => {
    onReset()
    setCursor(0)
    setAnswers([])
  }

  return (
    <div className="split">
      <Panel
        title="Agent trace"
        actions={
          <button className="btn ghost" onClick={reset}>
            Restart
          </button>
        }
      >
        <ol className="trace" ref={logRef}>
          {TRACE.slice(0, cursor + 1).map((e, i) => {
            const cpIdx = CHECKPOINTS.findIndex((cp) => cp.after === i)
            const cp = CHECKPOINTS[cpIdx]
            const picked = answers[cpIdx]
            return (
              <li key={i} className={`trace-event kind-${e.kind}`}>
                <span className="trace-kind">{e.kind === 'user' ? 'user' : `agent ${KIND_LABEL[e.kind]}`}</span>
                <span className="trace-text">{e.text}</span>
                {e.code && <pre className="code">{e.code}</pre>}
                {cp && picked !== undefined && (
                  <div aria-live="polite" className={`checkpoint-result ${cp.options[picked].correct ? 'is-good' : 'is-bad'}`}>
                    <strong>{cp.options[picked].correct ? 'Nice call.' : 'Not quite.'}</strong> {cp.options[picked].why}
                  </div>
                )}
              </li>
            )
          })}
        </ol>

        {pending ? (
          <div className="checkpoint" role="group" aria-label="Predict the next move">
            <p className="checkpoint-q">⏸ {pending.question}</p>
            <div className="choices">
              {pending.options.map((o, i) => (
                <button key={i} className="choice" onClick={() => answer(i)}>
                  {o.text}
                </button>
              ))}
            </div>
          </div>
        ) : (
          !finished && (
            <button ref={stepRef} className="btn primary" onClick={step}>
              Step ▸
            </button>
          )
        )}
      </Panel>
      <div className="sticky">
        <Panel title="Where the agent is">
          <LoopDiagram active={TRACE[cursor].phase} />
          <p className="muted small">
            Step {cursor + 1} of {TRACE.length} · {answers.filter((a) => a !== undefined).length}/{CHECKPOINTS.length} predictions made
          </p>
        </Panel>
      </div>
    </div>
  )
}
