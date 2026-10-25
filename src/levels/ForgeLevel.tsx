import { useEffect, useRef, useState } from 'react'
import { Panel } from '../components/ui'
import { DIALS, FORGE_MISSION, METRICS, forge, type Build, type ForgeResult } from '../engine/forge'
import type { LevelProps } from './types'

const weakest = (r: ForgeResult) => {
  const m = METRICS.reduce((a, b) => (r.metrics[b.id] < r.metrics[a.id] ? b : a))
  return `${m.label} (${r.metrics[m.id]})`
}

const initial: Build = Object.fromEntries(DIALS.map((d) => [d.id, d.options[0].id]))

export function ForgeLevel({ onGrade, onReset }: LevelProps) {
  const [build, setBuild] = useState<Build>(initial)
  const [result, setResult] = useState<ForgeResult | null>(null)
  const [shown, setShown] = useState(0)
  const timers = useRef<number[]>([])

  const clearTimers = () => {
    timers.current.forEach((t) => clearTimeout(t))
    timers.current = []
  }
  useEffect(() => clearTimers, [])

  const launch = () => {
    clearTimers()
    const r = forge(build)
    setResult(r)
    setShown(0)
    // Reveal the night's story one beat at a time.
    timers.current = r.story.map((_, i) => window.setTimeout(() => setShown(i + 1), 350 * (i + 1)))
    onGrade({
      score: r.overall,
      passed: r.passed,
      notes: [
        {
          tone: r.passed ? 'good' : 'bad',
          text: `Grade ${r.letter} (${r.overall}/100). ${r.passed ? 'Your agent ran the night shift like a pro.' : 'Score A or better to earn the badge. Red lines in the story point at the dials to change.'}`,
        },
        ...(r.passed
          ? []
          : [{ tone: 'info' as const, text: `Weakest dimension: ${weakest(r)}. The grade is half average, half weakest link, so fix that one first.` }]),
      ],
    })
  }

  return (
    <div className="stack">
      <div className="mission">
        <span className="mission-tag">Capstone</span> {FORGE_MISSION}
      </div>
      <div className="dials">
        {DIALS.map((dial) => (
          <Panel key={dial.id} title={dial.label}>
            <div className="choices">
              {dial.options.map((o) => (
                <button
                  key={o.id}
                  className={`choice ${build[dial.id] === o.id ? 'is-on' : ''}`}
                  aria-pressed={build[dial.id] === o.id}
                  onClick={() => {
                    clearTimers()
                    onReset()
                    setResult(null)
                    setBuild((b) => ({ ...b, [dial.id]: o.id }))
                  }}
                >
                  <strong>{o.label}</strong>
                  <span className="muted small">{o.blurb}</span>
                </button>
              ))}
            </div>
          </Panel>
        ))}
      </div>
      <div className="row">
        <button className="btn primary big" onClick={launch}>
          🌙 Start the night shift
        </button>
      </div>
      {result && (
        <div className="split" id="level-output">
          <Panel title="What happened overnight">
            <ol className="story">
              {result.story.slice(0, shown).map((s, i) => (
                <li key={i} className={`story-${s.tone}`}>
                  {s.text}
                </li>
              ))}
            </ol>
          </Panel>
          <Panel title="Scorecard">
            <div className={`grade-letter grade-${result.letter}`}>{result.letter}</div>
            {METRICS.map((m) => (
              <div key={m.id} className="metric">
                <span>{m.label}</span>
                <div className="meter-track">
                  <div className={`meter-fill ${result.metrics[m.id] < 60 ? 'meter-danger' : ''}`} style={{ width: `${result.metrics[m.id]}%` }} />
                </div>
                <span className="metric-val">{result.metrics[m.id]}</span>
              </div>
            ))}
          </Panel>
        </div>
      )}
    </div>
  )
}
