import type { Phase } from '../engine/loop'

const NODES: { phase: Exclude<Phase, 'done'>; label: string; x: number; y: number }[] = [
  { phase: 'gather', label: 'Gather context', x: 110, y: 30 },
  { phase: 'act', label: 'Take action', x: 179, y: 150 },
  { phase: 'verify', label: 'Verify work', x: 41, y: 150 },
]

/** The core agent loop: gather → act → verify → repeat. */
export function LoopDiagram({ active, spinning }: { active?: Phase; spinning?: boolean }) {
  return (
    <svg className={`loop-diagram ${spinning ? 'spinning' : ''}`} viewBox="-30 -5 280 205" role="img" aria-label="Agent loop: gather context, take action, verify work, repeat">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" className="loop-arrowhead" />
        </marker>
      </defs>
      <circle cx="110" cy="110" r="80" className="loop-orbit" />
      <path d="M143.8 37.5 A80 80 0 0 1 189.7 117" className="loop-edge" markerEnd="url(#arrow)" />
      <path d="M155.9 175.5 A80 80 0 0 1 64.1 175.5" className="loop-edge" markerEnd="url(#arrow)" />
      <path d="M30.3 117 A80 80 0 0 1 76.2 37.5" className="loop-edge" markerEnd="url(#arrow)" />
      {spinning && (
        <circle r="5" className="loop-spark">
          <animateMotion dur="4s" repeatCount="indefinite" path="M110 30 A80 80 0 1 1 109.9 30" />
        </circle>
      )}
      {NODES.map((n) => (
        <g key={n.phase} className={`loop-node ${active === n.phase ? 'is-active' : ''}`} transform={`translate(${n.x}, ${n.y})`}>
          <rect x="-58" y="-17" width="116" height="34" rx="17" />
          <text textAnchor="middle" dy="5">
            {n.label}
          </text>
        </g>
      ))}
      <text x="110" y="114" textAnchor="middle" className={`loop-center ${active === 'done' ? 'is-done' : ''}`}>
        {active === 'done' ? 'done ✓' : 'model'}
      </text>
    </svg>
  )
}
