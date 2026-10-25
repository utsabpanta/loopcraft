import { describe, expect, it } from 'vitest'
import { evaluateContext } from './context'
import { BEST_BUILD, forge } from './forge'
import { REQUESTS, gradeGuard, type Verdict } from './guard'
import { CHECKPOINTS, TRACE, gradeLoop } from './loop'
import { OPTIMUM, UNITS, gradeSchedule, simulate, type Lane } from './orchestrate'
import { CANDIDATES, gradePlan } from './plan'
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

  it('fails while holding an unrestricted shell, even if the mission succeeds', () => {
    const run = runToolMission(new Set(['shell', 'run_tests']), 1)
    expect(run.grade.passed).toBe(false)
  })

  it('cannot pass without a way to run tests', () => {
    const run = runToolMission(new Set(['http_request', 'query_logs', 'grep', 'read_file', 'edit_file', 'deploy_staging']), 1)
    expect(run.grade.passed).toBe(false)
    expect(run.grade.notes.some((n) => n.text.startsWith('Mission complete'))).toBe(false)
  })

  it('counts the chosen description in the schema token cost', () => {
    const lean = runToolMission(new Set(['query_logs']), 0).schemaTokens
    const bloated = runToolMission(new Set(['query_logs']), 2).schemaTokens
    expect(bloated).toBeGreaterThan(lean)
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

  it('an empty window plus a search tool does not pass', () => {
    expect(evaluateContext(new Set(), true).grade.passed).toBe(false)
  })

  it('a search tool cannot fetch runtime logs', () => {
    const r = evaluateContext(new Set(['refund', 'test', 'agents']), true)
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

  it('fails a plan that never builds the feature', () => {
    expect(gradePlan(['explore', 'util', 'util_test', 'pr']).passed).toBe(false)
  })

  it('opening the PR before verifying is an ordering mistake', () => {
    const g = gradePlan(['explore', 'util', 'button', 'pr', 'util_test', 'e2e'])
    expect(g.score).toBeLessThan(100)
  })

  it('the candidate pool is not already in a valid order', () => {
    const naive = CANDIDATES.filter((c) => c.kind !== 'creep').map((c) => c.id)
    expect(gradePlan(naive).score).toBeLessThan(100)
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

  it('rm -rf of build output is acceptable either way', () => {
    expect(gradeGuard({ ...perfect, clean: 'deny' })).toMatchObject({ score: 100, passed: true })
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

  it('a conflicted schedule pays merge time and never passes', () => {
    const s = simulate({ ...allMain, billing: 'sub1', auth: 'sub2', search: 'sub3' })
    expect(s.conflicts.length).toBeGreaterThan(0)
    expect(s.makespan).toBeGreaterThan(OPTIMUM)
    const g = gradeSchedule(s)
    expect(g.passed).toBe(false)
    expect(g.notes.some((n) => n.tone === 'good' && n.text.startsWith('Finished'))).toBe(false)
  })

  it('every task on a subagent pays its own briefing', () => {
    const s = simulate({ ...allMain, search: 'sub1', notify: 'sub1' })
    expect(s.items.filter((i) => i.lane === 'sub1').every((i) => i.spinUp)).toBe(true)
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

  it('layered checks cannot rescue an agent that has no tools to run them', () => {
    const r = forge({ ...BEST_BUILD, tools: 'minimal' })
    expect(r.passed).toBe(false)
    expect(r.story.map((s) => s.text).join(' ')).not.toMatch(/Each layer caught something/)
  })

  it('the yolo story never claims the agent ran a script it had no tool for', () => {
    for (const tools of ['minimal', 'focused']) {
      const text = forge({ ...BEST_BUILD, perms: 'yolo', tools })
        .story.map((s) => s.text)
        .join(' ')
      expect(text).not.toMatch(/ran it|cleanup script/)
    }
  })

  it('trusting the agent alone is not good enough', () => {
    expect(forge({ ...BEST_BUILD, verify: 'trust' }).passed).toBe(false)
  })
})
