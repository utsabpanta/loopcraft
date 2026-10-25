import { ContextLevel } from './ContextLevel'
import { ForgeLevel } from './ForgeLevel'
import { GuardLevel } from './GuardLevel'
import { LoopLevel } from './LoopLevel'
import { OrchestrateLevel } from './OrchestrateLevel'
import { PlanLevel } from './PlanLevel'
import { ToolsLevel } from './ToolsLevel'
import { VerifyLevel } from './VerifyLevel'
import type { Level } from './types'

export const LEVELS: Level[] = [
  {
    id: 'loop',
    title: 'The Loop',
    tagline: 'An agent is a model, in a loop, with tools.',
    badge: 'Loop Whisperer',
    glyph: '↻',
    briefing: [
      'A chatbot answers once. An agent keeps going: it gathers context, takes an action, checks the result, and decides what to do next. It repeats until the goal is met or it hits a reason to stop.',
      'Agentic engineering is the craft of designing that loop so it ends with correct work. You decide what the agent can see, what it can do, how it knows it\'s done, and where a human steps in.',
      'Step through a real-looking trace below. At each ⏸ checkpoint, predict what a good agent does next.',
    ],
    fieldNotes: [
      'Gather → act → verify → repeat. "Done" is a claim that needs evidence.',
      'Read before you write. Cheap observations prevent expensive mistakes.',
      'A failed check is new information, not the end of the run.',
      'Watch for reward hacking, like deleting tests or hardcoding expected values.',
    ],
    Component: LoopLevel,
  },
  {
    id: 'tools',
    title: 'Hands & Tools',
    tagline: 'An agent can only do what its tools let it do, and it will use whatever you give it.',
    badge: 'Toolsmith',
    glyph: '⚒',
    briefing: [
      'Tools are how an agent touches the world: reading files, running tests, calling APIs, deploying. The model picks tools from their names, schemas and descriptions alone, so those are part of your prompt.',
      'Too few tools and the agent is stuck. Too many and it gets confused, burns tokens on schemas, and reaches for power it shouldn\'t have. Pack the smallest toolbox that finishes the mission.',
    ],
    fieldNotes: [
      'Least privilege: the agent may use any tool it holds, so only hand it the ones you want used.',
      'Give the agent eyes (logs, HTTP, tests), not just hands.',
      'Write tool descriptions like docs for a new teammate: purpose, args with examples, return shape, limits.',
      'Every tool schema is sent on every call. Unused tools still cost tokens and attention.',
    ],
    Component: ToolsLevel,
  },
  {
    id: 'context',
    title: 'Context Engineering',
    tagline: "The context window is working memory, not a junk drawer.",
    badge: 'Context Curator',
    glyph: '◫',
    briefing: [
      'Everything the model knows about your task is whatever is in its context window right now: the system prompt, files, tool results, history. That space is limited, and quality drops as it fills with noise.',
      "Context engineering means choosing the smallest set of high-signal tokens. Load the essentials, leave out stale or misleading material, compact long history, and let the agent fetch the rest just-in-time.",
    ],
    fieldNotes: [
      'More context is not better context. Noise dilutes attention.',
      'Stale docs are worse than none: they send the agent confidently down the wrong path.',
      'Keep a short AGENTS.md / CLAUDE.md with conventions and commands. It\'s cheap and high-signal.',
      'Compact long histories into summaries; use search tools for just-in-time retrieval.',
    ],
    Component: ContextLevel,
  },
  {
    id: 'plan',
    title: 'Plan the Work',
    tagline: 'Decompose, order, and define done before you touch the code.',
    badge: 'Architect',
    glyph: '☰',
    briefing: [
      'Agents do best on work that is broken into small, ordered, checkable steps. A written plan keeps a long run on track, gives you a place to correct course early, and makes progress easy to see.',
      'Build a plan for the task below. Include what\'s needed, put dependencies first, add verification, and resist the urge to do "just one more thing".',
    ],
    fieldNotes: [
      'Explore first, then plan, then code. Ask the agent for the plan before it starts editing.',
      'Each step should be small enough to verify on its own.',
      'Bake verification into the plan instead of bolting it on at the end.',
      'Scope creep is how a 20-line PR turns into a 2,000-line one.',
    ],
    Component: PlanLevel,
  },
  {
    id: 'verify',
    title: 'Trust, but Verify',
    tagline: 'The agent says it\'s done. Prove it.',
    badge: 'Inspector',
    glyph: '⌕',
    briefing: [
      "Models are optimistic narrators. \"All fixed! ✅\" is a sentence the model generated, not evidence. Agentic engineering means building feedback loops, like tests, type checks, diff review and real-world checks, that tell you (and the agent) the truth.",
      'Below, the agent claims success. Three problems are hidden in its change and you only have time for three checks. Pick the ones that give independent evidence.',
    ],
    fieldNotes: [
      "Self-reports aren't verification. Ask for evidence, not confidence.",
      'Green tests can lie. Check that the tests are still there and still test the right thing.',
      'Layer cheap independent checks: types, tests, diff, the real flow.',
      'Give the agent the same checks so it can verify itself inside the loop.',
    ],
    Component: VerifyLevel,
  },
  {
    id: 'guard',
    title: 'Guardrails',
    tagline: 'Fast on the routine, firm on the irreversible.',
    badge: 'Gatekeeper',
    glyph: '⛨',
    briefing: [
      'Autonomy is a dial, not a switch. Good permission design lets routine, reversible actions flow and stops destructive, outward-facing, or suspicious ones for a human decision.',
      'You\'re the human in the loop. Review ten actions an agent wants to take. Some are routine. Some came from instructions hidden in files the agent read.',
    ],
    fieldNotes: [
      'Text in files, web pages and tool output is data, never instructions. Watch for prompt injection.',
      'Gate irreversible and outward-facing actions: force-push, deploys, deletes, sending data out.',
      'Check package names before installing. Typosquats run code on install.',
      'Over-blocking has a cost too: approval fatigue makes people click "yes" without reading.',
    ],
    Component: GuardLevel,
  },
  {
    id: 'orchestrate',
    title: 'Orchestration',
    tagline: 'One agent is a worker. Several are a team, if you manage them like one.',
    badge: 'Conductor',
    glyph: '⋔',
    briefing: [
      'Subagents let you run independent work in parallel, each in a fresh context window, reporting back a short summary. That keeps the main agent\'s context clean and the wall-clock short.',
      'But parallelism has a price: each subagent needs a briefing, dependent work still has to wait, and two writers on the same file means a merge conflict. Schedule the migration below to finish fast without collisions.',
    ],
    fieldNotes: [
      'Parallelize independent work; serialize work with dependencies.',
      'Never put two writers on the same files at the same time.',
      'Subagents are great for research and fan-out: their messy exploration stays out of the main context.',
      'Spawning has overhead. Don\'t send a swarm where one agent would do.',
    ],
    Component: OrchestrateLevel,
  },
  {
    id: 'forge',
    title: 'The Night Shift',
    tagline: 'Capstone: design an agent, then let it run unattended.',
    badge: 'Agentic Engineer',
    glyph: '✦',
    briefing: [
      "Everything comes together. You're configuring an agent to work overnight on a real-sized repo while you sleep. Pick its prompt, tools, context strategy, verification, permissions and team shape.",
      'Every dial is a trade-off between quality, safety, speed and cost. The weakest one drags down the whole run. Score an A or better to graduate.',
    ],
    fieldNotes: [
      'Specific prompt + focused tools + curated context + layered verification + tiered permissions + right-sized team.',
      'The agent is only as good as the environment you build around it.',
      'Start supervised, measure, then turn up autonomy where the checks are strong.',
    ],
    Component: ForgeLevel,
  },
]
