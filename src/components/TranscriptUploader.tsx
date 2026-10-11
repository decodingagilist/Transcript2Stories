import { useState, useEffect, useRef } from 'react';
import { Upload, FileText, Loader2, Users, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import type { Stakeholder } from '../types';
import { GEOGRAPHIES } from '../lib/holidays';

interface Props {
  onSubmit: (transcript: string, title: string, stakeholders: Stakeholder[]) => void;
  loading: boolean;
  error: string | null;
}

export function TranscriptUploader({ onSubmit, loading, error }: Props) {
  const [transcript, setTranscript] = useState('');
  const [title, setTitle] = useState('');
  const [dragging, setDragging] = useState(false);
  const [stakeholdersOpen, setStakeholdersOpen] = useState(true);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/sample-transcript.txt')
      .then(r => r.text())
      .then(text => {
        setTranscript(text);
        setTitle('NovaPay Embedded Finance Platform — 13 Oct 2026');
      })
      .catch(() => {});
  }, []);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = e => setTranscript(e.target?.result as string);
    reader.readAsText(file);
    setTitle(file.name.replace(/\.[^.]+$/, ''));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function addStakeholder() {
    setStakeholders(p => [...p, {
      id: `sh-${Date.now()}`,
      name: '',
      geography: GEOGRAPHIES[0],
      teamName: '',
      teamSize: 1,
      role: '',
    }]);
  }

  function setStakeholder(id: string, fn: (s: Stakeholder) => Stakeholder) {
    setStakeholders(p => p.map(s => s.id === id ? fn(s) : s));
  }

  function removeStakeholder(id: string) {
    setStakeholders(p => p.filter(s => s.id !== id));
  }

  function extractParticipants() {
    const found = new Map<string, string>(); // name → role
    const lines = transcript.split('\n');
    for (const line of lines) {
      // Match "Name:" or "Name Surname:" or "Name (role):" at line start
      const m = line.match(/^([A-Z][a-z]+(?: [A-Z][a-z]+){0,3})(?:\s+\(([^)]*)\))?:/);
      if (m) {
        const name = m[1];
        const role = m[2] ?? '';
        if (!found.has(name)) found.set(name, role);
      }
    }
    // Also match "Participants:" list patterns (same line or subsequent lines)
    for (let i = 0; i < lines.length; i++) {
      const pMatch = lines[i].match(/(?:participants|attendees|present)[:\s]+(.+)/i);
      if (pMatch) {
        const parts = pMatch[1].split(',');
        for (const part of parts) {
          const nm = part.trim().match(/^([A-Z][a-z]+(?: [A-Z][a-z]+){0,3})(?:\s+\(([^)]*)\))?/);
          if (nm) {
            const newRole = nm[2]?.trim() ?? '';
            if (!found.has(nm[1]) || (newRole && !found.get(nm[1]))) found.set(nm[1], newRole || found.get(nm[1]) || '');
          }
        }
        for (let j = i + 1; j < Math.min(i + 20, lines.length); j++) {
          const nm = lines[j].match(/^[-•*]?\s*([A-Z][a-z]+(?: [A-Z][a-z]+){0,3})(?:\s+\(([^)]*)\))?/);
          if (nm) {
            const newRole = nm[2]?.trim() ?? '';
            if (!found.has(nm[1]) || (newRole && !found.get(nm[1]))) found.set(nm[1], newRole || found.get(nm[1]) || '');
          } else if (lines[j].trim() === '') break;
        }
      }
    }
    const STOPWORDS = new Set(['Participants', 'Attendees', 'Present', 'Meeting', 'Summary', 'Agenda', 'Notes', 'Action', 'Items', 'Discussion', 'Sprint', 'Feature', 'Story', 'Epic', 'Task', 'Bug']);
    STOPWORDS.forEach(w => found.delete(w));
    if (found.size === 0) return;
    const existing = new Set(stakeholders.map(s => s.name));
    const newEntries = [...found.entries()]
      .filter(([name]) => !existing.has(name))
      .map(([name, role]) => ({
        id: `sh-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name,
        geography: GEOGRAPHIES[0],
        teamName: '',
        teamSize: 1,
        role: role.trim() || 'Please Fill',
      }));
    if (newEntries.length > 0) {
      setStakeholders(p => [...p, ...newEntries]);
      setStakeholdersOpen(true);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground mb-2">CeremonyIQ</h1>
        <p className="text-muted-foreground">Paste or drop a meeting transcript — get a full SAFe backlog in seconds.</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Session title</label>
        <input
          className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Q4 Planning Kickoff"
        />
      </div>

      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-4 transition-colors cursor-pointer',
          dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
        )}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
      >
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <Upload size={16} />
          <span className="text-sm">Drop a .txt file or click to browse</span>
        </div>
        <input ref={fileRef} type="file" accept=".txt" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <FileText size={14} />
          <span>Transcript</span>
          <span className="text-muted-foreground ml-auto">{transcript.length.toLocaleString()} chars</span>
        </div>
        <textarea
          className="w-full h-48 border border-input rounded-md px-3 py-2 text-sm bg-background font-mono focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          value={transcript}
          onChange={e => setTranscript(e.target.value)}
          placeholder="Paste your meeting transcript here…"
        />
      </div>

      {/* Team & Stakeholders */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="flex items-center px-4 py-3 bg-muted/20 gap-2">
          <button
            className="flex items-center gap-2 flex-1 text-left"
            onClick={() => setStakeholdersOpen(o => !o)}
          >
            {stakeholdersOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <Users size={15} className="text-primary" />
            <span className="text-sm font-medium">Team &amp; Stakeholders</span>
            <span className="text-xs text-muted-foreground ml-2 hidden sm:block">(Geography used for public holidays &amp; capacity)</span>
            {stakeholders.length > 0 && (
              <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {stakeholders.length} team{stakeholders.length !== 1 ? 's' : ''}
              </span>
            )}
          </button>
          <button
            onClick={extractParticipants}
            disabled={!transcript.trim()}
            className="flex items-center gap-1 text-xs text-primary hover:opacity-80 border border-primary/30 rounded px-2.5 py-1 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Parse speaker names from transcript"
          >
            <Users size={11} /> Extract from transcript
          </button>
        </div>

        {stakeholdersOpen && (
          <div className="p-4 space-y-3">
            {stakeholders.length === 0 && (
              <p className="text-xs text-muted-foreground">Add participating teams to enable public holiday detection and team capacity planning.</p>
            )}

            {stakeholders.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="pb-2 pr-3 font-medium">Name / Team</th>
                      <th className="pb-2 pr-3 font-medium">Geography</th>
                      <th className="pb-2 pr-3 font-medium">Team Name</th>
                      <th className="pb-2 pr-3 font-medium w-16">Members</th>
                      <th className="pb-2 pr-3 font-medium">Role</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {stakeholders.map(s => (
                      <tr key={s.id} className="group">
                        <td className="py-1.5 pr-3">
                          <input
                            className="w-full border border-input rounded px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                            placeholder="Stakeholder name…"
                            value={s.name}
                            onChange={e => setStakeholder(s.id, x => ({ ...x, name: e.target.value }))}
                          />
                        </td>
                        <td className="py-1.5 pr-3">
                          <select
                            className="w-full border border-input rounded px-1.5 py-1 bg-background"
                            value={s.geography}
                            onChange={e => setStakeholder(s.id, x => ({ ...x, geography: e.target.value }))}
                          >
                            {GEOGRAPHIES.map(g => <option key={g} value={g}>{g}</option>)}
                          </select>
                        </td>
                        <td className="py-1.5 pr-3">
                          <input
                            className="w-full border border-input rounded px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                            placeholder="Dev, Test, BA…"
                            value={s.teamName}
                            onChange={e => setStakeholder(s.id, x => ({ ...x, teamName: e.target.value }))}
                          />
                        </td>
                        <td className="py-1.5 pr-3">
                          <input
                            className="w-full border border-input rounded px-2 py-1 bg-background focus:outline-none text-center font-mono"
                            type="number" min={1} max={50} value={s.teamSize}
                            onChange={e => setStakeholder(s.id, x => ({ ...x, teamSize: Number(e.target.value) }))}
                          />
                        </td>
                        <td className="py-1.5 pr-3">
                          <input
                            className="w-full border border-input rounded px-2 py-1 bg-background focus:outline-none"
                            placeholder="Scrum Master, PO…"
                            value={s.role ?? ''}
                            onChange={e => setStakeholder(s.id, x => ({ ...x, role: e.target.value }))}
                          />
                        </td>
                        <td className="py-1.5">
                          <button onClick={() => removeStakeholder(s.id)}
                            className="text-muted-foreground hover:text-destructive">
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <button
              onClick={addStakeholder}
              className="flex items-center gap-1.5 text-xs text-primary hover:opacity-80 border border-dashed border-primary/40 rounded px-3 py-1.5"
            >
              <Plus size={12} /> Add Team / Stakeholder
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <button
        className="w-full bg-primary text-primary-foreground rounded-md py-2.5 font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
        disabled={loading || !transcript.trim()}
        onClick={() => onSubmit(transcript, title || 'Untitled Session', stakeholders)}
      >
        {loading && <Loader2 size={16} className="animate-spin" />}
        {loading ? 'Extracting backlog…' : 'Extract Backlog'}
      </button>
    </div>
  );
}
