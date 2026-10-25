# Contributing to Loopcraft

Thanks for helping people learn agentic engineering. Contributions of every size are welcome: a clearer sentence, a fairer scoring rule, or a whole new level.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # engine unit tests
npm run lint
npm run format   # Prettier
```

CI runs lint, the format check, tests and the build on every pull request.

## How the code is organized

- `src/engine/`: each level's scenario data and grading as plain, deterministic TypeScript. No React. This is where the "lesson" lives.
- `src/levels/`: one React component per level, plus `index.ts` with each level's briefing, field notes and badge.
- `src/engine/engine.test.ts`: tests for every level. If you change a scoring rule, add a test that pins the behavior.

## Principles for scenarios

1. **Teach real practice.** A "correct" answer should hold up against how experienced engineers actually work with agents. If it's debatable, accept either answer and say why (see `either` in `src/engine/guard.ts`).
2. **Explain every failure.** A learner who fails should know which choice cost them, without being handed the answer.
3. **No contradictions.** Story text and run logs must match the learner's inputs. Write a test when a message depends on a combination of inputs.
4. **No trivial passes.** Selecting everything, or clicking top to bottom, shouldn't win.

## Adding a level

1. Write the scenario and a `grade…()` function returning a `Grade` in `src/engine/yourlevel.ts`.
2. Add tests for the best answer, a few failing answers and any exploits.
3. Build `src/levels/YourLevel.tsx`. Call `onGrade(grade)` to submit and `onReset()` whenever the learner changes an input.
4. Register it in `src/levels/index.ts`.

Open an issue with the "Level or scenario idea" template first if you'd like feedback before building.
