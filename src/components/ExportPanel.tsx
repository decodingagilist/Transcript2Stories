import type { Epic } from '../types';
import { exportRallyCsv, exportJiraCsv } from '../lib/exports';
import { Download, Trophy } from 'lucide-react';

interface Props {
  epics: Epic[];
  onDone: () => void;
}

export function ExportPanel({ epics, onDone }: Props) {
  return (
    <div className="space-y-6 max-w-lg mx-auto text-center">
      <div className="flex justify-center">
        <div className="bg-green-100 rounded-full p-4">
          <Trophy className="text-green-600" size={32} />
        </div>
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-1">Backlog Ready</h2>
        <p className="text-sm text-muted-foreground">
          {epics.length} epics · {epics.reduce((a, e) => a + e.features.length, 0)} features ·{' '}
          {epics.reduce((a, e) => a + e.features.reduce((b, f) => b + f.stories.length, 0), 0)} stories
        </p>
      </div>

      <div className="grid gap-3">
        <button
          className="flex items-center justify-center gap-2 border border-border rounded-lg px-4 py-3 hover:bg-muted/30 text-sm font-medium"
          onClick={() => exportRallyCsv(epics)}
        >
          <Download size={16} />
          Download Rally CSV
        </button>
        <button
          className="flex items-center justify-center gap-2 border border-border rounded-lg px-4 py-3 hover:bg-muted/30 text-sm font-medium"
          onClick={() => exportJiraCsv(epics)}
        >
          <Download size={16} />
          Download Jira CSV
        </button>
      </div>

      <button
        className="text-sm text-muted-foreground hover:text-foreground underline"
        onClick={onDone}
      >
        Start a new session →
      </button>
    </div>
  );
}
