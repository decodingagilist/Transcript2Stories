import type { Epic, Feature } from '../types';
import { confidenceColor, confidenceLabel, VELOCITY } from '../lib/utils';
import { CheckCircle2 } from 'lucide-react';

interface Props {
  epics: Epic[];
  onUpdate: (epicId: string, featureId: string, changes: Partial<Feature>) => void;
  onApprove: () => void;
}

function VelocityBar({ used }: { used: number }) {
  const pct = Math.min(100, (used / VELOCITY) * 100);
  const color = used > VELOCITY ? 'bg-red-500' : used > VELOCITY * 0.85 ? 'bg-amber-500' : 'bg-green-500';
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono whitespace-nowrap">{used}/{VELOCITY}pt</span>
    </div>
  );
}

function sprintTotals(epics: Epic[]): Record<number, number> {
  const totals: Record<number, number> = {};
  epics.forEach(e => e.features.forEach(f => {
    totals[f.sprint] = (totals[f.sprint] ?? 0) + f.points;
  }));
  return totals;
}

export function FeatureReview({ epics, onUpdate, onApprove }: Props) {
  const totals = sprintTotals(epics);
  const sprints = [...new Set(Object.keys(totals).map(Number))].sort();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Step 3 — Features</h2>
          <p className="text-sm text-muted-foreground">Review features by epic. Check sprint velocity.</p>
        </div>
        <button
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:opacity-90"
          onClick={onApprove}
        >
          <CheckCircle2 size={16} />
          Approve All
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {sprints.map(s => (
          <div key={s} className="border border-border rounded-lg p-3 space-y-1">
            <p className="text-xs font-medium">Sprint {s}</p>
            <VelocityBar used={totals[s]} />
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {epics.map(epic => (
          <div key={epic.id} className="border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-muted/30 border-b border-border">
              <h3 className="font-medium text-sm">{epic.title}</h3>
            </div>
            <div className="divide-y divide-border">
              {epic.features.map(feat => (
                <div key={feat.id} className="flex items-start gap-3 p-4">
                  <div className="flex-1 space-y-1">
                    <input
                      className="w-full font-medium text-sm bg-transparent focus:outline-none focus:underline"
                      value={feat.title}
                      onChange={e => onUpdate(epic.id, feat.id, { title: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">{feat.description}</p>
                    <p className="text-xs text-muted-foreground">{feat.stories?.length ?? 0} stories</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full font-mono">Sprint {feat.sprint}</span>
                    <span className="text-xs px-2 py-0.5 bg-secondary rounded-full font-mono">{feat.size} · {feat.points}pt</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${confidenceColor(feat.confidence)}`}>
                      {confidenceLabel(feat.confidence)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
