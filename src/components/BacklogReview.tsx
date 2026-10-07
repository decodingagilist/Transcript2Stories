import { useState, useMemo } from 'react';
import type { Epic, Feature, Story, Task, Dependency } from '../types';
import { confidenceColor, confidenceLabel, cn } from '../lib/utils';
import { ChevronDown, ChevronRight, Plus, Trash2, Link2, CheckCircle2 } from 'lucide-react';

const SPRINTS = [1, 2, 3, 4, 5];

interface Props {
  epics: Epic[];
  dependencies: Dependency[];
  onEpicsChange: (epics: Epic[]) => void;
  onDepsChange: (deps: Dependency[]) => void;
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
    <select
      className="text-xs border border-input rounded px-1.5 py-0.5 bg-background font-mono"
      value={value}
      onChange={e => onChange(Number(e.target.value))}
    >
      {SPRINTS.map(s => <option key={s} value={s}>Sprint {s}</option>)}
    </select>
  );
}

function ConfChip({ value }: { value: number }) {
  return <span className={`text-xs px-2 py-0.5 rounded-full border ${confidenceColor(value)}`}>{confidenceLabel(value)}</span>;
}

export function BacklogReview({ epics, dependencies, onEpicsChange, onDepsChange, onApprove }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(epics.map(e => e.id)));
  const [addDepFrom, setAddDepFrom] = useState('');
  const [addDepTo, setAddDepTo] = useState('');

  const allFeatures = useMemo(() =>
    epics.flatMap(e => e.features.map(f => ({ id: f.id, title: f.title }))),
    [epics]
  );

  function toggle(id: string) {
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function setEpic(epicId: string, fn: (e: Epic) => Epic) {
    onEpicsChange(epics.map(e => e.id === epicId ? fn(e) : e));
  }
  function setFeat(epicId: string, featId: string, fn: (f: Feature) => Feature) {
    setEpic(epicId, e => ({ ...e, features: e.features.map(f => f.id === featId ? fn(f) : f) }));
  }
  function setStory(epicId: string, featId: string, storyId: string, fn: (s: Story) => Story) {
    setFeat(epicId, featId, f => ({ ...f, stories: f.stories.map(s => s.id === storyId ? fn(s) : s) }));
  }
  function setTask(epicId: string, featId: string, storyId: string, taskId: string, fn: (t: Task) => Task) {
    setStory(epicId, featId, storyId, s => ({ ...s, tasks: (s.tasks ?? []).map(t => t.id === taskId ? fn(t) : t) }));
  }

  function addTask(epicId: string, featId: string, storyId: string) {
    setStory(epicId, featId, storyId, s => ({
      ...s, tasks: [...(s.tasks ?? []), { id: `task-${Date.now()}`, title: '', hours: 0 }]
    }));
  }
  function removeTask(epicId: string, featId: string, storyId: string, taskId: string) {
    setStory(epicId, featId, storyId, s => ({ ...s, tasks: (s.tasks ?? []).filter(t => t.id !== taskId) }));
  }

  function addDep() {
    if (!addDepFrom || !addDepTo || addDepFrom === addDepTo) return;
    onDepsChange([...dependencies, { from: addDepFrom, to: addDepTo, type: 'blocks', reason: '' }]);
    setAddDepFrom(''); setAddDepTo('');
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Step 2 — Backlog Review</h2>
          <p className="text-sm text-muted-foreground">Review the full hierarchy. Edit inline, adjust sprints, add tasks.</p>
        </div>
        <button
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:opacity-90"
          onClick={onApprove}
        >
          <CheckCircle2 size={16} /> Approve
        </button>
      </div>

      <div className="border border-border rounded-lg divide-y divide-border">
        {epics.map(epic => {
          const autopts = epicAutoPoints(epic);
          const pts = epic.pointsOverridden ? epic.points : autopts;
          const epicOpen = expanded.has(epic.id);

          return (
            <div key={epic.id}>
              {/* Epic row */}
              <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/20 hover:bg-muted/30">
                <button onClick={() => toggle(epic.id)} className="shrink-0 text-muted-foreground">
                  {epicOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                <input
                  className="flex-1 font-semibold text-sm bg-transparent focus:outline-none min-w-0"
                  value={epic.title}
                  onChange={e => setEpic(epic.id, ep => ({ ...ep, title: e.target.value }))}
                  placeholder="Epic title"
                />
                <SprintSelect value={epic.sprint} onChange={v => setEpic(epic.id, ep => ({ ...ep, sprint: v }))} />
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    className={cn(
                      'w-12 text-xs text-right border rounded px-1 py-0.5 font-mono focus:outline-none focus:ring-1 focus:ring-ring',
                      epic.pointsOverridden
                        ? 'border-amber-400 text-amber-600 bg-amber-50 dark:bg-amber-950'
                        : 'border-input bg-background text-muted-foreground'
                    )}
                    type="number" min={0} value={pts}
                    title={epic.pointsOverridden ? `Auto: ${autopts}pt — manually overridden` : `${autopts}pt (auto-calculated)`}
                    onChange={e => setEpic(epic.id, ep => ({ ...ep, points: Number(e.target.value), pointsOverridden: true }))}
                  />
                  <span className="text-xs text-muted-foreground">pt</span>
                  {epic.pointsOverridden && (
                    <button className="text-xs text-amber-500 hover:text-amber-700" title="Reset to auto"
                      onClick={() => setEpic(epic.id, ep => ({ ...ep, points: autopts, pointsOverridden: false }))}>↺</button>
                  )}
                </div>
                <ConfChip value={epic.confidence} />
              </div>

              {epicOpen && epic.features.map(feat => {
                const featPts = featurePoints(feat);
                const featOpen = expanded.has(feat.id);

                return (
                  <div key={feat.id} className="border-t border-border/40">
                    {/* Feature row */}
                    <div className="flex items-center gap-2 px-3 py-2 pl-9 bg-background hover:bg-muted/10">
                      <button onClick={() => toggle(feat.id)} className="shrink-0 text-muted-foreground">
                        {featOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                      <input
                        className="flex-1 text-sm bg-transparent focus:outline-none min-w-0"
                        value={feat.title}
                        onChange={e => setFeat(epic.id, feat.id, f => ({ ...f, title: e.target.value }))}
                        placeholder="Feature title"
                      />
                      <SprintSelect value={feat.sprint} onChange={v => setFeat(epic.id, feat.id, f => ({ ...f, sprint: v }))} />
                      <span className="text-xs font-mono text-muted-foreground w-12 text-right shrink-0">{featPts}pt</span>
                    </div>

                    {featOpen && feat.stories.map(story => {
                      const taskHrs = (story.tasks ?? []).reduce((s, t) => s + (t.hours ?? 0), 0);
                      const storyOpen = expanded.has(story.id);

                      return (
                        <div key={story.id} className="border-t border-border/20">
                          {/* Story row */}
                          <div className="flex items-center gap-2 px-3 py-2 pl-16 bg-background hover:bg-muted/5">
                            <button onClick={() => toggle(story.id)} className="shrink-0 text-muted-foreground">
                              {storyOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                            </button>
                            <span className="flex-1 text-xs text-muted-foreground truncate min-w-0">
                              As {story.asA || '…'}, I want {story.iWant || '…'}
                            </span>
                            <SprintSelect value={story.sprint} onChange={v => setStory(epic.id, feat.id, story.id, s => ({ ...s, sprint: v }))} />
                            <div className="flex items-center gap-1 shrink-0">
                              <input
                                className="w-10 text-xs text-right border border-input rounded px-1 py-0.5 font-mono bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                                type="number" min={0} value={story.points}
                                onChange={e => setStory(epic.id, feat.id, story.id, s => ({ ...s, points: Number(e.target.value) }))}
                              />
                              <span className="text-xs text-muted-foreground">pt</span>
                              {taskHrs > 0 && <span className="text-xs text-muted-foreground">({taskHrs}h)</span>}
                            </div>
                            <ConfChip value={story.confidence} />
                          </div>

                          {storyOpen && (
                            <div className="pl-20 pr-4 pb-3 pt-1 space-y-2 bg-muted/5">
                              {/* Story fields */}
                              <div className="grid gap-1 text-xs">
                                {(['asA', 'iWant', 'soThat'] as const).map(field => (
                                  <label key={field} className="flex gap-2 items-center">
                                    <span className="text-muted-foreground w-12 shrink-0">
                                      {field === 'asA' ? 'As a' : field === 'iWant' ? 'I want' : 'So that'}
                                    </span>
                                    <input
                                      className="flex-1 border border-input rounded px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                                      value={story[field]}
                                      onChange={e => setStory(epic.id, feat.id, story.id, s => ({ ...s, [field]: e.target.value }))}
                                    />
                                  </label>
                                ))}
                              </div>
                              {/* Tasks */}
                              <div className="space-y-1.5 pt-1">
                                {(story.tasks ?? []).map(task => (
                                  <div key={task.id} className="flex items-center gap-2">
                                    <span className="text-muted-foreground text-xs">•</span>
                                    <input
                                      className="flex-1 text-xs border border-input rounded px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                                      placeholder="Task description"
                                      value={task.title}
                                      onChange={e => setTask(epic.id, feat.id, story.id, task.id, t => ({ ...t, title: e.target.value }))}
                                    />
                                    <input
                                      className="w-14 text-xs text-right border border-input rounded px-1.5 py-1 font-mono bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                                      type="number" min={0} value={task.hours ?? 0}
                                      onChange={e => setTask(epic.id, feat.id, story.id, task.id, t => ({ ...t, hours: Number(e.target.value) }))}
                                    />
                                    <span className="text-xs text-muted-foreground shrink-0">h</span>
                                    <button onClick={() => removeTask(epic.id, feat.id, story.id, task.id)}
                                      className="text-muted-foreground hover:text-destructive shrink-0">
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                ))}
                                <button
                                  className="flex items-center gap-1 text-xs text-primary hover:opacity-80 ml-3"
                                  onClick={() => addTask(epic.id, feat.id, story.id)}
                                >
                                  <Plus size={12} /> Add task
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Dependencies */}
      <div className="border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Link2 size={14} className="text-muted-foreground" />
          <h3 className="text-sm font-medium">Dependencies</h3>
        </div>
        <div className="space-y-2">
          {dependencies.length === 0 && <p className="text-xs text-muted-foreground">No dependencies yet.</p>}
          {dependencies.map((dep, i) => {
            const from = allFeatures.find(f => f.id === dep.from);
            const to = allFeatures.find(f => f.id === dep.to);
            return (
              <div key={i} className="flex items-center gap-2 text-xs bg-muted/20 rounded px-2 py-1.5">
                <span className="font-medium truncate">{from?.title ?? dep.from}</span>
                <span className="text-muted-foreground shrink-0">blocks</span>
                <span className="font-medium truncate">{to?.title ?? dep.to}</span>
                <button onClick={() => onDepsChange(dependencies.filter((_, j) => j !== i))}
                  className="ml-auto text-muted-foreground hover:text-destructive shrink-0">
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
        </div>
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
          <button
            className="flex items-center gap-1 text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded hover:opacity-90 disabled:opacity-50 shrink-0"
            onClick={addDep}
            disabled={!addDepFrom || !addDepTo || addDepFrom === addDepTo}
          >
            <Plus size={12} /> Add
          </button>
        </div>
      </div>
    </div>
  );
}
