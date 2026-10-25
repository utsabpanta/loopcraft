const TERMS: { term: string; def: string }[] = [
  { term: 'Agent', def: 'A model running in a loop: it picks tools, observes results, and decides its next step until the goal is met.' },
  { term: 'Agent loop', def: 'Gather context → take action → verify → repeat. The core control flow of every agent.' },
  { term: 'Tool', def: 'A function the model can call, described by a name, a JSON schema and a description. The description is part of the prompt.' },
  { term: 'Context window', def: 'Everything the model can see on this turn. It is finite, and quality degrades as it fills with low-signal tokens.' },
  { term: 'Context engineering', def: 'Curating the smallest set of high-signal tokens: what to load up front, what to fetch just-in-time, what to compact or drop.' },
  { term: 'Just-in-time retrieval', def: 'Giving the agent search/read tools so it loads files when needed, instead of stuffing everything in up front.' },
  { term: 'Compaction', def: 'Summarizing long history into a short recap so a long-running agent keeps its window lean.' },
  { term: 'AGENTS.md / CLAUDE.md', def: 'A short notes file in the repo with conventions, commands and gotchas. It is loaded into every session.' },
  { term: 'Definition of done', def: 'Explicit, checkable criteria for success. Without it, the agent decides on its own when to stop.' },
  { term: 'Verification', def: 'Independent evidence that work is correct: tests, type checks, diff review, running the real flow.' },
  { term: 'Reward hacking', def: 'Gaming the success signal instead of doing the task: deleting failing tests, hardcoding expected outputs.' },
  { term: 'Prompt injection', def: 'Instructions hidden in data the agent reads (files, web pages, tool output) that try to hijack it.' },
  { term: 'Least privilege', def: 'Give an agent only the tools and permissions the task needs. It can only misuse what it holds.' },
  { term: 'Human in the loop', def: 'A person approves risky or irreversible actions. Tune it to avoid approval fatigue.' },
  { term: 'Subagent', def: 'A helper agent with its own fresh context, given a focused brief. It returns a summary to the orchestrator.' },
  { term: 'Orchestrator', def: 'The agent (or person) that splits work, assigns it, and integrates the results.' },
  { term: 'Eval', def: 'A repeatable test of agent behavior on representative tasks, used to measure changes to prompts, tools or models.' },
]

const HABITS = [
  'Ask for a plan first; review it before any code is written.',
  'Keep tasks small and diffs reviewable.',
  'Give the agent the same feedback loops you use: tests, types, linters, a running app.',
  'Write tool and prompt docs as if onboarding a sharp new teammate.',
  'Start supervised. Turn up autonomy only where verification is strong.',
  'Read the diff. Every time.',
]

export function FieldGuide() {
  return (
    <article className="level">
      <header className="level-head">
        <span className="level-glyph" aria-hidden>?</span>
        <div>
          <p className="eyebrow">Reference</p>
          <h1>Field Guide</h1>
          <p className="lede">The vocabulary of agentic engineering, on one page.</p>
        </div>
      </header>
      <dl className="glossary">
        {TERMS.map((t) => (
          <div key={t.term} className="glossary-item">
            <dt>{t.term}</dt>
            <dd>{t.def}</dd>
          </div>
        ))}
      </dl>
      <section className="field-notes">
        <h3>Six habits of effective agentic engineers</h3>
        <ol>
          {HABITS.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ol>
      </section>
    </article>
  )
}
