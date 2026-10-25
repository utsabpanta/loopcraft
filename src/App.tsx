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
            <span className="brand-mark" aria-hidden>↻</span> loopcraft
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
                <span className="nav-glyph" aria-hidden>{p?.passed ? '✓' : l.glyph}</span>
                <span className="nav-text">
                  <span className="nav-num">Level {i + 1}</span>
                  <span>{l.title}</span>
                </span>
              </a>
            )
          })}
          <a href="#/guide" className={`nav-item ${route.page === 'guide' ? 'is-active' : ''}`}>
            <span className="nav-glyph" aria-hidden>?</span>
            <span className="nav-text">
              <span className="nav-num">Reference</span>
              <span>Field Guide</span>
            </span>
          </a>
        </nav>
        <div className="sidebar-foot">
          <div className="xp">
            <span>{passedCount} / {LEVELS.length} badges</span>
            <div className="meter-track"><div className="meter-fill" style={{ width: `${(passedCount / LEVELS.length) * 100}%` }} /></div>
          </div>
          {passedCount > 0 && (
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
  const next = LEVELS.find((l) => !progress[l.id]?.passed) ?? LEVELS[0]
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
            <a className="btn primary big" href={`#/level/${next.id}`}>
              {Object.keys(progress).length ? 'Continue' : 'Start'}: {next.title} →
            </a>
            <a className="btn ghost big" href="#/guide">Field Guide</a>
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
              <span className="level-card-glyph" aria-hidden>{l.glyph}</span>
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
  const next = LEVELS[index + 1]
  const { Component } = level

  const onGrade = (g: Grade) => {
    setGrade(g)
    recordResult(level.id, g.score, g.passed)
  }

  useEffect(() => {
    if (grade) document.getElementById('result')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [grade])

  return (
    <article className="level">
      <header className="level-head">
        <span className="level-glyph" aria-hidden>{level.glyph}</span>
        <div>
          <p className="eyebrow">Level {index + 1} of {LEVELS.length}</p>
          <h1>{level.title}</h1>
          <p className="lede">{level.tagline}</p>
        </div>
      </header>
      <section className="briefing">
        {level.briefing.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </section>

      <Component key={attempt} onGrade={onGrade} />

      {grade && (
        <section id="result" className={`result ${grade.passed ? 'is-pass' : 'is-fail'}`}>
          <header className="result-head">
            <div className="result-score">{grade.score}</div>
            <div>
              <h2>{grade.passed ? `🏅 Badge earned: ${level.badge}` : 'Not yet. Tweak your approach and try again.'}</h2>
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
                setAttempt((a) => a + 1)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            >
              ↺ Try again
            </button>
            {grade.passed && next && (
              <a className="btn primary" href={`#/level/${next.id}`}>
                Next: {next.title} →
              </a>
            )}
            {grade.passed && !next && (
              <a className="btn primary" href="#/">🎓 You graduated. Back to base</a>
            )}
          </div>
        </section>
      )}
    </article>
  )
}
