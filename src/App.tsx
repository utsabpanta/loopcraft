import { useEffect, useState } from 'react'
import { LoopDiagram } from './components/LoopDiagram'
import { Notes } from './components/ui'
import type { Grade } from './engine/common'
import { FieldGuide } from './FieldGuide'
import { LEVELS } from './levels'
import type { Level } from './levels/types'
import { recordResult, resetProgress, useProgress } from './progress'

type Route = { page: 'home' } | { page: 'guide' } | { page: 'level'; level: Level; index: number }

function parseHash(): Route {
  const h = window.location.hash.replace(/^#\/?/, '')
  if (h === 'guide') return { page: 'guide' }
  const m = h.match(/^level\/(.+)$/)
  if (m) {
    const index = LEVELS.findIndex((l) => l.id === m[1])
    if (index >= 0) return { page: 'level', level: LEVELS[index], index }
  }
  return { page: 'home' }
}

function useRoute() {
  const [route, setRoute] = useState(parseHash)
  useEffect(() => {
    const on = () => {
      setRoute(parseHash())
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}

export default function App() {
  const route = useRoute()
  const progress = useProgress()
  const passedCount = LEVELS.filter((l) => progress[l.id]?.passed).length
  const [navOpen, setNavOpen] = useState(false)

  return (
    <div className="app">
      <aside className={`sidebar ${navOpen ? 'is-open' : ''}`}>
        <div className="sidebar-top">
          <a href="#/" className="brand" onClick={() => setNavOpen(false)}>
            <span className="brand-mark" aria-hidden>
              ↻
            </span>{' '}
            loopcraft
          </a>
          <button className="icon-btn nav-toggle" aria-label="Toggle navigation" aria-expanded={navOpen} onClick={() => setNavOpen((o) => !o)}>
            ☰
          </button>
        </div>
        <nav className="nav" onClick={() => setNavOpen(false)}>
          {LEVELS.map((l, i) => {
            const p = progress[l.id]
            const active = route.page === 'level' && route.level.id === l.id
            return (
              <a key={l.id} href={`#/level/${l.id}`} className={`nav-item ${active ? 'is-active' : ''} ${p?.passed ? 'is-passed' : ''}`}>
                <span className="nav-glyph" aria-hidden>
                  {p?.passed ? '✓' : l.glyph}
                </span>
                <span className="nav-text">
                  <span className="nav-num">Level {i + 1}</span>
                  <span>{l.title}</span>
                </span>
              </a>
            )
          })}
          <a href="#/guide" className={`nav-item ${route.page === 'guide' ? 'is-active' : ''}`}>
            <span className="nav-glyph" aria-hidden>
              ?
            </span>
            <span className="nav-text">
              <span className="nav-num">Reference</span>
              <span>Field Guide</span>
            </span>
          </a>
        </nav>
        <div className="sidebar-foot">
          <div className="xp">
            <span>
              {passedCount} / {LEVELS.length} badges
            </span>
            <div className="meter-track">
              <div className="meter-fill" style={{ width: `${(passedCount / LEVELS.length) * 100}%` }} />
            </div>
          </div>
          {Object.keys(progress).length > 0 && (
            <button className="link small" onClick={() => confirm('Reset all progress?') && resetProgress()}>
              Reset progress
            </button>
          )}
        </div>
      </aside>
      <main className="main">
        {route.page === 'home' && <Home />}
        {route.page === 'guide' && <FieldGuide />}
        {route.page === 'level' && <LevelPage key={route.level.id} level={route.level} index={route.index} />}
      </main>
    </div>
  )
}

function Home() {
  const progress = useProgress()
  const next = LEVELS.find((l) => !progress[l.id]?.passed)
  const started = Object.keys(progress).length > 0
  return (
    <div className="home">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">An interactive workshop</p>
          <h1>
            Learn <span className="accent">agentic engineering</span> by steering agents through the loop.
          </h1>
          <p className="lede">
            Eight hands-on levels. Pack toolboxes, curate context windows, catch reward hacking, block prompt injections, and run a team of subagents.
            Everything runs in a deterministic simulator in your browser. No API key, no cost.
          </p>
          <div className="row">
            {next ? (
              <a className="btn primary big" href={`#/level/${next.id}`}>
                {started ? 'Continue' : 'Start'}: {next.title} →
              </a>
            ) : (
              <a className="btn primary big" href={`#/level/${LEVELS[0].id}`}>
                🎓 Graduated. Replay from Level 1
              </a>
            )}
            <a className="btn ghost big" href="#/guide">
              Field Guide
            </a>
          </div>
        </div>
        <div className="hero-art">
          <LoopDiagram spinning />
        </div>
      </section>
      <section className="level-grid">
        {LEVELS.map((l, i) => {
          const p = progress[l.id]
          return (
            <a key={l.id} href={`#/level/${l.id}`} className={`level-card ${p?.passed ? 'is-passed' : ''}`}>
              <span className="level-card-glyph" aria-hidden>
                {l.glyph}
              </span>
              <span className="nav-num">Level {i + 1}</span>
              <strong>{l.title}</strong>
              <span className="muted small">{l.tagline}</span>
              <span className="level-card-badge">{p?.passed ? `🏅 ${l.badge} · best ${p.best}` : `Earn: ${l.badge}`}</span>
            </a>
          )
        })}
      </section>
    </div>
  )
}

function LevelPage({ level, index }: { level: Level; index: number }) {
  const [grade, setGrade] = useState<Grade | null>(null)
  const [attempt, setAttempt] = useState(0)
  const progress = useProgress()
  const next = LEVELS[index + 1]
  const graduated = LEVELS.every((l) => progress[l.id]?.passed)
  const { Component } = level

  const onGrade = (raw: Grade) => {
    // A failed run should never show a passing-looking number, whatever rule it broke.
    const g = raw.passed ? raw : { ...raw, score: Math.min(raw.score, 69) }
    setGrade(g)
    recordResult(level.id, g.score, g.passed)
  }
  const onReset = () => setGrade(null)

  useEffect(() => {
    if (!grade) return
    // Levels that print their own run output get scrolled there first; the debrief sits right below.
    const target = document.getElementById('level-output') ?? document.getElementById('result')
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [grade])

  const shareText =
    graduated && !next
      ? 'I graduated from Loopcraft 🎓, an interactive workshop for learning agentic engineering.'
      : `I earned the "${level.badge}" badge on Loopcraft, an interactive workshop for learning agentic engineering.`

  return (
    <article className="level">
      <header className="level-head">
        <span className="level-glyph" aria-hidden>
          {level.glyph}
        </span>
        <div>
          <p className="eyebrow">
            Level {index + 1} of {LEVELS.length}
          </p>
          <h1>{level.title}</h1>
          <p className="lede">{level.tagline}</p>
        </div>
      </header>
      <section className="briefing">
        {level.briefing.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </section>

      <div id="level-play">
        <Component key={attempt} onGrade={onGrade} onReset={onReset} />
      </div>

      <div aria-live="polite">
        {grade && (
          <section id="result" className={`result ${grade.passed ? 'is-pass' : 'is-fail'}`}>
            <header className="result-head">
              <div className="result-score">{grade.score}</div>
              <div>
                <h2>{grade.passed ? `🏅 Badge earned: ${level.badge}` : 'Not yet. Read the notes, adjust, and run it again.'}</h2>
                <p className="muted small">Score out of 100. Your best score is saved in this browser.</p>
              </div>
            </header>
            <Notes notes={grade.notes} />
            {grade.passed && (
              <div className="field-notes">
                <h3>Field notes</h3>
                <ul>
                  {level.fieldNotes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="row">
              <button
                className="btn ghost"
                onClick={() => {
                  setGrade(null)
                  document.getElementById('level-play')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
              >
                ✎ Adjust and retry
              </button>
              <button
                className="btn ghost"
                onClick={() => {
                  setGrade(null)
                  setAttempt((a) => a + 1)
                  document.getElementById('level-play')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
              >
                ↺ Start over
              </button>
              {grade.passed && <ShareButton text={shareText} />}
              {grade.passed && next && (
                <a className="btn primary" href={`#/level/${next.id}`}>
                  Next: {next.title} →
                </a>
              )}
              {grade.passed &&
                !next &&
                (graduated ? (
                  <a className="btn primary" href="#/">
                    🎓 You graduated. Back to base
                  </a>
                ) : (
                  <a className="btn primary" href="#/">
                    Finish the remaining levels →
                  </a>
                ))}
            </div>
          </section>
        )}
      </div>
    </article>
  )
}

function ShareButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}${window.location.pathname}`
  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Loopcraft', text, url })
        return
      }
      await navigator.clipboard.writeText(`${text} ${url}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // The user dismissed the share sheet, or the clipboard is blocked. Nothing to do.
    }
  }
  return (
    <button className="btn ghost" onClick={share}>
      {copied ? '✓ Copied to clipboard' : '↗ Share'}
    </button>
  )
}
