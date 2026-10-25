import type { ReactNode } from 'react'
import type { Note } from '../engine/common'

export function Notes({ notes }: { notes: Note[] }) {
  return (
    <ul className="notes">
      {notes.map((n, i) => (
        <li key={i} className={`note note-${n.tone}`}>
          <span className="note-icon" aria-hidden>
            {n.tone === 'good' ? '✓' : n.tone === 'bad' ? '✗' : 'i'}
          </span>
          <span>{n.text}</span>
        </li>
      ))}
    </ul>
  )
}

export function Panel({ title, children, actions }: { title?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="panel">
      {(title || actions) && (
        <header className="panel-head">
          {title && <h3>{title}</h3>}
          {actions && <div className="panel-actions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  )
}

export function Meter({ value, max, label, danger }: { value: number; max: number; label: string; danger?: boolean }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className="meter" role="meter" aria-valuenow={value} aria-valuemax={max} aria-label={label}>
      <div className="meter-label">
        <span>{label}</span>
        <span className={danger ? 'text-bad' : ''}>
          {value.toLocaleString()} / {max.toLocaleString()}
        </span>
      </div>
      <div className="meter-track">
        <div className={`meter-fill ${danger ? 'meter-danger' : ''}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
