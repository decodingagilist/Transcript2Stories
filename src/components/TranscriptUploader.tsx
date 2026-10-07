import { useState, useEffect, useRef } from 'react';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  onSubmit: (transcript: string, title: string) => void;
  loading: boolean;
  error: string | null;
}

export function TranscriptUploader({ onSubmit, loading, error }: Props) {
  const [transcript, setTranscript] = useState('');
  const [title, setTitle] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/sample-transcript.txt')
      .then(r => r.text())
      .then(text => {
        setTranscript(text);
        setTitle('Loyalty App CRM Kickoff — 8 Oct 2026');
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground mb-2">CeremonyIQ</h1>
        <p className="text-muted-foreground">Paste or drop a meeting transcript — get a full SAFe backlog in seconds.</p>
      </div>

      <div className="space-y-3">
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
        <input ref={fileRef} type="file" accept=".txt" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <FileText size={14} />
          <span>Transcript</span>
          <span className="text-muted-foreground ml-auto">{transcript.length.toLocaleString()} chars</span>
        </div>
        <textarea
          className="w-full h-64 border border-input rounded-md px-3 py-2 text-sm bg-background font-mono focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          value={transcript}
          onChange={e => setTranscript(e.target.value)}
          placeholder="Paste your meeting transcript here…"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <button
        className="w-full bg-primary text-primary-foreground rounded-md py-2.5 font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
        disabled={loading || !transcript.trim()}
        onClick={() => onSubmit(transcript, title || 'Untitled Session')}
      >
        {loading && <Loader2 size={16} className="animate-spin" />}
        {loading ? 'Extracting backlog…' : 'Extract Backlog'}
      </button>
    </div>
  );
}
