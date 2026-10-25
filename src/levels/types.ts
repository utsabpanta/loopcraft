import type { ComponentType } from 'react'
import type { Grade } from '../engine/common'

export interface LevelProps {
  onGrade: (grade: Grade) => void
  /** Call whenever the learner changes an input, so a stale result never sits next to new choices. */
  onReset: () => void
}

export interface Level {
  id: string
  title: string
  tagline: string
  badge: string
  glyph: string
  briefing: string[]
  fieldNotes: string[]
  Component: ComponentType<LevelProps>
}
