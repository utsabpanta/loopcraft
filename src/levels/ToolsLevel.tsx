import { useState } from 'react'
import { Panel } from '../components/ui'
import { DESCRIPTION_OPTIONS, MISSION, TOOLBOX, runToolMission, toolboxTokens, type ToolRun } from '../engine/tools'
import type { LevelProps } from './types'

export function ToolsLevel({ onGrade, onReset }: LevelProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [desc, setDesc] = useState<number | null>(null)
  const [run, setRun] = useState<ToolRun | null>(null)

  const changed = () => {
    setRun(null)
    onReset()
  }

  const toggle = (id: string) => {
    changed()
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const launch = () => {
    const r = runToolMission(selected, desc)
    setRun(r)
    onGrade(r.grade)
  }

  const schemaTokens = toolboxTokens(selected, desc)
  const blocker = selected.size === 0 ? 'Pick at least one tool.' : desc === null ? 'Choose a query_logs description in step 2.' : null

  return (
    <div className="stack">
      <div className="mission">
        <span className="mission-tag">Mission</span> {MISSION}
      </div>
      <div className="split">
        <Panel title="1 · Pack the toolbox">
          <p className="muted small">
            Pick <strong>every</strong> tool the agent will need to finish the mission. You can select several. The agent can only do what its tools allow, and
            it may use anything you hand it.
          </p>
          <div className="tool-grid">
            {TOOLBOX.map((t) => (
              <button
                key={t.id}
                className={`tool-card risk-${t.risk} ${selected.has(t.id) ? 'is-on' : ''}`}
                onClick={() => toggle(t.id)}
                aria-pressed={selected.has(t.id)}
              >
                <code>{t.name}</code>
                <span>{t.description}</span>
                {t.risk !== 'safe' && <em className="risk-tag">{t.risk === 'danger' ? 'high risk' : 'writes'}</em>}
              </button>
            ))}
          </div>
          <p className="muted small">
            {selected.size} tools · ~{schemaTokens.toLocaleString()} schema tokens sent on <em>every</em> model call
          </p>
        </Panel>
        <Panel title="2 · Write the query_logs description (required)">
          <p className="muted small">The model only knows a tool through its name, schema and description. Which description would you ship?</p>
          <div className="choices">
            {DESCRIPTION_OPTIONS.map((d, i) => (
              <button
                key={i}
                className={`choice ${desc === i ? 'is-on' : ''}`}
                onClick={() => {
                  changed()
                  setDesc(i)
                }}
                aria-pressed={desc === i}
              >
                {d.text}
                <span className="muted small">~{d.tokens} tokens</span>
              </button>
            ))}
          </div>
        </Panel>
      </div>
      <div className="row">
        <button className="btn primary" onClick={launch} disabled={blocker !== null}>
          ▶ Run the agent
        </button>
        {blocker && <span className="muted small">{blocker}</span>}
      </div>
      {run && (
        <div id="level-output">
          <Panel title="Run log">
            <ol className="runlog">
              {run.steps.map((s, i) => (
                <li key={i} className={s.ok ? 'is-ok' : 'is-fail'} style={{ animationDelay: `${i * 120}ms` }}>
                  <span className="runlog-stage">{s.stage}</span>
                  <span>{s.text}</span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      )}
    </div>
  )
}
