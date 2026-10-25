# ↻ Loopcraft

**Learn agentic engineering by steering agents through the loop.**

Loopcraft is an interactive, game-like workshop that teaches the craft of building with AI agents. You don't just read about agents here. You debug their traces, pack their toolboxes, curate their context windows, catch them reward-hacking, block prompt injections, and run a team of subagents.

Everything runs in a **deterministic simulator in the browser**: no API key, no backend, no cost.

## The levels

| # | Level | You learn to… | Badge |
|---|-------|---------------|-------|
| 1 | **The Loop** | Step through a real-looking agent trace and predict each next move: gather → act → verify → repeat. | Loop Whisperer |
| 2 | **Hands & Tools** | Pack a least-privilege toolbox for an incident, and fix a tool description the model can actually use. | Toolsmith |
| 3 | **Context Engineering** | Fill a 10k-token window with high-signal context, compact history, and use just-in-time retrieval. | Context Curator |
| 4 | **Plan the Work** | Decompose a feature into ordered, verifiable steps without scope creep. | Architect |
| 5 | **Trust, but Verify** | The agent says "done ✅". Pick 3 checks that expose 3 hidden problems, including a deleted test. | Inspector |
| 6 | **Guardrails** | Be the human in the loop. Allow or deny 10 actions, including prompt injection, a typosquat, and exfiltration. | Gatekeeper |
| 7 | **Orchestration** | Schedule a migration across subagents on a live Gantt chart: parallelize without merge conflicts. | Conductor |
| 8 | **The Night Shift** | Capstone. Configure prompt, tools, context, verification, permissions and team shape, then let it run overnight. | Agentic Engineer |

Each level ends with a scored debrief and **field notes**, the takeaways worth remembering. There's also a **Field Guide** glossary of core terms.

## Quick start

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

| Command | What it does |
|---------|--------------|
| `npm run dev` | Start the dev server |
| `npm test` | Run the simulator's unit tests (Vitest) |
| `npm run lint` | Lint with oxlint |
| `npm run build` | Type-check and build to `dist/` |

## How it works

```
src/
├── engine/        Pure, deterministic simulation + grading for every level (unit-tested)
├── levels/        One React component per level, plus the level registry (briefings, field notes)
├── components/    Shared UI: loop diagram, panels, meters, notes
├── progress.ts    Badge/score persistence in localStorage
└── App.tsx        Hash router, sidebar, home, level shell
```

The engine and the UI are kept separate on purpose: every scenario and scoring rule lives in `src/engine/` as plain TypeScript, so it's easy to test, tweak, or extend.

### Adding a level

1. Write the scenario and a `grade…()` function in `src/engine/yourlevel.ts` returning a `Grade`.
2. Add tests in `src/engine/engine.test.ts`.
3. Build the interactive component in `src/levels/YourLevel.tsx`, calling `onGrade(grade)`.
4. Register it in `src/levels/index.ts` with a briefing, field notes, and a badge.

## Deploying

A GitHub Actions workflow (`.github/workflows/pages.yml`) builds and deploys to GitHub Pages on every push to `main`. Enable it under **Settings → Pages → Source: GitHub Actions**. The build uses a relative base path, so it works from any subpath.

## License

[MIT](LICENSE) © utsabpanta
