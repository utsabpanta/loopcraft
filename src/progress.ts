import { useSyncExternalStore } from 'react'

export interface LevelProgress {
  best: number
  passed: boolean
}

export type Progress = Record<string, LevelProgress>

const KEY = 'loopcraft.progress.v1'
const listeners = new Set<() => void>()

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Progress) : {}
  } catch {
    return {}
  }
}

let state: Progress = load()

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Storage can be unavailable (private mode); progress just won't persist.
  }
  listeners.forEach((l) => l())
}

export function recordResult(levelId: string, score: number, passed: boolean) {
  const prev = state[levelId]
  state = {
    ...state,
    [levelId]: { best: Math.max(prev?.best ?? 0, score), passed: (prev?.passed ?? false) || passed },
  }
  save()
}

export function resetProgress() {
  state = {}
  save()
}

export function useProgress(): Progress {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}
