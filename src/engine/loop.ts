import { bad, clamp, good, info, type Grade } from './common'

export type Phase = 'gather' | 'act' | 'verify' | 'done'

export interface TraceEvent {
  kind: 'user' | 'think' | 'tool' | 'observe' | 'done'
  phase: Phase
  text: string
  code?: string
}

export interface Checkpoint {
  /** The checkpoint pauses the trace after this event index. */
  after: number
  question: string
  options: { text: string; correct: boolean; why: string }[]
}

export const TRACE: TraceEvent[] = [
  { kind: 'user', phase: 'gather', text: 'The cart tests started failing after the discount change. Can you fix it?' },
  { kind: 'think', phase: 'gather', text: "I don't know what's failing yet. Guessing is expensive; running the tests is cheap." },
  { kind: 'tool', phase: 'gather', text: 'run_tests()' },
  {
    kind: 'observe',
    phase: 'gather',
    text: '1 failing test',
    code: 'FAIL cart.test.ts › applies a 10% discount\n  Expected: 90\n  Received: 81',
  },
  { kind: 'think', phase: 'gather', text: '81 = 100 × 0.9 × 0.9. It looks like the discount is applied twice. Let me read the code.' },
  { kind: 'tool', phase: 'gather', text: 'read_file("src/cart.ts")' },
  {
    kind: 'observe',
    phase: 'gather',
    text: 'src/cart.ts',
    code: 'export const subtotal = (c) => applyDiscount(sum(c.items), c.discount)\nexport const total = (c) => applyDiscount(subtotal(c), c.discount) + c.shipping',
  },
  { kind: 'tool', phase: 'act', text: 'edit_file("src/cart.ts", total = subtotal(c) + c.shipping)' },
  { kind: 'observe', phase: 'act', text: 'Edited src/cart.ts (1 line changed)' },
  { kind: 'tool', phase: 'verify', text: 'run_tests()' },
  {
    kind: 'observe',
    phase: 'verify',
    text: '1 new failing test',
    code: 'PASS cart.test.ts (14)\nFAIL checkout.test.ts › charges discounted price + shipping\n  Expected: 95\n  Received: 104',
  },
  { kind: 'think', phase: 'gather', text: 'My edit caused a regression. Back to gathering context: what does checkout expect?' },
  { kind: 'tool', phase: 'gather', text: 'read_file("src/checkout.ts")' },
  {
    kind: 'observe',
    phase: 'gather',
    text: 'src/checkout.ts',
    code: '// HACK(#212): cart.total() over-discounts, so add the difference back\nexport const charge = (c) => total(c) + subtotal(c) * c.discount',
  },
  { kind: 'think', phase: 'act', text: 'checkout had a workaround for the old bug. With the real fix in place, the workaround over-charges. Remove it.' },
  { kind: 'tool', phase: 'act', text: 'edit_file("src/checkout.ts", charge = total(c))' },
  { kind: 'observe', phase: 'act', text: 'Edited src/checkout.ts (1 line changed)' },
  { kind: 'tool', phase: 'verify', text: 'run_tests()' },
  { kind: 'observe', phase: 'verify', text: 'All green', code: 'PASS 31 tests across 6 files' },
  {
    kind: 'done',
    phase: 'done',
    text: 'Fixed: discount was applied twice in cart.total(). Also removed an old workaround in checkout.charge() (#212) that the fix made obsolete. All 31 tests pass.',
  },
]

export const CHECKPOINTS: Checkpoint[] = [
  {
    after: 3,
    question: 'The agent has the failing output. What should it do next?',
    options: [
      {
        text: 'Edit cart.ts so the discount case returns 90',
        correct: false,
        why: "That patches the symptom. The agent hasn't read the code yet, so it would be guessing, or hardcoding a value to fit the test.",
      },
      {
        text: 'Read the code under test to understand the discount logic',
        correct: true,
        why: 'Gather context before acting. A cheap read now prevents an expensive wrong edit later.',
      },
      {
        text: 'Report that the test is probably flaky',
        correct: false,
        why: 'A deterministic numeric mismatch is not flakiness. Declaring victory without evidence is the classic agent failure mode.',
      },
    ],
  },
  {
    after: 6,
    question: 'The code applies the discount twice. What kind of change should the agent make?',
    options: [
      {
        text: 'Rewrite the cart module to be cleaner',
        correct: false,
        why: 'Scope creep. A large rewrite multiplies risk and review cost for a one-line bug.',
      },
      { text: 'Make the minimal edit: drop the second applyDiscount', correct: true, why: 'Small, targeted diffs are easy to verify and easy to revert.' },
      {
        text: 'Stop and ask the user which function should discount',
        correct: false,
        why: 'Asking is sometimes right, but here the failing test already specifies the intended behavior. Use the evidence you have.',
      },
    ],
  },
  {
    after: 8,
    question: 'The edit is applied. Is the agent done?',
    options: [
      {
        text: 'Yes. The fix is obviously correct.',
        correct: false,
        why: '"Obviously correct" is how regressions ship. Keep reading: this edit breaks something else.',
      },
      { text: 'No. Re-run the tests to verify.', correct: true, why: 'An agent is only done when it has evidence. Verification closes the loop.' },
      { text: 'No. Add a long comment explaining the change first.', correct: false, why: "Docs are nice, but they don't tell you whether the change works." },
    ],
  },
  {
    after: 10,
    question: 'Verification caught a new failure in checkout. Now what?',
    options: [
      {
        text: 'Delete the failing checkout test so the suite is green',
        correct: false,
        why: 'This is "reward hacking": gaming the signal instead of doing the work. Watch for it in real agent diffs.',
      },
      {
        text: 'Loop back: gather context on checkout, then fix it',
        correct: true,
        why: "This is what makes it a loop. A failed check doesn't end the run. It sends the agent back to gathering context.",
      },
      {
        text: "Revert everything and tell the user it can't be done",
        correct: false,
        why: 'Giving up discards real progress. The failure is new information to use.',
      },
    ],
  },
]

export function gradeLoop(answers: number[]): Grade {
  const correct = CHECKPOINTS.filter((cp, i) => cp.options[answers[i]]?.correct).length
  const notes = CHECKPOINTS.map((cp, i) => {
    const pick = cp.options[answers[i]]
    if (!pick) return info(`Checkpoint ${i + 1}: skipped.`)
    return pick.correct ? good(`Checkpoint ${i + 1}: ${pick.why}`) : bad(`Checkpoint ${i + 1}: ${pick.why}`)
  })
  return { score: clamp((correct / CHECKPOINTS.length) * 100), passed: correct >= 3, notes }
}
