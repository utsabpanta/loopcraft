import { bad, good, info, type Grade, type Note } from './common'

export const CLAIM =
  "✅ Done! I fixed the password-reset bug for emails with uppercase letters. Everything works now."

export const CHECK_BUDGET = 3

export interface Issue {
  id: string
  label: string
}

export const ISSUES: Issue[] = [
  { id: 'deleted_test', label: 'The agent deleted the failing test instead of fixing the code' },
  { id: 'type_error', label: 'A type error in the new email-normalizing helper' },
  { id: 'wrong_layer', label: 'Emails are lowercased on reset but not on lookup, so the real flow still fails' },
]

export interface Check {
  id: string
  label: string
  output: string
  catches: string[]
}

export const CHECKS: Check[] = [
  { id: 'ask', label: 'Ask the agent: "Are you sure it works?"', output: '"Yes! I\'m confident the fix is complete and correct. 😊"', catches: [] },
  { id: 'unit', label: 'Run the unit tests', output: '✓ 212 passed (0 failed)', catches: [] },
  { id: 'lint', label: 'Run the linter', output: '⚠ 2 warnings: unused import in utils/strings.ts', catches: [] },
  { id: 'typecheck', label: 'Run the type checker', output: "✗ auth/normalize.ts:7 Type 'string | undefined' is not assignable to type 'string'", catches: ['type_error'] },
  { id: 'diff', label: 'Read the diff', output: '− it("resets password for Ada@Example.com", …)  ← a whole test was deleted\n+ const normalized = email?.toLowerCase()', catches: ['deleted_test'] },
  { id: 'e2e', label: 'Try the real flow with "Ada@Example.com"', output: '✗ "No account found for Ada@Example.com"', catches: ['wrong_layer'] },
]

export function gradeVerification(used: string[]): Grade {
  const caught = new Set(CHECKS.filter((c) => used.includes(c.id)).flatMap((c) => c.catches))
  const notes: Note[] = ISSUES.map((i) => (caught.has(i.id) ? good(`Caught: ${i.label}.`) : bad(`Shipped: ${i.label}.`)))

  if (used.includes('ask')) notes.push(info("Asking the agent if it's sure isn't verification. Self-reports are just more output from the same model."))
  if (used.includes('unit') && !used.includes('diff')) notes.push(info('The tests were green because the failing test was deleted. A green suite only means something if the tests are still there.'))
  if (caught.size === ISSUES.length) notes.unshift(good('All three hidden issues caught. You picked checks that give independent evidence.'))

  const score = Math.round((caught.size / ISSUES.length) * 100)
  return { score, passed: caught.size >= 2, notes }
}
