import { useState, useMemo, useRef, useEffect } from 'react';
import type { Epic, Feature, Story, Task, Dependency, Risk, RaciItem, ActionItem, Bug, Stakeholder } from '../types';
import { confidenceColor, confidenceLabel, cn } from '../lib/utils';
import { ChevronDown, ChevronRight, Plus, Trash2, Link2, AlertTriangle, Users, CheckCircle2, Lock, Palette, Bug as BugIcon, Tag, Calendar, MoveRight } from 'lucide-react';

const SPRINTS = [1, 2, 3, 4, 5];
const PASTEL_COLORS = ['#FFB3C1', '#FFDAB9', '#FFF0A0', '#C1E8C1', '#A8D8EA', '#D4B8E0', '#FFE0B2', '#B2DFDB'];
const DEFAULT_ASSIGNEES = ['Delivery Lead', 'Scrum Master', 'Product Owner'];
const PRESET_TAGS = ['Development', 'Test', 'Support', 'DevOps', 'Design'];

interface Props {
  epics: Epic[];
  dependencies: Dependency[];
  raci: RaciItem[];
  risks: Risk[];
  actionItems: ActionItem[];
  projectStartDate: string;
  forecastedEndDate?: string;
  stakeholders: Stakeholder[];
  onEpicsChange: (epics: Epic[]) => void;
  onDepsChange: (deps: Dependency[]) => void;
  onRaciChange: (raci: RaciItem[]) => void;
  onRisksChange: (risks: Risk[]) => void;
  onActionItemsChange: (items: ActionItem[]) => void;
  onProjectStartDateChange: (d: string) => void;
  onForecastedEndDateChange?: (d: string) => void;
  onApprove: () => void;
}

function featurePoints(feat: Feature): number {
  return (feat.stories ?? []).reduce((s, st) => s + (st.points ?? 0), 0);
}
function epicAutoPoints(epic: Epic): number {
  return (epic.features ?? []).reduce((s, f) => s + featurePoints(f), 0);
}

function SprintSelect({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <select className="text-xs border border-input rounded px-1.5 py-0.5 bg-background font-mono"
      value={value} onChange={e => onChange(Number(e.target.value))}>
      {SPRINTS.map(s => <option key={s} value={s}>Sprint {s}</option>)}
    </select>
  );
}

function ConfChip({ value }: { value: number }) {
  return <span className={`text-xs px-2 py-0.5 rounded-full border ${confidenceColor(value)}`}>{confidenceLabel(value)}</span>;
}

function ItemLabel({ type }: { type: 'EPIC' | 'FEATURE' | 'STORY' | 'BUG' }) {
  const styles = {
    EPIC: 'bg-purple-100 text-purple-700 border-purple-200',
    FEATURE: 'bg-blue-100 text-blue-700 border-blue-200',
    STORY: 'bg-green-100 text-green-700 border-green-200',
    BUG: 'bg-red-100 text-red-700 border-red-200',
  };
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${styles[type]}`}>{type}</span>;
}

function ColorPicker({ color, onChange, locked }: { color?: string; onChange: (c: string) => void; locked?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function close(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  return (
    <div ref={ref} className="relative shrink-0">
      <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => !locked && setOpen(o => !o)}
        title={locked ? 'Color locked (has dependency)' : 'Pick feature color'}>
        <div className="w-4 h-4 rounded-full border border-border" style={{ background: color ?? '#e5e7eb' }} />
        {locked ? <Lock size={10} /> : <Palette size={10} />}
      </button>
      {open && (
        <div className="absolute top-6 left-0 z-20 bg-card border border-border rounded-lg p-2 shadow-lg grid grid-cols-4 gap-1.5">
          {PASTEL_COLORS.map(c => (
            <button key={c} className={cn('w-6 h-6 rounded-full border-2 hover:scale-110 transition-transform', color === c ? 'border-primary' : 'border-transparent')}
              style={{ background: c }} onClick={() => { onChange(c); setOpen(false); }} />
          ))}
        </div>
      )}
    </div>
  );
}

function TagPills({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [custom, setCustom] = useState('');
  function toggle(t: string) {
    onChange(tags.includes(t) ? tags.filter(x => x !== t) : [...tags, t]);
  }
  function addCustom() {
    const t = custom.trim();
    if (t && !tags.includes(t)) { onChange([...tags, t]); }
    setCustom('');
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-1">
      <Tag size={11} className="text-muted-foreground shrink-0" />
      {PRESET_TAGS.map(t => (
        <button key={t} onClick={() => toggle(t)}
          className={cn('text-[10px] px-2 py-0.5 rounded-full border transition-colors',
            tags.includes(t) ? 'bg-primary/10 text-primary border-primary/30' : 'text-muted-foreground border-border hover:border-primary/50')}>
          {t}
        </button>
      ))}
      {tags.filter(t => !PRESET_TAGS.includes(t)).map(t => (
        <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border flex items-center gap-1">
          {t}
          <button onClick={() => onChange(tags.filter(x => x !== t))} className="hover:text-destructive">×</button>
        </span>
      ))}
      <input className="text-[10px] border border-input rounded-full px-2 py-0.5 bg-background w-20 focus:outline-none focus:ring-1 focus:ring-ring"
        placeholder="+ tag…" value={custom}
        onChange={e => setCustom(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && addCustom()}
        onBlur={addCustom} />
    </div>
  );
}

function SectionHeader({ icon, title, open, onToggle, onAdd, addLabel, badge }: {
  icon: React.ReactNode; title: string; open: boolean; onToggle: () => void;
  onAdd?: () => void; addLabel?: string; badge?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <button className="flex items-center gap-2 flex-1 text-left" onClick={onToggle}>
        {open ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
        {icon}
        <h3 className="text-sm font-medium">{title}</h3>
        {badge !== undefined && badge > 0 && (
          <span className="text-xs bg-primary/10 text-primary px-1.5 rounded-full">{badge}</span>
        )}
      </button>
      {onAdd && (
        <button onClick={onAdd} className="flex items-center gap-1 text-xs text-primary hover:opacity-80">
          <Plus size={12} /> {addLabel}
        </button>
      )}
    </div>
  );
}

function depAutoColor(count: number): string {
  if (count === 0) return '#bbf7d0';
  if (count === 1) return '#fef08a';
  return '#fecaca';
}

export function BacklogReview({
  epics, dependencies, raci, risks, projectStartDate, forecastedEndDate = '', stakeholders,
  onEpicsChange, onDepsChange, onRaciChange, onRisksChange,
  onProjectStartDateChange, onForecastedEndDateChange, onApprove,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(epics.map(e => e.id)));
  const [addDepFrom, setAddDepFrom] = useState('');
  const [addDepTo, setAddDepTo] = useState('');
  const [addDepReason, setAddDepReason] = useState('');
  const [depsOpen, setDepsOpen] = useState(true);
  const [risksOpen, setRisksOpen] = useState(true);
  const [raciOpen, setRaciOpen] = useState(true);

  const allFeatures = useMemo(() =>
    epics.flatMap(e => e.features.map(f => ({ id: f.id, title: f.title, color: f.color, epicId: e.id }))),
    [epics]
  );
  const allStoryParents = useMemo(() =>
    epics.flatMap(e => e.features.map(f => ({ id: f.id, title: `${e.title} → ${f.title}`, epicId: e.id }))),
    [epics]
  );
  const featDepCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    dependencies.forEach(d => {
      counts[d.from] = (counts[d.from] ?? 0) + 1;
      counts[d.to] = (counts[d.to] ?? 0) + 1;
    });
    return counts;
  }, [dependencies]);

  function toggle(id: string) {
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  // Epic mutations
  function setEpic(epicId: string, fn: (e: Epic) => Epic) { onEpicsChange(epics.map(e => e.id === epicId ? fn(e) : e)); }
  function setFeat(epicId: string, featId: string, fn: (f: Feature) => Feature) {
    setEpic(epicId, e => ({ ...e, features: e.features.map(f => f.id === featId ? fn(f) : f) }));
  }
  function setStory(epicId: string, featId: string, storyId: string, fn: (s: Story) => Story) {
    setFeat(epicId, featId, f => ({ ...f, stories: f.stories.map(s => s.id === storyId ? fn(s) : s) }));
  }
  function setTask(epicId: string, featId: string, storyId: string, taskId: string, fn: (t: Task) => Task) {
    setStory(epicId, featId, storyId, s => ({ ...s, tasks: (s.tasks ?? []).map(t => t.id === taskId ? fn(t) : t) }));
  }

  function addEpic() {
    const id = `epic-${Date.now()}`;
    onEpicsChange([...epics, { id, title: 'New Epic', description: '', sprint: 1, size: 'L', points: 5, confidence: 0.8, features: [] }]);
    setExpanded(p => new Set([...p, id]));
  }
  function removeEpic(id: string) { onEpicsChange(epics.filter(e => e.id !== id)); }

  function addFeature(epicId: string) {
    const id = `feat-${Date.now()}`;
    setEpic(epicId, e => ({ ...e, features: [...e.features, { id, title: 'New Feature', description: '', sprint: 1, size: 'M', points: 3, confidence: 0.8, stories: [] }] }));
    setExpanded(p => new Set([...p, id]));
  }
  function removeFeature(epicId: string, featId: string) { setEpic(epicId, e => ({ ...e, features: e.features.filter(f => f.id !== featId) })); }

  function moveFeature(epicId: string, featId: string, newEpicId: string) {
    if (epicId === newEpicId) return;
    let feat: Feature | undefined;
    const updated = epics.map(e => {
      if (e.id === epicId) { feat = e.features.find(f => f.id === featId); return { ...e, features: e.features.filter(f => f.id !== featId) }; }
      return e;
    });
    if (!feat) return;
    onEpicsChange(updated.map(e => e.id === newEpicId ? { ...e, features: [...e.features, feat!] } : e));
  }

  function addStory(epicId: string, featId: string) {
    const id = `story-${Date.now()}`;
    setFeat(epicId, featId, f => ({ ...f, stories: [...f.stories, { id, asA: '', iWant: '', soThat: '', sprint: 1, size: 'S', points: 2, confidence: 0.8, assignee: DEFAULT_ASSIGNEES[0], tags: [] }] }));
    setExpanded(p => new Set([...p, id]));
  }
  function removeStory(epicId: string, featId: string, storyId: string) { setFeat(epicId, featId, f => ({ ...f, stories: f.stories.filter(s => s.id !== storyId) })); }

  function moveStory(_epicId: string, featId: string, storyId: string, newFeatId: string) {
    if (featId === newFeatId) return;
    let story: Story | undefined;
    const targetFeat = allFeatures.find(f => f.id === newFeatId);
    if (!targetFeat) return;
    // Remove from source
    const updated = epics.map(e => ({
      ...e,
      features: e.features.map(f => {
        if (f.id === featId) { story = f.stories.find(s => s.id === storyId); return { ...f, stories: f.stories.filter(s => s.id !== storyId) }; }
        return f;
      })
    }));
    if (!story) return;
    // Add to target
    onEpicsChange(updated.map(e => ({
      ...e,
      features: e.features.map(f => f.id === newFeatId ? { ...f, stories: [...f.stories, story!] } : f)
    })));
  }

  function addTask(epicId: string, featId: string, storyId: string) {
    setStory(epicId, featId, storyId, s => ({ ...s, tasks: [...(s.tasks ?? []), { id: `task-${Date.now()}`, title: '', hours: 0 }] }));
  }
  function removeTask(epicId: string, featId: string, storyId: string, taskId: string) {
    setStory(epicId, featId, storyId, s => ({ ...s, tasks: (s.tasks ?? []).filter(t => t.id !== taskId) }));
  }

  function removeBug(epicId: string, bugId: string, featId?: string) {
    if (featId) { setFeat(epicId, featId, f => ({ ...f, bugs: (f.bugs ?? []).filter(b => b.id !== bugId) })); }
    else { setEpic(epicId, e => ({ ...e, bugs: (e.bugs ?? []).filter(b => b.id !== bugId) })); }
  }
  function setBug(epicId: string, bugId: string, fn: (b: Bug) => Bug, featId?: string) {
    if (featId) { setFeat(epicId, featId, f => ({ ...f, bugs: (f.bugs ?? []).map(b => b.id === bugId ? fn(b) : b) })); }
    else { setEpic(epicId, e => ({ ...e, bugs: (e.bugs ?? []).map(b => b.id === bugId ? fn(b) : b) })); }
  }

  function addDep() {
    if (!addDepFrom || !addDepTo || addDepFrom === addDepTo) return;
    onDepsChange([...dependencies, { from: addDepFrom, to: addDepTo, type: 'blocks', reason: addDepReason }]);
    setAddDepFrom(''); setAddDepTo(''); setAddDepReason('');
  }
  function addRisk() {
    onRisksChange([...risks, { id: `risk-${Date.now()}`, description: '', impact: 'Medium', mitigation: '', owner: '', status: 'open' }]);
  }
  function setRisk(id: string, fn: (r: Risk) => Risk) { onRisksChange(risks.map(r => r.id === id ? fn(r) : r)); }
  function removeRisk(id: string) { onRisksChange(risks.filter(r => r.id !== id)); }
  function addRaciRow() { onRaciChange([...raci, { feature: '', accountable: '', responsible: [], consulted: [], informed: [] }]); }
  function setRaciRow(idx: number, fn: (r: RaciItem) => RaciItem) { onRaciChange(raci.map((r, i) => i === idx ? fn(r) : r)); }
  function removeRaciRow(idx: number) { onRaciChange(raci.filter((_, i) => i !== idx)); }

  function BugList({ epic, featId }: { epic: Epic; featId?: string }) {
    const bugList = featId ? (epic.features.find(f => f.id === featId)?.bugs ?? []) : (epic.bugs ?? []);
    if (bugList.length === 0) return null;
    const bugOpen = expanded.has(`bugs-${epic.id}-${featId ?? ''}`);
    return (
      <div className="mt-1">
        <button className="flex items-center gap-1 text-xs text-red-600 hover:opacity-80"
          onClick={() => toggle(`bugs-${epic.id}-${featId ?? ''}`)}>
          <BugIcon size={11} />
          <span>Bugs {bugList.length > 0 ? `(${bugList.length})` : ''}</span>
          {bugOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        </button>
        {bugOpen && (
          <div className="mt-1.5 space-y-1.5 ml-4">
            {bugList.length === 0 && (
              <p className="text-xs text-muted-foreground italic">No bugs raised in meeting.</p>
            )}
            {bugList.map(bug => (
              <div key={bug.id} className="flex items-center gap-2 text-xs bg-red-50/50 border border-red-100 rounded px-2 py-1.5">
                <ItemLabel type="BUG" />
                <select className="text-[10px] border border-input rounded px-1 py-0.5 bg-background shrink-0"
                  value={bug.severity} onChange={e => setBug(epic.id, bug.id, b => ({ ...b, severity: e.target.value as Bug['severity'] }), featId)}>
                  {['Critical', 'High', 'Medium', 'Low'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <input className="flex-1 border border-input rounded px-2 py-0.5 bg-background focus:outline-none"
                  placeholder="Bug title…" value={bug.title}
                  onChange={e => setBug(epic.id, bug.id, b => ({ ...b, title: e.target.value }), featId)} />
                <input className="w-28 border border-input rounded px-1.5 py-0.5 bg-background focus:outline-none"
                  placeholder="Assignee…" value={bug.assignee ?? ''}
                  onChange={e => setBug(epic.id, bug.id, b => ({ ...b, assignee: e.target.value }), featId)} />
                <button onClick={() => removeBug(epic.id, bug.id, featId)} className="text-muted-foreground hover:text-destructive shrink-0"><Trash2 size={11} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Step 2 — Backlog Review</h2>
          <p className="text-sm text-muted-foreground">Review hierarchy, edit inline, adjust sprints, assign stories.</p>
        </div>
        <button
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={onApprove}
          disabled={!projectStartDate}
          title={!projectStartDate ? 'Set a planned start date first' : undefined}
        >
          <CheckCircle2 size={16} /> Approve
        </button>
      </div>

      {/* Mandatory planned start date */}
      <div className="flex gap-3 flex-wrap">
        <div className={cn('flex-1 min-w-[280px] border rounded-lg p-4 space-y-2', !projectStartDate ? 'border-amber-400 bg-amber-50/50' : 'border-green-300 bg-green-50/30')}>
          <div className="flex items-center gap-2">
            <Calendar size={15} className={projectStartDate ? 'text-green-600' : 'text-amber-600'} />
            <span className="text-sm font-semibold">Planned Start Date</span>
            <span className={cn('text-xs px-2 py-0.5 rounded-full', !projectStartDate ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700')}>
              {projectStartDate ? 'Set ✓' : 'Required'}
            </span>
          </div>
          <input
            type="date"
            className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            value={projectStartDate}
            onChange={e => onProjectStartDateChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Sets baseline for sprint columns and capacity.</p>
        </div>

        <div className="flex-1 min-w-[280px] border border-border rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Calendar size={15} className="text-muted-foreground" />
            <span className="text-sm font-semibold">Forecasted End Date</span>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">optional</span>
          </div>
          <input
            type="date"
            className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            value={forecastedEndDate}
            onChange={e => onForecastedEndDateChange?.(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Displays the calendar "until" date in the Release Timeline view.</p>
        </div>
      </div>

      {/* Hierarchy */}
      <div className="border border-border rounded-lg divide-y divide-border">
        {epics.map(epic => {
          const autopts = epicAutoPoints(epic);
          const pts = epic.pointsOverridden ? epic.points : autopts;
          const epicOpen = expanded.has(epic.id);

          return (
            <div key={epic.id}>
              {/* Epic row */}
              <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/20 hover:bg-muted/30 flex-wrap">
                <button onClick={() => toggle(epic.id)} className="shrink-0 text-muted-foreground">{epicOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button>
                <ItemLabel type="EPIC" />
                <input className="flex-1 font-semibold text-sm bg-transparent focus:outline-none min-w-0"
                  value={epic.title}
                  onChange={e => setEpic(epic.id, ep => ({ ...ep, title: e.target.value }))}
                  placeholder="Epic title" />
                <SprintSelect value={epic.sprint} onChange={v => setEpic(epic.id, ep => ({ ...ep, sprint: v }))} />
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    className={cn('w-12 text-xs text-right border rounded px-1 py-0.5 font-mono focus:outline-none',
                      epic.pointsOverridden ? 'border-amber-400 text-amber-600 bg-amber-50' : 'border-input bg-background text-muted-foreground')}
                    type="number" min={0} value={pts}
                    onChange={e => setEpic(epic.id, ep => ({ ...ep, points: Number(e.target.value), pointsOverridden: true }))} />
                  <span className="text-xs text-muted-foreground">pt</span>
                  {epic.pointsOverridden && (
                    <button className="text-xs text-amber-500" title="Reset to auto"
                      onClick={() => setEpic(epic.id, ep => ({ ...ep, points: autopts, pointsOverridden: false }))}>↺</button>
                  )}
                </div>
                <ConfChip value={epic.confidence} />
                <button onClick={() => addFeature(epic.id)} className="flex items-center gap-1 text-xs text-primary hover:opacity-80 shrink-0"><Plus size={12} /> Feature</button>
                <button onClick={() => removeEpic(epic.id)} className="text-muted-foreground hover:text-destructive shrink-0"><Trash2 size={14} /></button>
              </div>

              {epicOpen && (
                <div className="pl-4 pb-1">
                  <BugList epic={epic} />
                  {epic.features.map(feat => {
                    const featPts = featurePoints(feat);
                    const featOpen = expanded.has(feat.id);
                    const autoColor = depAutoColor(featDepCounts[feat.id] ?? 0);
                    const displayColor = feat.color ?? autoColor;

                    return (
                      <div key={feat.id} className="border-t border-border/40">
                        <div className="flex items-center gap-2 px-3 py-2 pl-5 bg-background hover:bg-muted/10 flex-wrap"
                          style={{ borderLeft: `3px solid ${displayColor}` }}>
                          <button onClick={() => toggle(feat.id)} className="shrink-0 text-muted-foreground">{featOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</button>
                          <ItemLabel type="FEATURE" />
                          <ColorPicker color={displayColor} locked={false}
                            onChange={c => setFeat(epic.id, feat.id, f => ({ ...f, color: c }))} />
                          <input className="flex-1 text-sm bg-transparent focus:outline-none min-w-0"
                            value={feat.title}
                            onChange={e => setFeat(epic.id, feat.id, f => ({ ...f, title: e.target.value }))}
                            placeholder="Feature title" />
                          <SprintSelect value={feat.sprint} onChange={v => setFeat(epic.id, feat.id, f => ({ ...f, sprint: v }))} />
                          <input type="date" className="text-xs border border-input rounded px-1.5 py-0.5 bg-background focus:outline-none w-32"
                            value={feat.plannedStartDate ?? ''} title="Planned start date"
                            onChange={e => setFeat(epic.id, feat.id, f => ({ ...f, plannedStartDate: e.target.value || undefined }))} />
                          <span className="text-xs font-mono text-muted-foreground w-12 text-right shrink-0">{featPts}pt</span>
                          <button onClick={() => addStory(epic.id, feat.id)} className="flex items-center gap-1 text-xs text-primary hover:opacity-80 shrink-0"><Plus size={12} /> Story</button>
                          <button onClick={() => removeFeature(epic.id, feat.id)} className="text-muted-foreground hover:text-destructive shrink-0"><Trash2 size={13} /></button>
                        </div>

                        {featOpen && (
                          <div className="pl-8">
                            {/* Move feature */}
                            <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground">
                              <MoveRight size={11} />
                              <span>Move to Epic:</span>
                              <select className="border border-input rounded px-1.5 py-0.5 bg-background text-xs"
                                value={epic.id}
                                onChange={e => moveFeature(epic.id, feat.id, e.target.value)}>
                                {epics.map(ep => <option key={ep.id} value={ep.id}>{ep.title}</option>)}
                              </select>
                            </div>
                            <BugList epic={epic} featId={feat.id} />

                            {feat.stories.map(story => {
                              const taskHrs = (story.tasks ?? []).reduce((s, t) => s + (t.hours ?? 0), 0);
                              const storyOpen = expanded.has(story.id);

                              return (
                                <div key={story.id} className="border-t border-border/20">
                                  <div className="flex items-center gap-2 px-3 py-2 pl-8 bg-background hover:bg-muted/5 flex-wrap">
                                    <button onClick={() => toggle(story.id)} className="shrink-0 text-muted-foreground">{storyOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</button>
                                    <ItemLabel type="STORY" />
                                    <span className="flex-1 text-xs text-muted-foreground truncate min-w-0">
                                      As {story.asA || '…'}, I want {story.iWant || '…'}
                                    </span>
                                    <SprintSelect value={story.sprint} onChange={v => setStory(epic.id, feat.id, story.id, s => ({ ...s, sprint: v }))} />
                                    <input type="date" className="text-xs border border-input rounded px-1.5 py-0.5 bg-background focus:outline-none w-32"
                                      value={story.plannedStartDate ?? ''} title="Planned start date"
                                      onChange={e => setStory(epic.id, feat.id, story.id, s => ({ ...s, plannedStartDate: e.target.value || undefined }))} />
                                    <div className="flex items-center gap-1 shrink-0">
                                      <input className="w-10 text-xs text-right border border-input rounded px-1 py-0.5 font-mono bg-background focus:outline-none"
                                        type="number" min={0} value={story.points}
                                        onChange={e => setStory(epic.id, feat.id, story.id, s => ({ ...s, points: Number(e.target.value) }))} />
                                      <span className="text-xs text-muted-foreground">pt</span>
                                      {taskHrs > 0 && <span className="text-xs text-muted-foreground">({taskHrs}h)</span>}
                                    </div>
                                    <ConfChip value={story.confidence} />
                                    <button onClick={() => removeStory(epic.id, feat.id, story.id)} className="text-muted-foreground hover:text-destructive shrink-0"><Trash2 size={12} /></button>
                                  </div>

                                  {storyOpen && (
                                    <div className="pl-12 pr-4 pb-3 pt-1 space-y-2 bg-muted/5">
                                      {/* Move story */}
                                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <MoveRight size={11} />
                                        <span>Move to Feature:</span>
                                        <select className="border border-input rounded px-1.5 py-0.5 bg-background text-xs"
                                          value={feat.id}
                                          onChange={e => moveStory(epic.id, feat.id, story.id, e.target.value)}>
                                          {allStoryParents.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
                                        </select>
                                      </div>
                                      <div className="grid gap-1 text-xs">
                                        {(['asA', 'iWant', 'soThat'] as const).map(field => (
                                          <label key={field} className="flex gap-2 items-center">
                                            <span className="text-muted-foreground w-14 shrink-0">
                                              {field === 'asA' ? 'As a' : field === 'iWant' ? 'I want' : 'So that'}
                                            </span>
                                            <input className="flex-1 border border-input rounded px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                                              value={story[field]}
                                              onChange={e => setStory(epic.id, feat.id, story.id, s => ({ ...s, [field]: e.target.value }))} />
                                          </label>
                                        ))}
                                        <label className="flex gap-2 items-center">
                                          <span className="text-muted-foreground w-14 shrink-0">Assigned to</span>
                                          <input className="flex-1 border border-input rounded px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                                            value={story.assignee ?? ''} placeholder={DEFAULT_ASSIGNEES[0]}
                                            onChange={e => setStory(epic.id, feat.id, story.id, s => ({ ...s, assignee: e.target.value }))} />
                                          <select className="text-xs border border-input rounded px-1.5 py-1 bg-background"
                                            onChange={e => { if (e.target.value) setStory(epic.id, feat.id, story.id, s => ({ ...s, assignee: e.target.value })); }}
                                            value="">
                                            <option value="">Defaults…</option>
                                            {DEFAULT_ASSIGNEES.map(a => <option key={a} value={a}>{a}</option>)}
                                          </select>
                                        </label>
                                      </div>
                                      <label className="flex gap-2 items-center">
                                          <span className="text-muted-foreground w-14 shrink-0">MoSCoW</span>
                                          <select
                                            className={cn('flex-1 border rounded px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-ring text-xs',
                                              !story.moscow ? 'border-amber-400 bg-amber-50/30' : 'border-input')}
                                            value={story.moscow ?? ''}
                                            onChange={e => setStory(epic.id, feat.id, story.id, s => ({ ...s, moscow: e.target.value || undefined }))}>
                                            <option value="">— select priority —</option>
                                            <option value="Must Have">Must Have</option>
                                            <option value="Should Have">Should Have</option>
                                            <option value="Could Have">Could Have</option>
                                            <option value="Won't Have">Won&apos;t Have</option>
                                          </select>
                                        </label>
                                      <TagPills tags={story.tags ?? []}
                                        onChange={tags => setStory(epic.id, feat.id, story.id, s => ({ ...s, tags }))} />
                                      {/* Tasks */}
                                      <div className="space-y-1.5 pt-1">
                                        {(story.tasks ?? []).map(task => (
                                          <div key={task.id} className="flex items-center gap-2">
                                            <span className="text-muted-foreground text-xs">•</span>
                                            <input className="flex-1 text-xs border border-input rounded px-2 py-1 bg-background focus:outline-none"
                                              placeholder="Task description" value={task.title}
                                              onChange={e => setTask(epic.id, feat.id, story.id, task.id, t => ({ ...t, title: e.target.value }))} />
                                            <input className="w-14 text-xs text-right border border-input rounded px-1.5 py-1 font-mono bg-background focus:outline-none"
                                              type="number" min={0} value={task.hours ?? 0}
                                              onChange={e => setTask(epic.id, feat.id, story.id, task.id, t => ({ ...t, hours: Number(e.target.value) }))} />
                                            <span className="text-xs text-muted-foreground shrink-0">h</span>
                                            <button onClick={() => removeTask(epic.id, feat.id, story.id, task.id)}
                                              className="text-muted-foreground hover:text-destructive shrink-0"><Trash2 size={12} /></button>
                                          </div>
                                        ))}
                                        <button className="flex items-center gap-1 text-xs text-primary hover:opacity-80 ml-3"
                                          onClick={() => addTask(epic.id, feat.id, story.id)}>
                                          <Plus size={12} /> Add task
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button onClick={addEpic}
        className="flex items-center gap-1.5 text-sm text-primary hover:opacity-80 border border-dashed border-primary/40 rounded-md px-3 py-2 w-full justify-center hover:bg-primary/5">
        <Plus size={14} /> Add Epic
      </button>

      {/* Dependencies */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="p-4 space-y-3">
          <SectionHeader icon={<Link2 size={14} className="text-muted-foreground" />} title="Dependencies"
            open={depsOpen} onToggle={() => setDepsOpen(o => !o)}
            onAdd={addDep} addLabel="Add" badge={dependencies.length} />
          {depsOpen && (
            <>
              <div className="space-y-2">
                {dependencies.length === 0 && <p className="text-xs text-muted-foreground">No dependencies yet.</p>}
                {dependencies.map((dep, i) => {
                  const from = allFeatures.find(f => f.id === dep.from);
                  const to = allFeatures.find(f => f.id === dep.to);
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs rounded px-2 py-1.5 border border-border/60"
                      style={{ background: from?.color ? `${from.color}30` : undefined }}>
                      <div className="flex items-center gap-1.5 font-medium truncate">
                        {from?.color && <div className="w-3 h-3 rounded-full shrink-0" style={{ background: from.color }} />}
                        <span className="truncate">{from?.title ?? dep.from}</span>
                      </div>
                      <span className="text-muted-foreground shrink-0">blocks</span>
                      <div className="flex items-center gap-1.5 font-medium truncate">
                        {to?.color && <div className="w-3 h-3 rounded-full shrink-0" style={{ background: to.color }} />}
                        <span className="truncate">{to?.title ?? dep.to}</span>
                      </div>
                      <input className="flex-1 border border-input rounded px-1.5 py-0.5 bg-background text-xs min-w-0"
                        placeholder="Reason…" value={dep.reason}
                        onChange={e => onDepsChange(dependencies.map((d, j) => j === i ? { ...d, reason: e.target.value } : d))} />
                      <button onClick={() => onDepsChange(dependencies.filter((_, j) => j !== i))}
                        className="ml-auto text-muted-foreground hover:text-destructive shrink-0"><Trash2 size={12} /></button>
                    </div>
                  );
                })}
              </div>
              <div className="grid gap-2">
                <div className="flex items-center gap-2">
                  <select className="flex-1 text-xs border border-input rounded px-2 py-1.5 bg-background"
                    value={addDepFrom} onChange={e => setAddDepFrom(e.target.value)}>
                    <option value="">From feature…</option>
                    {allFeatures.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
                  </select>
                  <span className="text-xs text-muted-foreground shrink-0">blocks</span>
                  <select className="flex-1 text-xs border border-input rounded px-2 py-1.5 bg-background"
                    value={addDepTo} onChange={e => setAddDepTo(e.target.value)}>
                    <option value="">To feature…</option>
                    {allFeatures.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input className="flex-1 text-xs border border-input rounded px-2 py-1.5 bg-background focus:outline-none"
                    placeholder="Reason / dependency description (required)…"
                    value={addDepReason} onChange={e => setAddDepReason(e.target.value)} />
                  <button
                    className="flex items-center gap-1 text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded hover:opacity-90 disabled:opacity-50 shrink-0"
                    onClick={addDep} disabled={!addDepFrom || !addDepTo || addDepFrom === addDepTo || !addDepReason.trim()}>
                    <Plus size={12} /> Add
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Risks */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="p-4 space-y-3">
          <SectionHeader icon={<AlertTriangle size={14} className="text-amber-500" />} title="Risks"
            open={risksOpen} onToggle={() => setRisksOpen(o => !o)}
            onAdd={addRisk} addLabel="Add Risk" badge={risks.length} />
          {risksOpen && (
            <>
              {risks.length === 0 && <p className="text-xs text-muted-foreground">No risks identified.</p>}
              {risks.map(risk => (
                <div key={risk.id} className="grid gap-2 p-3 border border-border/60 rounded-lg bg-muted/5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium shrink-0',
                      risk.impact === 'High' ? 'bg-red-100 text-red-700' : risk.impact === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                    )}>{risk.impact}</span>
                    <input className="flex-1 text-sm border border-input rounded px-2 py-1 bg-background focus:outline-none"
                      placeholder="Risk description…" value={risk.description}
                      onChange={e => setRisk(risk.id, r => ({ ...r, description: e.target.value }))} />
                    <select className="text-xs border border-input rounded px-1.5 py-1 bg-background shrink-0"
                      value={risk.impact} onChange={e => setRisk(risk.id, r => ({ ...r, impact: e.target.value as Risk['impact'] }))}>
                      <option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option>
                    </select>
                    <select className="text-xs border border-input rounded px-1.5 py-1 bg-background shrink-0"
                      value={risk.status} onChange={e => setRisk(risk.id, r => ({ ...r, status: e.target.value as Risk['status'] }))}>
                      <option value="open">Open</option><option value="mitigated">Mitigated</option>
                    </select>
                    <button onClick={() => removeRisk(risk.id)} className="text-muted-foreground hover:text-destructive shrink-0"><Trash2 size={13} /></button>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <input className="flex-1 border border-input rounded px-2 py-1 bg-background focus:outline-none"
                      placeholder="Mitigation…" value={risk.mitigation}
                      onChange={e => setRisk(risk.id, r => ({ ...r, mitigation: e.target.value }))} />
                    <select className="w-36 text-xs border border-input rounded px-2 py-1 bg-background focus:outline-none"
                      value={risk.owner}
                      onChange={e => setRisk(risk.id, r => ({ ...r, owner: e.target.value }))}>
                      <option value="">Owner…</option>
                      {stakeholders.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                      {risk.owner && !stakeholders.some(s => s.name === risk.owner) && (
                        <option value={risk.owner}>{risk.owner}</option>
                      )}
                    </select>
                    <input type="date" className="border border-input rounded px-2 py-1 bg-background focus:outline-none w-34"
                      title="Due date" value={risk.dueDate ?? ''}
                      onChange={e => setRisk(risk.id, r => ({ ...r, dueDate: e.target.value || undefined }))} />
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* RACI Matrix */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="p-4 space-y-3">
          <SectionHeader icon={<Users size={14} className="text-muted-foreground" />} title="RACI Matrix"
            open={raciOpen} onToggle={() => setRaciOpen(o => !o)}
            onAdd={addRaciRow} addLabel="Add Row" badge={raci.length} />
          {raciOpen && (
            <>
              {raci.length === 0 && <p className="text-xs text-muted-foreground">No RACI entries yet.</p>}
              {raci.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        {['Feature', 'Responsible', 'Accountable', 'Consulted', 'Informed', ''].map(h =>
                          <th key={h} className="text-left py-1.5 px-2 text-muted-foreground font-medium">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {raci.map((row, idx) => (
                        <tr key={idx} className="hover:bg-muted/5">
                          <td className="py-1.5 px-2">
                            <select className="w-full border border-input rounded px-1.5 py-0.5 bg-background"
                              value={row.feature} onChange={e => setRaciRow(idx, r => ({ ...r, feature: e.target.value }))}>
                              <option value="">Select…</option>
                              {allFeatures.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
                            </select>
                          </td>
                          {(['responsible', 'accountable', 'consulted', 'informed'] as const).map(col => (
                            <td key={col} className="py-1.5 px-2">
                              <input className="w-full border border-input rounded px-1.5 py-0.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                                value={Array.isArray(row[col]) ? (row[col] as string[]).join(', ') : row[col] as string}
                                onChange={e => setRaciRow(idx, r => ({
                                  ...r,
                                  [col]: col === 'accountable' ? e.target.value : e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                                }))} />
                            </td>
                          ))}
                          <td className="py-1.5 px-2">
                            <button onClick={() => removeRaciRow(idx)} className="text-muted-foreground hover:text-destructive"><Trash2 size={12} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Bottom Approve button */}
      <div className="flex justify-end pt-2">
        <button
          className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={onApprove}
          disabled={!projectStartDate}
          title={!projectStartDate ? 'Set a planned start date first' : undefined}
        >
          <CheckCircle2 size={16} /> Approve & Proceed to Timeline
        </button>
      </div>
    </div>
  );
}
