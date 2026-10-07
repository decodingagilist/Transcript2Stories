import { useState, useRef, useMemo } from 'react';
import type { Epic, Dependency } from '../types';
import { cn } from '../lib/utils';
import { Plus, Trash2, Copy, RefreshCw, CheckCircle2, Check } from 'lucide-react';

const SPRINT_WIDTH = 180;
const ROW_HEIGHT = 40;
const HEADER_HEIGHT = 36;
const LABEL_WIDTH = 220;
const SPRINTS = [1, 2, 3, 4, 5];

const COLORS = [
  ['bg-blue-400', 'text-blue-700'],
  ['bg-violet-400', 'text-violet-700'],
  ['bg-emerald-400', 'text-emerald-700'],
  ['bg-orange-400', 'text-orange-700'],
  ['bg-pink-400', 'text-pink-700'],
];

interface FeatSched { startSprint: number; endSprint: number; }
interface Milestone { id: string; sprint: number; label: string; }

interface Props {
  epics: Epic[];
  dependencies: Dependency[];
  onApprove: () => void;
}

export function Timeline({ epics, dependencies, onApprove }: Props) {
  const [schedule, setSchedule] = useState<Record<string, FeatSched>>(() => {
    const s: Record<string, FeatSched> = {};
    epics.forEach(e => e.features.forEach(f => {
      s[f.id] = { startSprint: f.sprint, endSprint: f.endSprint ?? f.sprint };
    }));
    return s;
  });

  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [summary, setSummary] = useState('');
  const [summarized, setSummarized] = useState(false);
  const [copied, setCopied] = useState(false);
  const [drag, setDrag] = useState<{ featId: string; mode: 'move' | 'end'; startX: number; orig: FeatSched } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() =>
    epics.flatMap((epic, ei) =>
      epic.features.map(feat => ({ feat, epicTitle: epic.title, colorIdx: ei % COLORS.length }))
    ), [epics]
  );

  const totalW = LABEL_WIDTH + SPRINT_WIDTH * SPRINTS.length;
  const totalH = HEADER_HEIGHT + rows.length * ROW_HEIGHT + 4;

  function sx(sprint: number) { return LABEL_WIDTH + (sprint - 1) * SPRINT_WIDTH; }

  function generate() {
    const sprintFeats: Record<number, string[]> = {};
    rows.forEach(({ feat }) => {
      const s = schedule[feat.id] ?? { startSprint: feat.sprint, endSprint: feat.sprint };
      for (let sp = s.startSprint; sp <= s.endSprint; sp++) {
        if (!sprintFeats[sp]) sprintFeats[sp] = [];
        if (!sprintFeats[sp].includes(feat.title)) sprintFeats[sp].push(feat.title);
      }
    });
    const lines: string[] = [];
    SPRINTS.filter(s => sprintFeats[s]?.length).forEach(s => {
      lines.push(`Sprint ${s} Goal: Deliver ${sprintFeats[s].join(', ')}.`);
    });
    milestones.forEach(m => { if (m.label) lines.push(`  🏁 Sprint ${m.sprint} milestone: ${m.label}`); });
    setSummary(lines.join('\n'));
    setSummarized(true);
  }

  function copy() {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function onMouseDown(featId: string, mode: 'move' | 'end', e: React.MouseEvent) {
    e.preventDefault();
    const orig = schedule[featId] ?? { startSprint: 1, endSprint: 1 };
    setDrag({ featId, mode, startX: e.clientX, orig: { ...orig } });
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!drag) return;
    const delta = Math.round((e.clientX - drag.startX) / SPRINT_WIDTH);
    setSchedule(prev => {
      const o = drag.orig;
      if (drag.mode === 'end') {
        return { ...prev, [drag.featId]: { ...o, endSprint: Math.max(o.startSprint, Math.min(5, o.endSprint + delta)) } };
      } else {
        const ns = Math.max(1, Math.min(5, o.startSprint + delta));
        return { ...prev, [drag.featId]: { startSprint: ns, endSprint: Math.min(5, ns + (o.endSprint - o.startSprint)) } };
      }
    });
    setSummarized(false);
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Step 3 — Timeline</h2>
        <p className="text-sm text-muted-foreground">Drag bars to reposition or extend. Summarize before proceeding.</p>
      </div>

      {/* Gantt */}
      <div className="border border-border rounded-lg overflow-x-auto">
        <div
          ref={containerRef}
          className="relative select-none"
          style={{ width: totalW, height: totalH }}
          onMouseMove={onMouseMove}
          onMouseUp={() => setDrag(null)}
          onMouseLeave={() => setDrag(null)}
        >
          {/* Label column header */}
          <div className="absolute top-0 left-0 flex items-center px-3 text-xs font-medium text-muted-foreground border-b border-r border-border bg-muted/30"
            style={{ width: LABEL_WIDTH, height: HEADER_HEIGHT }}>
            Feature
          </div>

          {/* Sprint column headers + grid lines */}
          {SPRINTS.map(s => (
            <div key={s}>
              <div className="absolute flex items-center justify-center text-xs font-medium text-muted-foreground border-b border-l border-border bg-muted/20"
                style={{ left: sx(s), top: 0, width: SPRINT_WIDTH, height: HEADER_HEIGHT }}>
                Sprint {s}
              </div>
              <div className="absolute top-0 bottom-0 border-l border-border/30"
                style={{ left: sx(s), height: totalH }} />
            </div>
          ))}

          {/* Milestone diamonds */}
          {milestones.filter(m => m.label).map(m => (
            <div key={m.id}
              className="absolute pointer-events-none flex flex-col items-center"
              style={{ left: sx(m.sprint) + SPRINT_WIDTH / 2 - 8, top: HEADER_HEIGHT - 4, zIndex: 10 }}>
              <div className="w-4 h-4 bg-yellow-400 border-2 border-yellow-600 rotate-45" />
              <div className="text-xs text-yellow-700 font-medium whitespace-nowrap mt-1 -rotate-0 bg-white/80 px-1 rounded">
                {m.label}
              </div>
            </div>
          ))}

          {/* Rows */}
          {rows.map(({ feat, epicTitle, colorIdx }, ri) => {
            const y = HEADER_HEIGHT + ri * ROW_HEIGHT;
            const sched = schedule[feat.id] ?? { startSprint: feat.sprint, endSprint: feat.sprint };
            const barL = sx(sched.startSprint) + 4;
            const barW = (sched.endSprint - sched.startSprint + 1) * SPRINT_WIDTH - 8;
            const [bgColor] = COLORS[colorIdx];

            return (
              <div key={feat.id}>
                <div className={cn('absolute border-b border-border/20', ri % 2 === 1 ? 'bg-muted/5' : '')}
                  style={{ left: 0, top: y, width: totalW, height: ROW_HEIGHT }} />
                {/* Label */}
                <div className="absolute flex flex-col justify-center px-3 border-r border-border"
                  style={{ left: 0, top: y, width: LABEL_WIDTH, height: ROW_HEIGHT }}>
                  <span className="text-xs font-medium truncate">{feat.title}</span>
                  <span className="text-xs text-muted-foreground truncate">{epicTitle}</span>
                </div>
                {/* Bar */}
                <div
                  className={cn('absolute rounded flex items-center cursor-grab active:cursor-grabbing opacity-85 hover:opacity-100 transition-opacity', bgColor)}
                  style={{ left: barL, top: y + 8, width: barW, height: ROW_HEIGHT - 16 }}
                  onMouseDown={e => onMouseDown(feat.id, 'move', e)}
                >
                  <span className="text-white text-xs px-2 truncate font-medium select-none">{feat.title}</span>
                  {/* Right drag handle */}
                  <div
                    className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-black/20 rounded-r"
                    onMouseDown={e => { e.stopPropagation(); onMouseDown(feat.id, 'end', e); }}
                  />
                </div>
              </div>
            );
          })}

          {/* Dependency arrows */}
          <svg className="absolute top-0 left-0 pointer-events-none" style={{ width: totalW, height: totalH }}>
            <defs>
              <marker id="dep-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="hsl(var(--primary))" />
              </marker>
            </defs>
            {dependencies.map((dep, i) => {
              const fromIdx = rows.findIndex(r => r.feat.id === dep.from);
              const toIdx = rows.findIndex(r => r.feat.id === dep.to);
              if (fromIdx < 0 || toIdx < 0) return null;
              const fs = schedule[dep.from] ?? { startSprint: 1, endSprint: 1 };
              const ts = schedule[dep.to] ?? { startSprint: 1, endSprint: 1 };
              const x1 = sx(fs.endSprint) + SPRINT_WIDTH - 4;
              const y1 = HEADER_HEIGHT + fromIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
              const x2 = sx(ts.startSprint) + 4;
              const y2 = HEADER_HEIGHT + toIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
              return (
                <path key={i}
                  d={`M${x1},${y1} C${x1 + 40},${y1} ${x2 - 40},${y2} ${x2},${y2}`}
                  fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5"
                  strokeDasharray="4 3" markerEnd="url(#dep-arrow)" />
              );
            })}
          </svg>
        </div>
      </div>

      {/* Milestones */}
      <div className="border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Key Milestones</h3>
          <button onClick={() => setMilestones(p => [...p, { id: `m-${Date.now()}`, sprint: 1, label: '' }])}
            className="flex items-center gap-1 text-xs text-primary hover:opacity-80">
            <Plus size={12} /> Add milestone
          </button>
        </div>
        {milestones.length === 0 && <p className="text-xs text-muted-foreground">No milestones yet.</p>}
        {milestones.map(m => (
          <div key={m.id} className="flex items-center gap-2">
            <select className="text-xs border border-input rounded px-2 py-1 bg-background"
              value={m.sprint} onChange={e => setMilestones(p => p.map(x => x.id === m.id ? { ...x, sprint: Number(e.target.value) } : x))}>
              {SPRINTS.map(s => <option key={s} value={s}>Sprint {s}</option>)}
            </select>
            <input className="flex-1 text-xs border border-input rounded px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Milestone label…" value={m.label}
              onChange={e => setMilestones(p => p.map(x => x.id === m.id ? { ...x, label: e.target.value } : x))} />
            <button onClick={() => setMilestones(p => p.filter(x => x.id !== m.id))}
              className="text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>

      {/* Sprint Goal Summary */}
      <div className="border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Sprint Goal Summary</h3>
          <div className="flex gap-2">
            <button onClick={generate}
              className="flex items-center gap-1 text-xs border border-border rounded px-3 py-1.5 hover:bg-muted/30 font-medium">
              <RefreshCw size={12} /> {summary ? 'Regenerate' : 'Summarize'}
            </button>
            {summary && (
              <button onClick={copy}
                className="flex items-center gap-1 text-xs border border-border rounded px-3 py-1.5 hover:bg-muted/30">
                {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            )}
          </div>
        </div>
        {summary
          ? <pre className="text-xs text-foreground whitespace-pre-wrap font-sans leading-relaxed">{summary}</pre>
          : <p className="text-xs text-muted-foreground">Click <strong>Summarize</strong> after adjusting the timeline to generate sprint goals.</p>
        }
      </div>

      <div className="flex justify-end">
        <button
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={!summarized}
          onClick={onApprove}
          title={!summarized ? 'Click Summarize first' : undefined}
        >
          <CheckCircle2 size={16} />
          {summarized ? 'Proceed to Export' : 'Summarize first to continue'}
        </button>
      </div>
    </div>
  );
}
