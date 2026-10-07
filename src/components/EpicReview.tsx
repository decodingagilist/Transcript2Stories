import { useState } from 'react';
import type { Epic } from '../types';
import { confidenceColor, confidenceLabel } from '../lib/utils';
import { ChevronDown, ChevronRight, CheckCircle2 } from 'lucide-react';

interface Props {
  epics: Epic[];
  onUpdate: (epicId: string, changes: Partial<Epic>) => void;
  onApprove: () => void;
}

export function EpicReview({ epics, onUpdate, onApprove }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(epics.map(e => e.id)));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Step 2 — Epics</h2>
          <p className="text-sm text-muted-foreground">{epics.length} epics extracted. Review and edit titles.</p>
        </div>
        <button
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:opacity-90"
          onClick={onApprove}
        >
          <CheckCircle2 size={16} />
          Approve All
        </button>
      </div>

      <div className="space-y-3">
        {epics.map(epic => (
          <div key={epic.id} className="border border-border rounded-lg overflow-hidden">
            <div
              className="flex items-center gap-3 p-4 bg-card cursor-pointer hover:bg-muted/30"
              onClick={() => setExpanded(prev => {
                const next = new Set(prev);
                next.has(epic.id) ? next.delete(epic.id) : next.add(epic.id);
                return next;
              })}
            >
              {expanded.has(epic.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <input
                className="flex-1 font-medium bg-transparent focus:outline-none focus:underline"
                value={epic.title}
                onChange={e => { e.stopPropagation(); onUpdate(epic.id, { title: e.target.value }); }}
                onClick={e => e.stopPropagation()}
              />
              <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full font-mono">Sprint {epic.sprint}</span>
              <span className="text-xs px-2 py-0.5 bg-secondary rounded-full font-mono">{epic.size} · {epic.points}pt</span>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${confidenceColor(epic.confidence)}`}>
                {confidenceLabel(epic.confidence)}
              </span>
            </div>

            {expanded.has(epic.id) && (
              <div className="px-4 pb-4 pt-2 border-t border-border bg-muted/10">
                <p className="text-sm text-muted-foreground">{epic.description}</p>
                <p className="text-xs text-muted-foreground mt-2">{epic.features?.length ?? 0} features</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
