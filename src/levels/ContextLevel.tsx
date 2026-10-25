import { useState } from 'react'
import { Meter, Panel } from '../components/ui'
import { BUDGET, ITEMS, TASK, evaluateContext } from '../engine/context'
import type { LevelProps } from './types'

export function ContextLevel({ onGrade, onReset }: LevelProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [jit, setJit] = useState(false)

  const used = ITEMS.filter((i) => i.relevance === 'required' || selected.has(i.id)).reduce((n, i) => n + i.tokens, 0)

  const toggle = (id: string) => {
    onReset()
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="stack">
      <div className="mission">
        <span className="mission-tag">Task</span> {TASK}
      </div>
      <div className="split">
        <Panel title="Fill the context window">
          <ul className="ctx-list">
            {ITEMS.map((item) => {
              const locked = item.relevance === 'required'
              const on = locked || selected.has(item.id)
              return (
                <li key={item.id}>
                  <label className={`ctx-item ${on ? 'is-on' : ''} ${locked ? 'is-locked' : ''}`}>
                    <input type="checkbox" checked={on} disabled={locked} onChange={() => toggle(item.id)} />
                    <span className="ctx-main">
                      <strong>{item.label}</strong>
                      <span className="muted small">{item.detail}</span>
                    </span>
                    <span className="ctx-tokens">{item.tokens.toLocaleString()}</span>
                  </label>
                </li>
              )
            })}
          </ul>
        </Panel>
        <div className="sticky stack">
          <Panel title="Window">
            <Meter value={used} max={BUDGET} label="Tokens" danger={used > BUDGET} />
            <div className="ctx-blocks" aria-hidden title="Each block is one item, drawn to scale against the 10,000-token budget">
              {ITEMS.filter((i) => i.relevance === 'required' || selected.has(i.id)).map((i) => (
                <span
                  key={i.id}
                  title={`${i.label}: ${i.tokens.toLocaleString()} tokens`}
                  className={`ctx-block ${used > BUDGET ? 'is-over' : ''}`}
                  style={{ width: `${(i.tokens / Math.max(used, BUDGET)) * 100}%` }}
                />
              ))}
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={jit}
                onChange={(e) => {
                  onReset()
                  setJit(e.target.checked)
                }}
              />
              <span>
                <strong>Give the agent a search tool</strong>
                <span className="muted small"> so it can fetch files just-in-time</span>
              </span>
            </label>
            <button className="btn primary block" onClick={() => onGrade(evaluateContext(selected, jit).grade)}>
              ▶ Run the agent
            </button>
          </Panel>
          <p className="muted small">
            Hint: context isn't free storage. It's the model's working memory, and it degrades as it fills up. Everything in it competes for attention.
          </p>
        </div>
      </div>
    </div>
  )
}
