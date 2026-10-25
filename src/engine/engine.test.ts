import { describe, expect, it } from 'vitest'
import { evaluateContext } from './context'
import { BEST_BUILD, forge } from './forge'
import { REQUESTS, gradeGuard, type Verdict } from './guard'
import { CHECKPOINTS, TRACE, gradeLoop } from './loop'
import { OPTIMUM, UNITS, gradeSchedule, simulate, type Lane } from './orchestrate'
import { gradePlan } from './plan'
import { runToolMission } from './tools'
import { gradeVerification } from './verify'

describe('loop', () => {
  const correct = CHECKPOINTS.map((cp) => cp.options.findIndex((o) => o.correct))

  it('has exactly one correct option per checkpoint, each inside the trace', () => {
    for (const cp of CHECKPOINTS) {
      expect(cp.options.filter((o) => o.correct)).toHaveLength(1)
      expect(cp.after).toBeLessThan(TRACE.length - 1)
    }
  })

  it('passes with all-correct answers and fails with all-wrong ones', () => {
    expect(gradeLoop(correct)).toMatchObject({ score: 100, passed: true })
    const wrong = correct.map((c) => (c + 1) % 3)
    expect(gradeLoop(wrong)).toMatchObject({ score: 0, passed: false })
  })
})

describe('tools', () => {
  const ideal = new Set(['http_request', 'query_logs', 'grep', 'read_file', 'edit_file', 'run_tests', 'deploy_staging'])

  it('passes a focused least-privilege toolbox with a precise description', () => {
    const run = runToolMission(ideal, 1)
    expect(run.completed).toBe(true)
    expect(run.grade.passed).toBe(true)
    expect(run.grade.score).toBeGreaterThanOrEqual(95)
  })

  it('ships to prod when only deploy_production is available', () => {
    const tools = new Set([...ideal].filter((t) => t !== 'deploy_staging').concat('deploy_production'))
    const run = runToolMission(tools, 1)
    expect(run.shippedToProd).toBe(true)
    expect(run.grade.passed).toBe(false)
  })

  it('a lone irrelevant tool names every missing capability and never claims a diagnosis', () => {
    const run = runToolMission(new Set(['web_search']), null)
    expect(run.grade.passed).toBe(false)
    const missing = run.grade.notes.filter((n) => n.text.startsWith('Missing:'))
    expect(missing).toHaveLength(5)
    expect(run.steps.map((s) => s.text).join(' ')).not.toMatch(/Found the bug|Diagnosed/)
  })

  it('gets stuck without observability', () => {
    const run = runToolMission(new Set(['read_file', 'edit_file', 'run_tests', 'deploy_staging']), 1)
    expect(run.completed).toBe(false)
    expect(run.grade.passed).toBe(false)
  })
})

describe('context', () => {
  it('rewards a curated window', () => {
    const r = evaluateContext(new Set(['trace', 'refund', 'test', 'agents', 'idem', 'summary']), true)
    expect(r.overflow).toBe(false)
    expect(r.grade.passed).toBe(true)
    expect(r.grade.score).toBeGreaterThanOrEqual(95)
  })

  it('fails on overflow', () => {
    expect(evaluateContext(new Set(['repo']), false)).toMatchObject({ overflow: true, grade: { passed: false } })
  })

  it('punishes stale docs', () => {
    const r = evaluateContext(new Set(['trace', 'refund', 'test', 'agents', 'design']), false)
    expect(r.grade.passed).toBe(false)
  })

  it('just-in-time retrieval softens missing files', () => {
    const without = evaluateContext(new Set(['trace', 'agents']), false).grade.score
    const withJit = evaluateContext(new Set(['trace', 'agents']), true).grade.score
    expect(withJit).toBeGreaterThan(without)
  })
})

describe('plan', () => {
  it('passes a well-ordered, verified, focused plan', () => {
    expect(gradePlan(['conventions', 'explore', 'util', 'util_test', 'button', 'e2e', 'pr'])).toMatchObject({ score: 100, passed: true })
  })

  it('penalizes dependency violations, creep and no verification', () => {
    expect(gradePlan(['button', 'util', 'explore', 'pr']).passed).toBe(false)
    expect(gradePlan(['explore', 'util', 'button', 'redesign', 'pdf', 'util_test', 'pr']).passed).toBe(false)
    expect(gradePlan(['explore', 'util', 'button', 'pr']).passed).toBe(false)
  })
})

describe('verify', () => {
  it('the right three checks catch every issue', () => {
    expect(gradeVerification(['diff', 'typecheck', 'e2e'])).toMatchObject({ score: 100, passed: true })
  })

  it('self-report and green tests catch nothing', () => {
    expect(gradeVerification(['ask', 'unit', 'lint'])).toMatchObject({ score: 0, passed: false })
  })
})

describe('guard', () => {
  const perfect = Object.fromEntries(REQUESTS.map((r) => [r.id, r.expected])) as Record<string, Verdict>

  it('perfect judgment passes', () => {
    expect(gradeGuard(perfect)).toMatchObject({ score: 100, passed: true })
  })

  it('allowing any dangerous action fails, even with a high hit rate', () => {
    expect(gradeGuard({ ...perfect, inject: 'allow' }).passed).toBe(false)
  })

  it('denying everything is safe but fails on friction', () => {
    const denyAll = Object.fromEntries(REQUESTS.map((r) => [r.id, 'deny'])) as Record<string, Verdict>
    expect(gradeGuard(denyAll).passed).toBe(false)
  })
})

describe('orchestrate', () => {
  const allMain = Object.fromEntries(UNITS.map((u) => [u.id, 'main'])) as Record<string, Lane>

  it('serial execution is slow but conflict-free', () => {
    const s = simulate(allMain)
    expect(s.makespan).toBe(UNITS.reduce((n, u) => n + u.duration, 0))
    expect(s.conflicts).toHaveLength(0)
    expect(gradeSchedule(s).passed).toBe(false)
  })

  it('parallel writers on the same file conflict', () => {
    const s = simulate({ ...allMain, billing: 'sub1', auth: 'sub2' })
    expect(s.conflicts.map((c) => c.file)).toContain('services/gateway/routes.ts')
  })

  it('the optimal schedule is reachable', () => {
    const s = simulate({ ...allMain, search: 'sub1', notify: 'sub2', docs: 'sub3' })
    expect(s.conflicts).toHaveLength(0)
    expect(s.makespan).toBe(OPTIMUM)
    expect(gradeSchedule(s)).toMatchObject({ score: 100, passed: true })
  })
})

describe('forge', () => {
  it('the best build earns an S', () => {
    expect(forge(BEST_BUILD)).toMatchObject({ letter: 'S', passed: true })
  })

  it('yolo permissions with prod tools is an incident', () => {
    const r = forge({ ...BEST_BUILD, perms: 'yolo', tools: 'everything' })
    expect(r.passed).toBe(false)
    expect(r.overall).toBeLessThanOrEqual(50)
  })

  it('trusting the agent alone is not good enough', () => {
    expect(forge({ ...BEST_BUILD, verify: 'trust' }).passed).toBe(false)
  })
})
