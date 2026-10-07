import type { Epic, Story } from '../types';
import { confidenceColor, confidenceLabel } from '../lib/utils';
import { CheckCircle2 } from 'lucide-react';

interface Props {
  epics: Epic[];
  onUpdate: (epicId: string, featureId: string, storyId: string, changes: Partial<Story>) => void;
  onApprove: () => void;
}

export function StoryReview({ epics, onUpdate, onApprove }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Step 4 — Stories</h2>
          <p className="text-sm text-muted-foreground">Edit as-a / i-want / so-that inline.</p>
        </div>
        <button
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:opacity-90"
          onClick={onApprove}
        >
          <CheckCircle2 size={16} />
          Approve All
        </button>
      </div>

      <div className="space-y-4">
        {epics.map(epic =>
          epic.features.map(feat => (
            <div key={feat.id} className="border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-muted/30 border-b border-border">
                <h3 className="font-medium text-sm">{epic.title} → {feat.title}</h3>
              </div>
              <div className="divide-y divide-border">
                {feat.stories.map(story => (
                  <div key={story.id} className="p-4 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full font-mono">Sprint {story.sprint}</span>
                      <span className="text-xs px-2 py-0.5 bg-secondary rounded-full font-mono">{story.size} · {story.points}pt</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${confidenceColor(story.confidence)}`}>
                        {confidenceLabel(story.confidence)}
                      </span>
                    </div>
                    <div className="grid gap-2 text-sm">
                      <label className="flex gap-2 items-start">
                        <span className="text-xs text-muted-foreground w-14 pt-2 shrink-0">As a</span>
                        <input
                          className="flex-1 border border-input rounded px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                          value={story.asA}
                          onChange={e => onUpdate(epic.id, feat.id, story.id, { asA: e.target.value })}
                        />
                      </label>
                      <label className="flex gap-2 items-start">
                        <span className="text-xs text-muted-foreground w-14 pt-2 shrink-0">I want</span>
                        <input
                          className="flex-1 border border-input rounded px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                          value={story.iWant}
                          onChange={e => onUpdate(epic.id, feat.id, story.id, { iWant: e.target.value })}
                        />
                      </label>
                      <label className="flex gap-2 items-start">
                        <span className="text-xs text-muted-foreground w-14 pt-2 shrink-0">So that</span>
                        <input
                          className="flex-1 border border-input rounded px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                          value={story.soThat}
                          onChange={e => onUpdate(epic.id, feat.id, story.id, { soThat: e.target.value })}
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
