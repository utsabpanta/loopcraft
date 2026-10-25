export type Tone = 'good' | 'bad' | 'info'

export interface Note {
  tone: Tone
  text: string
}

export interface Grade {
  /** 0–100 */
  score: number
  passed: boolean
  notes: Note[]
}

export const good = (text: string): Note => ({ tone: 'good', text })
export const bad = (text: string): Note => ({ tone: 'bad', text })
export const info = (text: string): Note => ({ tone: 'info', text })

export const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)))
