import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import type { Epic, Dependency, ActionItem, LeaveEntry, Phase, Stakeholder } from '../types';
import { cn } from '../lib/utils';
import { Plus, Trash2, Copy, CheckCircle2, Check, Calendar, Users, Flag, Layers, Save, ChevronDown, ChevronRight, Tag } from 'lucide-react';
import { getHolidaysForRegions, type PublicHoliday } from '../lib/holidays';

const SPRINT_WIDTH = 180;
const ROW_HEIGHT = 40;
const HEADER_HEIGHT = 92;
const DATE_ROW_Y = 64;
const LABEL_WIDTH = 220;
const SPRINTS = [1, 2, 3, 4, 5];
const SPRINT_WEEKS = 2;
const MS_PER_DAY = 86400000;

const PASTEL_COLORS = ['#FFB3C1', '#FFDAB9', '#FFF0A0', '#C1E8C1', '#A8D8EA', '#D4B8E0', '#FFE0B2', '#B2DFDB'];
const FALLBACK_COLORS = ['#93C5FD', '#A78BFA', '#6EE7B7', '#FCA5A5', '#FCD34D'];

const PHASE_COLORS: Record<Phase['type'], { band: string; label: string }> = {
  'Code Lock':          { band: 'rgba(239,68,68,0.12)',   label: 'bg-red-100 text-red-700 border-red-200' },
  'Moratorium':         { band: 'rgba(249,115,22,0.12)',  label: 'bg-orange-100 text-orange-700 border-orange-200' },
  'Year End Shutdown':  { band: 'rgba(99,102,241,0.14)',  label: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  'Custom':             { band: 'rgba(34,197,94,0.12)',   label: 'bg-green-100 text-green-700 border-green-200' },
};

interface FeatSched { startSprint: number; endSprint: number; }
interface MilestoneEntry { id: string; date: string; label: string; }

interface Props {
  epics: Epic[];
  dependencies: Dependency[];
  actionItems: ActionItem[];
  projectStartDate: string;
  forecastedEndDate?: string;
  stakeholders: Stakeholder[];
  phases: Phase[];
  onActionItemsChange: (items: ActionItem[]) => void;
  onSummaryChange?: (summary: string) => void;
  onPhasesChange: (phases: Phase[]) => void;
  onApprove: () => void;
}


function sprintStartDate(ganttStart: Date, sprintNum: number): Date {
  const d = new Date(ganttStart);
  d.setDate(d.getDate() + (sprintNum - 1) * SPRINT_WEEKS * 7);
  return d;
}

function fmtDate(date: Date): string {
  return date.toLocaleDateString('en-SG', { day: 'numeric', month: 'short' });
}

function fmtDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function depAutoColor(count: number): string {
  if (count === 0) return '#bbf7d0';
  if (count === 1) return '#fef08a';
  return '#fecaca';
}

export function Timeline({
  epics, dependencies, actionItems, projectStartDate, forecastedEndDate = '', stakeholders, phases,
  onActionItemsChange, onSummaryChange, onPhasesChange, onApprove,
}: Props) {
  const [schedule, setSchedule] = useState<Record<string, FeatSched>>(() => {
    const s: Record<string, FeatSched> = {};
    epics.forEach(e => e.features.forEach(f => {
      s[f.id] = { startSprint: f.sprint, endSprint: f.endSprint ?? f.sprint };
    }));
    return s;
  });

  const [milestones, setMilestones] = useState<MilestoneEntry[]>([]);
  const [leaves, setLeaves] = useState<LeaveEntry[]>([]);
  const [summary, setSummary] = useState('');
  const [summarized, setSummarized] = useState(false);
  const [copied, setCopied] = useState(false);
  const [draftPhases, setDraftPhases] = useState<Phase[]>(phases);
  const [phasesDirty, setPhasesDirty] = useState(false);
  const [tagTimelineOpen, setTagTimelineOpen] = useState(false);

  useEffect(() => {
    setDraftPhases(phases);
  }, [phases]);
  const [drag, setDrag] = useState<{ featId: string; mode: 'move' | 'end'; startX: number; orig: FeatSched } | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; holiday: PublicHoliday } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const ganttWrapRef = useRef<HTMLDivElement>(null);
  const [ganttContainerW, setGanttContainerW] = useState(0);

  useEffect(() => {
    const el = ganttWrapRef.current;
    if (!el) return;
    setGanttContainerW(el.offsetWidth);
    const ro = new ResizeObserver(entries => setGanttContainerW(entries[0].contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const featDepCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    dependencies.forEach(d => {
      counts[d.from] = (counts[d.from] ?? 0) + 1;
      counts[d.to] = (counts[d.to] ?? 0) + 1;
    });
    return counts;
  }, [dependencies]);

  const tagData = useMemo(() => {
    const tagSet = new Set<string>();
    const tagSprintMap: Record<string, Set<number>> = {};
    epics.forEach(e => e.features.forEach(f => f.stories.forEach(st => {
      (st.tags ?? []).forEach(tag => {
        tagSet.add(tag);
        if (!tagSprintMap[tag]) tagSprintMap[tag] = new Set();
        tagSprintMap[tag].add(st.sprint);
      });
    })));
    return { allTags: [...tagSet], tagSprintMap };
  }, [epics]);

  // Gantt start: projectStartDate - 7 days, or today-7d
  const ganttStart = useMemo(() => {
    const base = projectStartDate ? new Date(projectStartDate) : new Date();
    base.setDate(base.getDate() - 7);
    return base;
  }, [projectStartDate]);

  const dynSprintW = ganttContainerW > 0
    ? Math.max(80, Math.floor((ganttContainerW - LABEL_WIDTH) / SPRINTS.length))
    : SPRINT_WIDTH;
  const dynTotalW = LABEL_WIDTH + dynSprintW * SPRINTS.length;

  function toX(date: string | Date): number {
    const d = typeof date === 'string' ? new Date(date) : date;
    return LABEL_WIDTH + ((d.getTime() - ganttStart.getTime()) / MS_PER_DAY / 14) * dynSprintW;
  }

  // Holidays from stakeholder geographies
  const geographies = useMemo(() => [...new Set(stakeholders.map(s => s.geography))], [stakeholders]);
  const holidays = useMemo(() => getHolidaysForRegions(geographies), [geographies]);

  const rows = useMemo(() =>
    epics.flatMap((epic, ei) =>
      epic.features.map(feat => ({
        feat, epicTitle: epic.title,
        color: feat.color ?? PASTEL_COLORS[ei % PASTEL_COLORS.length] ?? FALLBACK_COLORS[ei % FALLBACK_COLORS.length],
      }))
    ), [epics]
  );

  const totalW = dynTotalW;
  const totalH = HEADER_HEIGHT + rows.length * ROW_HEIGHT + (leaves.length > 0 ? ROW_HEIGHT : 0) + 4;

  // Sprint-based story points assigned
  const sprintPoints = useMemo(() => {
    const pts: Record<number, number> = {};
    SPRINTS.forEach(s => { pts[s] = 0; });
    epics.forEach(e => e.features.forEach(f => f.stories.forEach(st => {
      if (pts[st.sprint] !== undefined) pts[st.sprint] += st.points ?? 0;
    })));
    return pts;
  }, [epics]);

  // Capacity per sprint: teamSize * 8 minus leave and holiday reductions
  function sprintCapacity(sprint: number): number {
    const totalMembers = stakeholders.reduce((s, sh) => s + sh.teamSize, 0) || 5;
    const base = totalMembers * 8;
    const sprintStart = sprintStartDate(ganttStart, sprint);
    const sprintEnd = new Date(sprintStart.getTime() + SPRINT_WEEKS * 7 * MS_PER_DAY);
    // Leave reduction
    let leaveDays = 0;
    leaves.forEach(l => {
      if (!l.fromDate || !l.toDate) return;
      const from = new Date(l.fromDate);
      const to = new Date(l.toDate);
      const overlapStart = Math.max(from.getTime(), sprintStart.getTime());
      const overlapEnd = Math.min(to.getTime(), sprintEnd.getTime());
      if (overlapEnd > overlapStart) {
        leaveDays += (overlapEnd - overlapStart) / MS_PER_DAY;
      }
    });
    // Holiday reduction (rough: 1 holiday = 1 working day per member)
    let holidayDays = 0;
    holidays.forEach(h => {
      const hd = new Date(h.date);
      if (hd >= sprintStart && hd < sprintEnd) {
        const affectedMembers = stakeholders.filter(s => s.geography === h.region).reduce((s, sh) => s + sh.teamSize, 0);
        holidayDays += affectedMembers;
      }
    });
    return Math.max(0, base - Math.round(leaveDays * 8 / 10) - holidayDays);
  }

  function velocity(sprint: number): string {
    const cap = sprintCapacity(sprint);
    const pts = sprintPoints[sprint] ?? 0;
    if (cap === 0) return '—';
    return `${pts}/${cap}`;
  }

  function populate() {
    const sprintFeats: Record<number, Array<{ title: string; pts: number; epicTitle: string }>> = {};
    SPRINTS.forEach(s => { sprintFeats[s] = []; });
    rows.forEach(({ feat, epicTitle }) => {
      const s = schedule[feat.id] ?? { startSprint: feat.sprint, endSprint: feat.sprint };
      const featPts = feat.stories.reduce((acc, st) => acc + (st.points ?? 0), 0);
      // Attribute points to start sprint for goal purposes
      if (sprintFeats[s.startSprint]) {
        sprintFeats[s.startSprint].push({ title: feat.title, pts: featPts, epicTitle });
      }
    });
    const totalMembers = stakeholders.reduce((s, sh) => s + sh.teamSize, 0) || 5;

    const lines = SPRINTS.map(sp => {
      const cap = sprintCapacity(sp);
      const pts = sprintPoints[sp] ?? 0;
      const velPct = cap > 0 ? Math.round((pts / cap) * 100) : 0;
      const velStr = cap > 0 ? `${pts}/${cap} pts (${velPct}% loaded)` : `${pts} pts`;
      const startD = sprintStartDate(ganttStart, sp);
      const endD = sprintStartDate(ganttStart, sp + 1);
      const featsStarting = sprintFeats[sp] ?? [];

      // Generate sprint goal from features starting this sprint
      let goal = 'Continue delivery';
      if (featsStarting.length === 1) {
        goal = `Deliver "${featsStarting[0].title}" under ${featsStarting[0].epicTitle}`;
      } else if (featsStarting.length > 1) {
        const epics = [...new Set(featsStarting.map(f => f.epicTitle))];
        if (epics.length === 1) {
          goal = `Advance ${featsStarting.length} features in ${epics[0]}`;
        } else {
          goal = `Deliver across ${epics.slice(0, 2).join(' & ')}`;
        }
      }

      const featList = featsStarting.length > 0
        ? featsStarting.map(f => `  • ${f.title} (${f.pts}pt)`).join('\n')
        : '  • No new features starting';

      return [
        `Sprint ${sp}  [${fmtDate(startD)} – ${fmtDate(endD)}]`,
        `  Goal: ${goal}`,
        `  Capacity: ${velStr}`,
        `  Features starting this sprint:`,
        featList,
      ].join('\n');
    });

    const activePhaseLines = phases
      .filter(ph => ph.startDate && ph.endDate)
      .map(ph => `  • ${ph.type}${ph.name ? ` — ${ph.name}` : ''}: ${ph.startDate} → ${ph.endDate}`);

    const text = [
      '=== Release Timeline Summary ===',
      `Team: ${totalMembers} members across ${geographies.join(', ') || 'unspecified regions'}`,
      '',
      lines.join('\n\n'),
      ...(activePhaseLines.length ? ['', '--- Important Phases ---', ...activePhaseLines] : []),
    ].join('\n');

    setSummary(text);
    setSummarized(true);
    onSummaryChange?.(text);
  }

  function copyMOM() {
    navigator.clipboard.writeText(summary).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  // Drag logic (sprint-based, unchanged)
  function onMouseDown(e: React.MouseEvent, featId: string, mode: 'move' | 'end') {
    e.preventDefault();
    const s = schedule[featId] ?? { startSprint: 1, endSprint: 1 };
    setDrag({ featId, mode, startX: e.clientX, orig: { ...s } });
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dSprints = Math.round(dx / dynSprintW);
    setSchedule(prev => {
      const s = { ...drag.orig };
      if (drag.mode === 'move') {
        const len = s.endSprint - s.startSprint;
        const ns = Math.max(1, Math.min(SPRINTS.length - len, s.startSprint + dSprints));
        return { ...prev, [drag.featId]: { startSprint: ns, endSprint: ns + len } };
      } else {
        const ne = Math.max(s.startSprint, Math.min(SPRINTS.length, s.endSprint + dSprints));
        return { ...prev, [drag.featId]: { ...s, endSprint: ne } };
      }
    });
  }

  function onMouseUp() { setDrag(null); }

  // Phase helpers — edits go to draftPhases, only saved to parent on Save click
  function addPhase() {
    const id = `phase-${Date.now()}`;
    setDraftPhases(p => [...p, { id, name: '', startDate: projectStartDate || fmtDateInput(new Date()), endDate: projectStartDate || fmtDateInput(new Date()), type: 'Custom' }]);
    setPhasesDirty(true);
  }
  function setPhase(id: string, fn: (p: Phase) => Phase) {
    setDraftPhases(ps => ps.map(p => p.id === id ? fn(p) : p));
    setPhasesDirty(true);
  }
  function removePhase(id: string) {
    setDraftPhases(ps => ps.filter(p => p.id !== id));
    setPhasesDirty(true);
  }
  function savePhases() {
    onPhasesChange(draftPhases);
    setPhasesDirty(false);
  }

  // Milestone helpers
  function addMilestone() { setMilestones(m => [...m, { id: `ms-${Date.now()}`, date: projectStartDate || fmtDateInput(new Date()), label: '' }]); }
  function setMs(id: string, fn: (m: MilestoneEntry) => MilestoneEntry) { setMilestones(ms => ms.map(m => m.id === id ? fn(m) : m)); }
  function removeMs(id: string) { setMilestones(ms => ms.filter(m => m.id !== id)); }

  // Leave helpers
  function addLeave() { setLeaves(l => [...l, { id: `leave-${Date.now()}`, memberName: '', teamName: '', fromDate: projectStartDate || fmtDateInput(new Date()), toDate: projectStartDate || fmtDateInput(new Date()) }]); }
  function setLeave(id: string, fn: (l: LeaveEntry) => LeaveEntry) { setLeaves(ls => ls.map(l => l.id === id ? fn(l) : l)); }
  function removeLeave(id: string) { setLeaves(ls => ls.filter(l => l.id !== id)); }

  const HolidayDiamond = useCallback(({ h }: { h: PublicHoliday }) => {
    const x = LABEL_WIDTH + ((new Date(h.date).getTime() - ganttStart.getTime()) / MS_PER_DAY / 14) * dynSprintW;
    if (x < LABEL_WIDTH || x > totalW) return null;
    return (
      <g key={`${h.date}-${h.region}`}>
        <rect
          x={x - 6} y={HEADER_HEIGHT - 18}
          width={12} height={12}
          rx={1}
          transform={`rotate(45, ${x}, ${HEADER_HEIGHT - 12})`}
          fill="#f59e0b"
          stroke="#d97706"
          strokeWidth={1}
          style={{ cursor: 'pointer' }}
          onMouseEnter={_e => setTooltip({ x: x, y: HEADER_HEIGHT - 18, holiday: h })}
          onMouseLeave={() => setTooltip(null)}
        />
      </g>
    );
  }, [ganttStart, totalW]);

  return (
    <div className="space-y-5" onMouseMove={onMouseMove} onMouseUp={onMouseUp}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Step 3 — Release Timeline</h2>
          <p className="text-sm text-muted-foreground">Drag features, mark milestones and phases, then populate summary.</p>
        </div>
        <button
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-40"
          onClick={onApprove}
          disabled={!summarized}
          title={!summarized ? 'Click Populate first' : undefined}
        >
          <CheckCircle2 size={16} /> Approve
        </button>
      </div>

      {/* Gantt chart — sticky so it stays visible while scrolling through sections below */}
      <div ref={ganttWrapRef} className="border border-border rounded-lg overflow-hidden bg-card sticky top-[113px] z-10 shadow-sm">
        <div ref={containerRef} style={{ width: '100%', position: 'relative', userSelect: 'none' }}>
          <svg width="100%" height={totalH} viewBox={`0 0 ${totalW} ${totalH}`} preserveAspectRatio="none">
            {/* Phase bands */}
            {draftPhases.map(ph => {
              if (!ph.startDate || !ph.endDate) return null;
              const x1 = Math.max(LABEL_WIDTH, toX(ph.startDate));
              const x2 = Math.min(totalW, toX(ph.endDate) + dynSprintW / 14);
              if (x2 <= x1) return null;
              return (
                <rect key={ph.id} x={x1} y={HEADER_HEIGHT} width={x2 - x1} height={rows.length * ROW_HEIGHT}
                  fill={PHASE_COLORS[ph.type]?.band ?? 'rgba(0,0,0,0.05)'} />
              );
            })}

            {/* Sprint columns header */}
            {SPRINTS.map(sp => {
              const x = LABEL_WIDTH + (sp - 1) * dynSprintW;
              const startD = sprintStartDate(ganttStart, sp);
              const cap = sprintCapacity(sp);
              const pts = sprintPoints[sp] ?? 0;
              const velPct = cap > 0 ? Math.min(100, Math.round((pts / cap) * 100)) : 0;
              const midD = new Date(startD.getTime() + 7 * MS_PER_DAY);
              return (
                <g key={sp}>
                  <rect x={x} y={0} width={dynSprintW} height={HEADER_HEIGHT}
                    fill={sp % 2 === 0 ? '#f9fafb' : '#ffffff'} />
                  <line x1={x} y1={0} x2={x} y2={totalH} stroke="#e5e7eb" strokeWidth={1} />
                  <text x={x + dynSprintW / 2} y={16} textAnchor="middle" fontSize={12} fontWeight={600} fill="#374151">
                    Sprint {sp}
                  </text>
                  <text x={x + dynSprintW / 2} y={28} textAnchor="middle" fontSize={9} fill={velPct > 100 ? '#ef4444' : '#4b5563'}>
                    vel {velocity(sp)} pts
                  </text>
                  {velPct > 0 && (
                    <rect x={x + 8} y={32} width={Math.min(dynSprintW - 16, (dynSprintW - 16) * velPct / 100)} height={4}
                      rx={2} fill={velPct > 100 ? '#ef4444' : velPct > 80 ? '#f59e0b' : '#22c55e'} />
                  )}
                  <rect x={x + 8} y={32} width={dynSprintW - 16} height={4} rx={2} fill="none" stroke="#e5e7eb" strokeWidth={1} />
                  {/* Dates sub-row */}
                  <line x1={x} y1={DATE_ROW_Y} x2={x + dynSprintW} y2={DATE_ROW_Y} stroke="#e5e7eb" strokeWidth={1} />
                  <rect x={x} y={DATE_ROW_Y} width={dynSprintW} height={HEADER_HEIGHT - DATE_ROW_Y} fill={sp % 2 === 0 ? '#eef2ff' : '#f5f7ff'} />
                  <text x={x + dynSprintW / 4} y={DATE_ROW_Y + 15} textAnchor="middle" fontSize={9} fill="#4b5563" fontWeight={500}>
                    {fmtDate(startD)}
                  </text>
                  <line x1={x + dynSprintW / 2} y1={DATE_ROW_Y} x2={x + dynSprintW / 2} y2={HEADER_HEIGHT} stroke="#e5e7eb" strokeWidth={0.5} strokeDasharray="2 2" />
                  <text x={x + dynSprintW * 3 / 4} y={DATE_ROW_Y + 15} textAnchor="middle" fontSize={9} fill="#4b5563" fontWeight={500}>
                    {fmtDate(midD)}
                  </text>
                </g>
              );
            })}

            {/* Right border */}
            <line x1={totalW} y1={0} x2={totalW} y2={totalH} stroke="#e5e7eb" strokeWidth={1} />

            {/* Label column header */}
            <rect x={0} y={0} width={LABEL_WIDTH} height={HEADER_HEIGHT} fill="#f3f4f6" />
            <text x={12} y={HEADER_HEIGHT / 2 + 4} fontSize={12} fontWeight={600} fill="#374151">Feature</text>

            {/* Rows */}
            {rows.map(({ feat, epicTitle }, ri) => {
              const y = HEADER_HEIGHT + ri * ROW_HEIGHT;
              const sch = schedule[feat.id] ?? { startSprint: feat.sprint, endSprint: feat.sprint };
              const barX = LABEL_WIDTH + (sch.startSprint - 1) * dynSprintW + 4;
              const barW = (sch.endSprint - sch.startSprint + 1) * dynSprintW - 8;
              const autoC = depAutoColor(featDepCounts[feat.id] ?? 0);
              const barColor = feat.color ?? autoC;
              return (
                <g key={feat.id}>
                  <rect x={0} y={y} width={totalW} height={ROW_HEIGHT}
                    fill={ri % 2 === 0 ? '#ffffff' : '#fafafa'} />
                  <line x1={0} y1={y + ROW_HEIGHT} x2={totalW} y2={y + ROW_HEIGHT} stroke="#f3f4f6" strokeWidth={1} />
                  <text x={12} y={y + 14} fontSize={10} fill="#6b7280" className="select-none">{epicTitle}</text>
                  <text x={12} y={y + 28} fontSize={11} fontWeight={500} fill="#111827" className="select-none">
                    {feat.title.length > 26 ? feat.title.slice(0, 24) + '…' : feat.title}
                  </text>

                  <rect x={barX} y={y + 8} width={barW} height={ROW_HEIGHT - 16}
                    rx={6} fill={barColor} stroke={barColor} strokeWidth={1}
                    style={{ cursor: 'grab' }}
                    onMouseDown={e => onMouseDown(e, feat.id, 'move')} />
                  <rect x={barX + barW - 8} y={y + 8} width={8} height={ROW_HEIGHT - 16}
                    rx={3} fill={barColor} stroke="rgba(0,0,0,0.15)" strokeWidth={1}
                    style={{ cursor: 'ew-resize' }}
                    onMouseDown={e => onMouseDown(e, feat.id, 'end')} />
                  <text x={barX + 6} y={y + 22} fontSize={10} fill="rgba(0,0,0,0.6)" className="pointer-events-none select-none">
                    {feat.title.length > 18 ? feat.title.slice(0, 16) + '…' : feat.title}
                  </text>
                </g>
              );
            })}

            {/* Leave row label */}
            {leaves.length > 0 && (
              <text x={12} y={HEADER_HEIGHT + rows.length * ROW_HEIGHT + ROW_HEIGHT / 2 + 4}
                fontSize={10} fill="#6b7280" fontWeight={500}>Leave</text>
            )}

            {/* Holiday diamonds */}
            {holidays.map(h => <HolidayDiamond key={`${h.date}-${h.region}`} h={h} />)}

            {/* Milestone red vertical lines */}
            {milestones.filter(m => m.date).map(m => {
              const x = toX(m.date);
              if (x < LABEL_WIDTH || x > totalW) return null;
              return (
                <g key={m.id}>
                  <line x1={x} y1={HEADER_HEIGHT} x2={x} y2={totalH}
                    stroke="#ef4444" strokeWidth={2} strokeDasharray="4 3" />
                  <text x={x + 4} y={HEADER_HEIGHT + 12} fontSize={9} fill="#ef4444" fontWeight={600}>
                    {m.label || 'Milestone'}
                  </text>
                </g>
              );
            })}

            {/* Leave entries on Gantt — thin bands at bottom of chart */}
            {leaves.filter(l => l.fromDate && l.toDate).map((l, li) => {
              const lx1 = Math.max(LABEL_WIDTH, toX(l.fromDate));
              const lx2 = Math.min(totalW, toX(l.toDate) + dynSprintW / 14);
              if (lx2 <= lx1) return null;
              const leaveY = HEADER_HEIGHT + rows.length * ROW_HEIGHT;
              const colors = ['#a5f3fc', '#c4b5fd', '#fde68a', '#bbf7d0', '#fca5a5'];
              const lColor = colors[li % colors.length];
              return (
                <g key={l.id}>
                  <rect x={lx1} y={leaveY + 2} width={lx2 - lx1} height={ROW_HEIGHT - 4}
                    rx={4} fill={lColor} fillOpacity={0.7} stroke={lColor} strokeWidth={1} />
                  <text x={lx1 + 4} y={leaveY + ROW_HEIGHT / 2 + 4} fontSize={8} fill="#374151">
                    {l.memberName || 'Leave'}
                  </text>
                </g>
              );
            })}

            {/* Forecasted end date vertical line */}
            {forecastedEndDate && (() => {
              const fx = toX(forecastedEndDate);
              if (fx < LABEL_WIDTH || fx > totalW) return null;
              return (
                <g key="forecast-end">
                  <line x1={fx} y1={0} x2={fx} y2={totalH} stroke="#8b5cf6" strokeWidth={2} strokeDasharray="6 3" />
                  <rect x={fx - 2} y={4} width={Math.min(90, totalW - fx - 4)} height={16} rx={3} fill="#8b5cf6" fillOpacity={0.85} />
                  <text x={fx + 4} y={15} fontSize={9} fill="white" fontWeight={600}>Forecast End</text>
                </g>
              );
            })()}

            {/* Phase name labels — centered pill over each band */}
            {draftPhases.map(ph => {
              if (!ph.startDate || !ph.endDate) return null;
              const x1 = Math.max(LABEL_WIDTH, toX(ph.startDate));
              const x2 = Math.min(totalW, toX(ph.endDate) + dynSprintW / 14);
              if (x2 <= x1) return null;
              const cx = (x1 + x2) / 2;
              const label = ph.name || ph.type;
              const pillW = Math.min(x2 - x1 - 8, label.length * 7 + 16);
              const phColors: Record<string, string> = {
                'Code Lock': 'rgba(239,68,68,0.75)',
                'Moratorium': 'rgba(249,115,22,0.75)',
                'Year End Shutdown': 'rgba(99,102,241,0.75)',
                'Custom': 'rgba(34,197,94,0.75)',
              };
              const pillColor = phColors[ph.type] ?? 'rgba(0,0,0,0.55)';
              return (
                <g key={`label-${ph.id}`}>
                  <rect
                    x={cx - pillW / 2} y={HEADER_HEIGHT + rows.length * ROW_HEIGHT / 2 - 9}
                    width={pillW} height={18} rx={9}
                    fill={pillColor}
                  />
                  <text
                    x={cx} y={HEADER_HEIGHT + rows.length * ROW_HEIGHT / 2 + 4}
                    textAnchor="middle" fontSize={10} fontWeight={600} fill="white"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}>
                    {label.length > Math.floor(pillW / 7) ? label.slice(0, Math.floor(pillW / 7) - 1) + '…' : label}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Holiday tooltip */}
          {tooltip && (
            <div className="absolute z-50 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl pointer-events-none max-w-[200px]"
              style={{ left: tooltip.x + 8, top: tooltip.y - 8 }}>
              <div className="font-semibold">{tooltip.holiday.name}</div>
              <div className="text-gray-300">{tooltip.holiday.significance}</div>
              <div className="text-amber-300 mt-1">{tooltip.holiday.region} · {tooltip.holiday.date}</div>
            </div>
          )}
        </div>
      </div>

      {/* Important Phases */}
      <div className="border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers size={14} className="text-muted-foreground" />
            <h3 className="text-sm font-medium">Important Phases</h3>
            <span className="text-xs text-muted-foreground">(save to show as bands on timeline)</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={addPhase} className="flex items-center gap-1 text-xs text-primary hover:opacity-80">
              <Plus size={12} /> Add Phase
            </button>
            <button
              onClick={savePhases}
              disabled={!phasesDirty}
              className={cn('flex items-center gap-1 text-xs px-2.5 py-1.5 rounded border transition-colors',
                phasesDirty
                  ? 'bg-primary text-primary-foreground border-primary hover:opacity-90'
                  : 'text-muted-foreground border-border opacity-50 cursor-not-allowed'
              )}
              title="Save phases to update timeline">
              <Save size={12} /> Save
            </button>
          </div>
        </div>
        {draftPhases.length === 0 && (
          <p className="text-xs text-muted-foreground">No phases added. Common ones: Code Lock, Moratorium, Year End Shutdown.</p>
        )}
        <div className="space-y-2">
          {draftPhases.map(ph => (
            <div key={ph.id} className="flex items-center gap-2 flex-wrap">
              <select className="text-xs border border-input rounded px-2 py-1.5 bg-background shrink-0"
                value={ph.type} onChange={e => setPhase(ph.id, p => ({ ...p, type: e.target.value as Phase['type'] }))}>
                <option>Code Lock</option>
                <option>Moratorium</option>
                <option>Year End Shutdown</option>
                <option>Custom</option>
              </select>
              <input className="flex-1 text-xs border border-input rounded px-2 py-1.5 bg-background focus:outline-none min-w-24"
                placeholder="Phase name…" value={ph.name}
                onChange={e => setPhase(ph.id, p => ({ ...p, name: e.target.value }))} />
              <label className="flex items-center gap-1 text-xs text-muted-foreground">
                From
                <input type="date" className="border border-input rounded px-1.5 py-1 bg-background text-xs focus:outline-none"
                  value={ph.startDate} onChange={e => setPhase(ph.id, p => ({ ...p, startDate: e.target.value }))} />
              </label>
              <label className="flex items-center gap-1 text-xs text-muted-foreground">
                To
                <input type="date" className="border border-input rounded px-1.5 py-1 bg-background text-xs focus:outline-none"
                  value={ph.endDate} onChange={e => setPhase(ph.id, p => ({ ...p, endDate: e.target.value }))} />
              </label>
              <span className={cn('text-[10px] px-2 py-0.5 rounded border shrink-0', PHASE_COLORS[ph.type]?.label ?? '')}>
                {ph.type}
              </span>
              <button onClick={() => removePhase(ph.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
        {phasesDirty && (
          <p className="text-xs text-amber-600">Unsaved changes — click Save to update the timeline.</p>
        )}
      </div>

      {/* Milestones */}
      <div className="border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flag size={14} className="text-red-500" />
            <h3 className="text-sm font-medium">Milestones</h3>
            <span className="text-xs text-muted-foreground">(shown as red vertical lines)</span>
          </div>
          <button onClick={addMilestone} className="flex items-center gap-1 text-xs text-primary hover:opacity-80">
            <Plus size={12} /> Add
          </button>
        </div>
        {milestones.length === 0 && (
          <p className="text-xs text-muted-foreground">No milestones yet. Date + label = red line across the full Gantt.</p>
        )}
        <div className="space-y-2">
          {milestones.map(m => (
            <div key={m.id} className="flex items-center gap-2">
              <input type="date" className="border border-input rounded px-2 py-1.5 text-xs bg-background focus:outline-none shrink-0"
                value={m.date} onChange={e => setMs(m.id, x => ({ ...x, date: e.target.value }))} />
              <input className="flex-1 text-xs border border-input rounded px-2 py-1.5 bg-background focus:outline-none"
                placeholder="Milestone label…" value={m.label}
                onChange={e => setMs(m.id, x => ({ ...x, label: e.target.value }))} />
              <button onClick={() => removeMs(m.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Leave Calendar */}
      <div className="border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-muted-foreground" />
            <h3 className="text-sm font-medium">Leave Calendar</h3>
          </div>
          <button onClick={addLeave} className="flex items-center gap-1 text-xs text-primary hover:opacity-80">
            <Plus size={12} /> Add
          </button>
        </div>
        {leaves.length === 0 && (
          <p className="text-xs text-muted-foreground">No leave entries. Leave reduces available sprint capacity.</p>
        )}
        {leaves.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 pr-2 font-medium">Member Name</th>
                  <th className="pb-2 pr-2 font-medium">Team</th>
                  <th className="pb-2 pr-2 font-medium">From</th>
                  <th className="pb-2 pr-2 font-medium">To</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {leaves.map(l => (
                  <tr key={l.id}>
                    <td className="py-1.5 pr-2">
                      {stakeholders.length > 0 ? (
                        <select className="w-full border border-input rounded px-2 py-1 bg-background focus:outline-none"
                          value={l.memberName}
                          onChange={e => {
                            const sh = stakeholders.find(s => s.name === e.target.value);
                            setLeave(l.id, x => ({ ...x, memberName: e.target.value, teamName: sh?.teamName ?? x.teamName }));
                          }}>
                          <option value="">Select member…</option>
                          {stakeholders.map(s => <option key={s.id} value={s.name}>{s.name}{s.role ? ` (${s.role})` : ''}</option>)}
                        </select>
                      ) : (
                        <input className="w-full border border-input rounded px-2 py-1 bg-background focus:outline-none"
                          placeholder="Name…" value={l.memberName}
                          onChange={e => setLeave(l.id, x => ({ ...x, memberName: e.target.value }))} />
                      )}
                    </td>
                    <td className="py-1.5 pr-2">
                      {stakeholders.length > 0 ? (
                        <select className="w-full border border-input rounded px-2 py-1 bg-background focus:outline-none"
                          value={l.teamName}
                          onChange={e => setLeave(l.id, x => ({ ...x, teamName: e.target.value }))}>
                          <option value="">Select team…</option>
                          {[...new Set(stakeholders.map(s => s.teamName).filter(Boolean))].map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      ) : (
                        <input className="w-full border border-input rounded px-2 py-1 bg-background focus:outline-none"
                          placeholder="Team…" value={l.teamName}
                          onChange={e => setLeave(l.id, x => ({ ...x, teamName: e.target.value }))} />
                      )}
                    </td>
                    <td className="py-1.5 pr-2">
                      <input type="date" className="border border-input rounded px-1.5 py-1 bg-background focus:outline-none"
                        value={l.fromDate} onChange={e => setLeave(l.id, x => ({ ...x, fromDate: e.target.value }))} />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input type="date" className="border border-input rounded px-1.5 py-1 bg-background focus:outline-none"
                        value={l.toDate} onChange={e => setLeave(l.id, x => ({ ...x, toDate: e.target.value }))} />
                    </td>
                    <td className="py-1.5">
                      <button onClick={() => removeLeave(l.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Project Phase Timeline — tags mapped to sprints, collapsed by default */}
      {tagData.allTags.length > 0 && (() => {
        const TAG_ROW_H = 32, TAG_HDR_H = 28;
        const totalTagH = TAG_HDR_H + tagData.allTags.length * TAG_ROW_H + 4;
        const TAG_COLORS = ['#dbeafe', '#dcfce7', '#fef9c3', '#fce7f3', '#ede9fe', '#fed7aa'];
        return (
          <div className="border border-border rounded-lg overflow-hidden">
            <button
              className="flex items-center gap-2 w-full px-4 py-3 bg-muted/20 hover:bg-muted/30 text-left"
              onClick={() => setTagTimelineOpen(o => !o)}>
              {tagTimelineOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
              <Tag size={14} className="text-primary" />
              <h3 className="text-sm font-medium">Project Phase Timeline</h3>
              <span className="text-xs text-muted-foreground ml-1">(tag coverage by sprint · click to expand)</span>
              <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{tagData.allTags.length} tags</span>
            </button>
            {tagTimelineOpen && (
              <div className="overflow-x-auto p-2">
                <svg width="100%" viewBox={`0 0 ${totalW} ${totalTagH}`} preserveAspectRatio="none" height={totalTagH}>
                  {SPRINTS.map(sp => {
                    const x = LABEL_WIDTH + (sp - 1) * dynSprintW;
                    const startD = sprintStartDate(ganttStart, sp);
                    return (
                      <g key={sp}>
                        <rect x={x} y={0} width={dynSprintW} height={TAG_HDR_H} fill={sp % 2 === 0 ? '#f9fafb' : '#ffffff'} />
                        <line x1={x} y1={0} x2={x} y2={totalTagH} stroke="#e5e7eb" strokeWidth={1} />
                        <text x={x + dynSprintW / 2} y={18} textAnchor="middle" fontSize={10} fontWeight={600} fill="#374151">Sp {sp}</text>
                        <text x={x + dynSprintW / 2} y={26} textAnchor="middle" fontSize={8} fill="#9ca3af">{fmtDate(startD)}</text>
                      </g>
                    );
                  })}
                  <rect x={0} y={0} width={LABEL_WIDTH} height={TAG_HDR_H} fill="#f3f4f6" />
                  <text x={12} y={TAG_HDR_H / 2 + 5} fontSize={10} fontWeight={600} fill="#374151">Tag / Phase</text>
                  <line x1={0} y1={TAG_HDR_H} x2={totalW} y2={TAG_HDR_H} stroke="#d1d5db" strokeWidth={1} />
                  {tagData.allTags.map((tag, ti) => {
                    const y = TAG_HDR_H + ti * TAG_ROW_H;
                    const sprintsWithTag = SPRINTS.filter(sp => tagData.tagSprintMap[tag]?.has(sp));
                    const tagColor = TAG_COLORS[ti % TAG_COLORS.length];
                    return (
                      <g key={tag}>
                        <rect x={0} y={y} width={totalW} height={TAG_ROW_H} fill={ti % 2 === 0 ? '#ffffff' : '#fafafa'} />
                        <rect x={0} y={y} width={LABEL_WIDTH} height={TAG_ROW_H} fill={ti % 2 === 0 ? '#f9fafb' : '#f3f4f6'} />
                        <text x={12} y={y + TAG_ROW_H / 2 + 4} fontSize={11} fill="#374151" fontWeight={500}>{tag}</text>
                        <line x1={0} y1={y + TAG_ROW_H} x2={totalW} y2={y + TAG_ROW_H} stroke="#f0f0f0" strokeWidth={1} />
                        {sprintsWithTag.map(sp => (
                          <g key={sp}>
                            <rect x={LABEL_WIDTH + (sp - 1) * dynSprintW + 4} y={y + 4}
                              width={dynSprintW - 8} height={TAG_ROW_H - 8}
                              rx={4} fill={tagColor} strokeWidth={1} stroke={tagColor} />
                            <text x={LABEL_WIDTH + (sp - 1) * dynSprintW + dynSprintW / 2} y={y + TAG_ROW_H / 2 + 4}
                              textAnchor="middle" fontSize={9} fill="#374151">{tag}</text>
                          </g>
                        ))}
                      </g>
                    );
                  })}
                </svg>
              </div>
            )}
          </div>
        );
      })()}

      {/* Team Capacity Summary */}
      <div className="border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-muted-foreground" />
          <h3 className="text-sm font-medium">Team Capacity & Velocity</h3>
        </div>
        {stakeholders.length === 0 && (
          <p className="text-xs text-muted-foreground">No stakeholders defined — add teams in Step 1 for capacity calculation.</p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                {['Sprint', 'Capacity (pts)', 'Points assigned', 'Velocity', 'Load bar'].map(h =>
                  <th key={h} className="pb-2 pr-4 font-medium whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {SPRINTS.map(sp => {
                const cap = sprintCapacity(sp);
                const pts = sprintPoints[sp] ?? 0;
                const velPct = cap > 0 ? Math.round((pts / cap) * 100) : 0;
                return (
                  <tr key={sp} className="hover:bg-muted/5">
                    <td className="py-1.5 pr-4 font-medium">Sprint {sp}</td>
                    <td className="py-1.5 pr-4 font-mono">{cap}</td>
                    <td className="py-1.5 pr-4 font-mono">{pts}</td>
                    <td className={cn('py-1.5 pr-4 font-medium', velPct > 100 ? 'text-red-600' : velPct > 80 ? 'text-amber-600' : 'text-green-600')}>
                      {cap > 0 ? `${velPct}%` : '—'}
                    </td>
                    <td className="py-1.5 pr-4">
                      <div className="relative w-32 h-3 bg-muted rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full', velPct > 100 ? 'bg-red-500' : velPct > 80 ? 'bg-amber-400' : 'bg-green-500')}
                          style={{ width: `${Math.min(100, velPct)}%` }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Items */}
      <div className="border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Action Items</h3>
          <button
            className="flex items-center gap-1 text-xs text-primary hover:opacity-80"
            onClick={() => onActionItemsChange([...actionItems, { id: `ai-${Date.now()}`, description: '', owner: '', done: false, nextStep: '', dueDate: '' }])}
          >
            <Plus size={12} /> Add
          </button>
        </div>
        {actionItems.length === 0 && <p className="text-xs text-muted-foreground">No action items.</p>}
        <div className="space-y-2">
          {actionItems.map(ai => (
            <div key={ai.id} className="border border-border/60 rounded-lg p-2.5 space-y-1.5">
              <div className="flex items-center gap-2">
                <button className={cn('shrink-0 w-4 h-4 rounded border flex items-center justify-center',
                  ai.done ? 'bg-primary border-primary' : 'border-border')}
                  onClick={() => onActionItemsChange(actionItems.map(x => x.id === ai.id ? { ...x, done: !x.done } : x))}>
                  {ai.done && <Check size={10} className="text-primary-foreground" />}
                </button>
                <input className={cn('flex-1 text-xs border border-input rounded px-2 py-1 bg-background focus:outline-none', ai.done && 'line-through text-muted-foreground')}
                  placeholder="Action item description…"
                  value={ai.description}
                  onChange={e => onActionItemsChange(actionItems.map(x => x.id === ai.id ? { ...x, description: e.target.value } : x))} />
                <input className="w-28 text-xs border border-input rounded px-2 py-1 bg-background focus:outline-none"
                  placeholder="Owner…" value={ai.owner}
                  onChange={e => onActionItemsChange(actionItems.map(x => x.id === ai.id ? { ...x, owner: e.target.value } : x))} />
                <button onClick={() => onActionItemsChange(actionItems.filter(x => x.id !== ai.id))}
                  className="text-muted-foreground hover:text-destructive shrink-0"><Trash2 size={12} /></button>
              </div>
              <div className="flex items-center gap-2 pl-6">
                <span className="text-[10px] text-muted-foreground shrink-0 w-16">Next step:</span>
                <input className="flex-1 text-xs border border-input rounded px-2 py-0.5 bg-background focus:outline-none"
                  placeholder="Next step / follow-up action…"
                  value={ai.nextStep ?? ''}
                  onChange={e => onActionItemsChange(actionItems.map(x => x.id === ai.id ? { ...x, nextStep: e.target.value } : x))} />
                <span className="text-[10px] text-muted-foreground shrink-0">Due:</span>
                <input type="date" className="text-xs border border-input rounded px-1.5 py-0.5 bg-background focus:outline-none"
                  value={ai.dueDate ?? ''}
                  onChange={e => onActionItemsChange(actionItems.map(x => x.id === ai.id ? { ...x, dueDate: e.target.value } : x))} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Full Dependency Node Diagram with Critical Path */}
      {dependencies.length > 0 && (() => {
        const featMap: Record<string, { title: string; epicTitle: string }> = {};
        epics.forEach(e => e.features.forEach(f => { featMap[f.id] = { title: f.title, epicTitle: e.title }; }));
        const featIds = Object.keys(featMap);
        const next: Record<string, string[]> = {};
        const inDeg: Record<string, number> = {};
        featIds.forEach(id => { next[id] = []; inDeg[id] = 0; });
        dependencies.forEach(d => {
          if (featMap[d.from] && featMap[d.to]) { next[d.from].push(d.to); inDeg[d.to]++; }
        });
        function weight(id: string) { const s = schedule[id] ?? { startSprint: 1, endSprint: 1 }; return s.endSprint - s.startSprint + 1; }

        // Longest-path DP for critical path
        const dist: Record<string, number> = {};
        const prev: Record<string, string | null> = {};
        featIds.forEach(id => { dist[id] = weight(id); prev[id] = null; });
        const inDegCopy = { ...inDeg };
        const bfsQ = featIds.filter(id => inDeg[id] === 0);
        const topoOrder: string[] = [];
        const bfsWork = [...bfsQ];
        while (bfsWork.length) {
          const u = bfsWork.shift()!;
          topoOrder.push(u);
          (next[u] ?? []).forEach(v => {
            if (dist[u] + weight(v) > dist[v]) { dist[v] = dist[u] + weight(v); prev[v] = u; }
            if (--inDegCopy[v] === 0) bfsWork.push(v);
          });
        }
        const inDepsSet = new Set<string>();
        dependencies.forEach(d => { inDepsSet.add(d.from); inDepsSet.add(d.to); });
        const maxNode = [...inDepsSet].reduce((b, id) => (dist[id] ?? 0) > (dist[b] ?? 0) ? id : b, [...inDepsSet][0]);
        const critPath: string[] = [];
        let cur: string | null = maxNode;
        while (cur) { critPath.unshift(cur); cur = prev[cur] ?? null; }
        const critSet = new Set(critPath);

        // Topological layer assignment (longest-path layer)
        const layer: Record<string, number> = {};
        featIds.forEach(id => { layer[id] = 0; });
        topoOrder.forEach(u => { (next[u] ?? []).forEach(v => { layer[v] = Math.max(layer[v] ?? 0, (layer[u] ?? 0) + 1); }); });
        const byLayer: string[][] = [];
        [...inDepsSet].forEach(id => {
          const l = layer[id] ?? 0;
          if (!byLayer[l]) byLayer[l] = [];
          byLayer[l].push(id);
        });

        // Node positions
        const NW = 148, NH = 50, CGAP = 56, RGAP = 10, PAD = 14;
        const nodePos: Record<string, { x: number; y: number }> = {};
        byLayer.forEach((nodes, li) => {
          nodes.forEach((id, ri) => { nodePos[id] = { x: PAD + li * (NW + CGAP), y: PAD + ri * (NH + RGAP) }; });
        });
        const numLayers = byLayer.length;
        const maxRows = Math.max(...byLayer.map(r => r.length));
        const dagW = PAD * 2 + numLayers * (NW + CGAP) - CGAP;
        const dagH = PAD * 2 + maxRows * (NH + RGAP) - RGAP + 20;

        return (
          <div className="border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-medium">Feature Dependency Graph</h3>
              <span className="text-xs text-muted-foreground">{inDepsSet.size} features · {dependencies.length} links</span>
              <span className="text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">
                Critical path: {critPath.length} features · {dist[maxNode] ?? 0} sprints
              </span>
            </div>
            <div className="overflow-x-auto">
              <svg width={dagW} height={dagH}>
                <defs>
                  <marker id="dag-arr-red" markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto">
                    <polygon points="0 0,7 2.5,0 5" fill="#ef4444" />
                  </marker>
                  <marker id="dag-arr-gray" markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto">
                    <polygon points="0 0,7 2.5,0 5" fill="#9ca3af" />
                  </marker>
                </defs>
                {/* Edges */}
                {dependencies.filter(d => nodePos[d.from] && nodePos[d.to]).map(d => {
                  const src = nodePos[d.from];
                  const tgt = nodePos[d.to];
                  const x1 = src.x + NW, y1 = src.y + NH / 2;
                  const x2 = tgt.x, y2 = tgt.y + NH / 2;
                  const dx = Math.max(20, (x2 - x1) / 2);
                  const isCrit = critSet.has(d.from) && critSet.has(d.to);
                  return (
                    <path key={`${d.from}-${d.to}`}
                      d={`M ${x1} ${y1} C ${x1 + dx} ${y1} ${x2 - dx} ${y2} ${x2} ${y2}`}
                      stroke={isCrit ? '#ef4444' : '#9ca3af'} strokeWidth={isCrit ? 2 : 1}
                      fill="none" markerEnd={isCrit ? 'url(#dag-arr-red)' : 'url(#dag-arr-gray)'}
                    />
                  );
                })}
                {/* Nodes */}
                {[...inDepsSet].map(id => {
                  const pos = nodePos[id];
                  if (!pos) return null;
                  const isCrit = critSet.has(id);
                  const title = featMap[id]?.title ?? id;
                  const sp = weight(id);
                  return (
                    <g key={id}>
                      <rect x={pos.x} y={pos.y} width={NW} height={NH} rx={6}
                        fill={isCrit ? '#fee2e2' : '#eff6ff'}
                        stroke={isCrit ? '#ef4444' : '#93c5fd'}
                        strokeWidth={isCrit ? 2 : 1}
                      />
                      <text x={pos.x + NW / 2} y={pos.y + 15} textAnchor="middle" fontSize={9} fontWeight={700} fill={isCrit ? '#7f1d1d' : '#1e40af'}>
                        {title.length > 20 ? title.slice(0, 18) + '…' : title}
                      </text>
                      <text x={pos.x + NW / 2} y={pos.y + 28} textAnchor="middle" fontSize={8} fill={isCrit ? '#991b1b' : '#3b82f6'}>
                        {(featMap[id]?.epicTitle ?? '').length > 22 ? (featMap[id]?.epicTitle ?? '').slice(0, 20) + '…' : (featMap[id]?.epicTitle ?? '')}
                      </text>
                      <text x={pos.x + NW / 2} y={pos.y + 42} textAnchor="middle" fontSize={8} fill={isCrit ? '#b91c1c' : '#6b7280'} fontWeight={500}>
                        {sp} sprint{sp !== 1 ? 's' : ''}{isCrit ? ' ★' : ''}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        );
      })()}

      {/* Timeline Summary */}
      <div className="border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Timeline Summary</h3>
          <div className="flex gap-2">
            <button
              className="flex items-center gap-1.5 text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded hover:opacity-90"
              onClick={populate}>
              <Flag size={12} /> Populate
            </button>
            {summarized && (
              <button className="flex items-center gap-1.5 text-xs border border-border px-3 py-1.5 rounded hover:bg-muted/50"
                onClick={copyMOM}>
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Copied!' : 'Copy for Confluence'}
              </button>
            )}
          </div>
        </div>
        <textarea
          className="w-full h-32 text-xs border border-input rounded px-3 py-2 font-mono bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          value={summary}
          onChange={e => { setSummary(e.target.value); onSummaryChange?.(e.target.value); }}
          placeholder="Click Populate to generate summary…" />
      </div>
    </div>
  );
}
