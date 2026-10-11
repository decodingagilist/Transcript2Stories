import { useState, useMemo } from 'react';
import type { Epic, Dependency, RaciItem, Risk, ActionItem, Stakeholder, VoteOfConfidence } from '../types';
import { exportRallyCsv, exportJiraCsv } from '../lib/exports';
import { Download, Trophy, Copy, Check, FileText, Mail, ThumbsUp } from 'lucide-react';
import { cn } from '../lib/utils';

const MOSCOW_CATS = ['Must Have', 'Should Have', 'Could Have', "Won't Have"] as const;
const MOSCOW_COLORS = {
  'Must Have':    { bar: 'bg-red-500',    badge: 'bg-red-100 text-red-700 border-red-200' },
  'Should Have':  { bar: 'bg-amber-400',  badge: 'bg-amber-100 text-amber-700 border-amber-200' },
  'Could Have':   { bar: 'bg-blue-400',   badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  "Won't Have":   { bar: 'bg-gray-400',   badge: 'bg-gray-100 text-gray-600 border-gray-200' },
};

interface Props {
  epics: Epic[];
  dependencies: Dependency[];
  raci: RaciItem[];
  risks: Risk[];
  actionItems: ActionItem[];
  meetingMinutes: string;
  timelineSummary: string;
  stakeholders: Stakeholder[];
  votes: VoteOfConfidence[];
  onVotesChange: (votes: VoteOfConfidence[]) => void;
  onDone: () => void;
}

function buildHtmlReport(props: Omit<Props, 'onDone' | 'onVotesChange'>): string {
  const { epics, dependencies, raci, risks, actionItems, meetingMinutes, timelineSummary, votes } = props;
  const allFeatures = epics.flatMap(e => e.features.map(f => ({ id: f.id, title: f.title })));

  const aiRows = actionItems.map(a =>
    `<tr><td>${a.done ? '✅' : '☐'}</td><td>${a.description}</td><td>${a.owner}</td><td>${a.dueDate ?? '—'}</td></tr>`
  ).join('');

  const raciRows = raci.map(r => {
    const feat = allFeatures.find(f => f.id === r.feature)?.title ?? r.feature;
    const resp = Array.isArray(r.responsible) ? r.responsible.join(', ') : r.responsible;
    const cons = Array.isArray(r.consulted) ? r.consulted.join(', ') : r.consulted;
    const inf = Array.isArray(r.informed) ? r.informed.join(', ') : r.informed;
    return `<tr><td>${feat}</td><td>${resp}</td><td>${r.accountable}</td><td>${cons}</td><td>${inf}</td></tr>`;
  }).join('');

  const depRows = dependencies.map(d => {
    const from = allFeatures.find(f => f.id === d.from)?.title ?? d.from;
    const to = allFeatures.find(f => f.id === d.to)?.title ?? d.to;
    return `<tr><td>${from}</td><td>blocks</td><td>${to}</td><td>${d.reason}</td></tr>`;
  }).join('');

  const riskRows = risks.map(r =>
    `<tr><td>${r.description}</td><td>${r.impact}</td><td>${r.owner}</td><td>${r.mitigation}</td><td>${r.status}</td></tr>`
  ).join('');

  const voteRows = votes.map(v => {
    const color = v.vote === 'Green' ? '#16a34a' : v.vote === 'Yellow' ? '#ca8a04' : v.vote === 'Red' ? '#dc2626' : '#6b7280';
    return `<tr><td>${v.participantName}</td><td style="color:${color};font-weight:600">${v.vote ?? 'No vote'}</td><td>${v.comment}</td></tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>CeremonyIQ — Meeting Summary</title>
<style>
  body { font-family: Segoe UI, Arial, sans-serif; color: #1a1a2e; max-width: 900px; margin: 0 auto; padding: 32px; }
  h1 { color: #6d28d9; } h2 { color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-top: 32px; }
  p { line-height: 1.6; color: #4b5563; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
  th { background: #f3f4f6; text-align: left; padding: 8px 10px; }
  td { padding: 6px 10px; border-bottom: 1px solid #e5e7eb; }
  pre { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; font-size: 13px; white-space: pre-wrap; }
  .badge-open { color: #dc2626; } .badge-mitigated { color: #16a34a; }
</style>
</head>
<body>
<h1>📋 Meeting Summary — CeremonyIQ</h1>

<h2>Minutes of Meeting</h2>
<p>${meetingMinutes || 'No minutes captured.'}</p>

<h2>Action Items</h2>
<table><thead><tr><th></th><th>Description</th><th>Owner</th><th>Due Date</th></tr></thead>
<tbody>${aiRows || '<tr><td colspan="4">No action items.</td></tr>'}</tbody></table>

<h2>RACI Matrix</h2>
<table><thead><tr><th>Feature</th><th>Responsible</th><th>Accountable</th><th>Consulted</th><th>Informed</th></tr></thead>
<tbody>${raciRows || '<tr><td colspan="5">No RACI data.</td></tr>'}</tbody></table>

<h2>Dependency Matrix</h2>
<table><thead><tr><th>From</th><th>Relationship</th><th>To</th><th>Reason</th></tr></thead>
<tbody>${depRows || '<tr><td colspan="4">No dependencies.</td></tr>'}</tbody></table>

<h2>Risk Register</h2>
<table><thead><tr><th>Description</th><th>Impact</th><th>Owner</th><th>Mitigation</th><th>Status</th></tr></thead>
<tbody>${riskRows || '<tr><td colspan="5">No risks identified.</td></tr>'}</tbody></table>

<h2>Release Timeline Summary</h2>
<pre>${timelineSummary || 'No timeline summary generated.'}</pre>

<h2>Vote of Confidence</h2>
<table><thead><tr><th>Participant</th><th>Vote</th><th>Comment</th></tr></thead>
<tbody>${voteRows || '<tr><td colspan="3">No votes recorded.</td></tr>'}</tbody></table>

</body></html>`;
}

const VOTE_STYLES = {
  Green:  'bg-green-100 text-green-700 border-green-300',
  Yellow: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  Red:    'bg-red-100 text-red-700 border-red-300',
};

export function ExportPanel({ epics, dependencies, raci, risks, actionItems, meetingMinutes, timelineSummary, stakeholders, votes, onVotesChange, onDone }: Props) {
  const [copied, setCopied] = useState(false);

  const epicCount = epics.length;
  const featCount = epics.reduce((a, e) => a + e.features.length, 0);
  const storyCount = epics.reduce((a, e) => a + e.features.reduce((b, f) => b + f.stories.length, 0), 0);
  const allFeatures = epics.flatMap(e => e.features.map(f => ({ id: f.id, title: f.title })));

  const moscowData = useMemo(() => {
    const counts: Record<string, number> = {};
    const pts: Record<string, number> = {};
    MOSCOW_CATS.forEach(c => { counts[c] = 0; pts[c] = 0; });
    let unset = 0;
    epics.forEach(e => e.features.forEach(f => f.stories.forEach(st => {
      const m = st.moscow;
      if (m && counts[m] !== undefined) { counts[m]++; pts[m] = (pts[m] ?? 0) + (st.points ?? 0); }
      else unset++;
    })));
    const total = Object.values(counts).reduce((a, b) => a + b, 0) + unset;
    return { counts, pts, unset, total };
  }, [epics]);

  function setVote(id: string, fn: (v: VoteOfConfidence) => VoteOfConfidence) {
    onVotesChange(votes.map(v => v.id === id ? fn(v) : v));
  }

  function addVote() {
    onVotesChange([...votes, { id: `vote-${Date.now()}`, participantName: '', vote: null, comment: '' }]);
  }

  function downloadHtml() {
    const html = buildHtmlReport({ epics, dependencies, raci, risks, actionItems, meetingMinutes, timelineSummary, stakeholders, votes });
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'ceremony-iq-summary.html'; a.click();
    URL.revokeObjectURL(url);
  }

  function copyHtml() {
    const html = buildHtmlReport({ epics, dependencies, raci, risks, actionItems, meetingMinutes, timelineSummary, stakeholders, votes });
    navigator.clipboard.writeText(html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h2 className="text-xl font-semibold">Step 4 — Review &amp; Summary</h2>
        <p className="text-sm text-muted-foreground">Review your session output and export.</p>
      </div>

      {/* Minutes of Meeting */}
      <div className="border border-border rounded-lg p-4 space-y-2">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-muted-foreground" />
          <h3 className="text-sm font-semibold">Minutes of Meeting</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{meetingMinutes || 'No minutes captured during extraction.'}</p>
      </div>

      {/* Action Items Summary */}
      <div className="border border-border rounded-lg p-4 space-y-2">
        <h3 className="text-sm font-semibold">Action Items Summary</h3>
        {actionItems.length === 0
          ? <p className="text-xs text-muted-foreground">No action items.</p>
          : (
            <div className="space-y-1.5">
              {actionItems.map(ai => (
                <div key={ai.id} className="flex items-start gap-2 text-xs">
                  <span className={ai.done ? 'text-green-600' : 'text-muted-foreground'}>{ai.done ? '✅' : '☐'}</span>
                  <span className={ai.done ? 'line-through text-muted-foreground flex-1' : 'flex-1'}>{ai.description}</span>
                  <span className="text-muted-foreground shrink-0">{ai.owner}</span>
                  {ai.dueDate && <span className="text-muted-foreground shrink-0">{ai.dueDate}</span>}
                </div>
              ))}
            </div>
          )}
      </div>

      {/* MoSCoW Analysis Chart */}
      <div className="border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-semibold">MoSCoW Analysis</h3>
          {moscowData.unset > 0 && (
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              {moscowData.unset} stor{moscowData.unset === 1 ? 'y' : 'ies'} not prioritised — go back to Step 2 to set MoSCoW
            </span>
          )}
        </div>
        {moscowData.total === 0 ? (
          <p className="text-xs text-muted-foreground">No stories found.</p>
        ) : (
          <div className="space-y-2.5">
            {MOSCOW_CATS.map(cat => {
              const count = moscowData.counts[cat] ?? 0;
              const point = moscowData.pts[cat] ?? 0;
              const pct = moscowData.total > 0 ? Math.round((count / moscowData.total) * 100) : 0;
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className={cn('px-2 py-0.5 rounded-full border text-[11px] font-medium', MOSCOW_COLORS[cat].badge)}>{cat}</span>
                    <span className="text-muted-foreground">{count} stor{count === 1 ? 'y' : 'ies'} · {point} pts · {pct}%</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full transition-all', MOSCOW_COLORS[cat].bar)} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {moscowData.unset > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2 py-0.5 rounded-full border text-[11px] font-medium bg-muted text-muted-foreground border-border">Not Set</span>
                  <span className="text-muted-foreground">{moscowData.unset} stor{moscowData.unset === 1 ? 'y' : 'ies'} · {Math.round((moscowData.unset / moscowData.total) * 100)}%</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gray-200" style={{ width: `${Math.round((moscowData.unset / moscowData.total) * 100)}%` }} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* RACI Matrix */}
      <div className="border border-border rounded-lg p-4 space-y-2">
        <h3 className="text-sm font-semibold">RACI Matrix</h3>
        {raci.length === 0
          ? <p className="text-xs text-muted-foreground">No RACI data.</p>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {['Feature', 'Responsible', 'Accountable', 'Consulted', 'Informed'].map(h =>
                      <th key={h} className="text-left py-2 px-2 font-medium text-muted-foreground">{h}</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {raci.map((row, i) => {
                    const feat = allFeatures.find(f => f.id === row.feature)?.title ?? row.feature;
                    return (
                      <tr key={i}>
                        <td className="py-1.5 px-2 font-medium">{feat}</td>
                        <td className="py-1.5 px-2">{Array.isArray(row.responsible) ? row.responsible.join(', ') : row.responsible}</td>
                        <td className="py-1.5 px-2">{row.accountable}</td>
                        <td className="py-1.5 px-2">{Array.isArray(row.consulted) ? row.consulted.join(', ') : row.consulted}</td>
                        <td className="py-1.5 px-2">{Array.isArray(row.informed) ? row.informed.join(', ') : row.informed}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {/* Dependency Matrix */}
      <div className="border border-border rounded-lg p-4 space-y-2">
        <h3 className="text-sm font-semibold">Dependency Matrix</h3>
        {dependencies.length === 0
          ? <p className="text-xs text-muted-foreground">No dependencies.</p>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {['From', 'Relationship', 'To', 'Reason'].map(h =>
                      <th key={h} className="text-left py-2 px-2 font-medium text-muted-foreground">{h}</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {dependencies.map((dep, i) => {
                    const from = allFeatures.find(f => f.id === dep.from)?.title ?? dep.from;
                    const to = allFeatures.find(f => f.id === dep.to)?.title ?? dep.to;
                    return (
                      <tr key={i}>
                        <td className="py-1.5 px-2 font-medium">{from}</td>
                        <td className="py-1.5 px-2 text-muted-foreground">blocks</td>
                        <td className="py-1.5 px-2 font-medium">{to}</td>
                        <td className="py-1.5 px-2 text-muted-foreground">{dep.reason}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {/* Timeline Summary */}
      {timelineSummary && (
        <div className="border border-border rounded-lg p-4 space-y-2">
          <h3 className="text-sm font-semibold">Release Timeline Summary</h3>
          <pre className="text-xs text-foreground whitespace-pre-wrap font-sans leading-relaxed">{timelineSummary}</pre>
        </div>
      )}

      {/* Vote of Confidence */}
      <div className="border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ThumbsUp size={14} className="text-muted-foreground" />
            <h3 className="text-sm font-semibold">Vote of Confidence</h3>
          </div>
          <button onClick={addVote} className="flex items-center gap-1 text-xs text-primary hover:opacity-80">
            + Add participant
          </button>
        </div>
        {votes.length === 0 && stakeholders.length > 0 && (
          <button
            className="text-xs text-primary hover:opacity-80 underline"
            onClick={() => onVotesChange(stakeholders.map(s => ({ id: `vote-${s.id}`, participantName: s.name || s.teamName, vote: null, comment: '' })))}>
            Pre-fill from stakeholders
          </button>
        )}
        {votes.length === 0 && stakeholders.length === 0 && (
          <p className="text-xs text-muted-foreground">No participants. Add stakeholders in Step 1 or add votes manually.</p>
        )}
        {votes.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {(['Green', 'Yellow', 'Red'] as const).map(v => {
                const count = votes.filter(x => x.vote === v).length;
                return count > 0 ? (
                  <span key={v} className={cn('px-2 py-0.5 rounded-full border font-medium', VOTE_STYLES[v])}>
                    {v}: {count}
                  </span>
                ) : null;
              })}
              {votes.filter(x => !x.vote).length > 0 && (
                <span className="text-muted-foreground">{votes.filter(x => !x.vote).length} pending</span>
              )}
            </div>
            {votes.map(v => (
              <div key={v.id} className="flex items-center gap-2 flex-wrap">
                <input className="w-36 text-xs border border-input rounded px-2 py-1.5 bg-background focus:outline-none"
                  placeholder="Participant name…" value={v.participantName}
                  onChange={e => setVote(v.id, x => ({ ...x, participantName: e.target.value }))} />
                {(['Green', 'Yellow', 'Red'] as const).map(opt => (
                  <button key={opt}
                    className={cn('text-xs px-3 py-1.5 rounded-full border font-medium transition-colors',
                      v.vote === opt ? VOTE_STYLES[opt] : 'border-border text-muted-foreground hover:border-primary/50')}
                    onClick={() => setVote(v.id, x => ({ ...x, vote: x.vote === opt ? null : opt }))}>
                    {opt}
                  </button>
                ))}
                <input className="flex-1 text-xs border border-input rounded px-2 py-1.5 bg-background focus:outline-none min-w-32"
                  placeholder="Comment…" value={v.comment}
                  onChange={e => setVote(v.id, x => ({ ...x, comment: e.target.value }))} />
                <button onClick={() => onVotesChange(votes.filter(x => x.id !== v.id))}
                  className="text-muted-foreground hover:text-destructive shrink-0 text-xs">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* HTML / Email Export */}
      <div className="border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Mail size={14} className="text-muted-foreground" />
          <h3 className="text-sm font-semibold">Export Report (HTML / Email / Confluence)</h3>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            className="flex items-center gap-2 border border-border rounded-lg px-4 py-2.5 hover:bg-muted/30 text-sm font-medium"
            onClick={downloadHtml}>
            <Download size={16} /> Download HTML
          </button>
          <button
            className="flex items-center gap-2 border border-border rounded-lg px-4 py-2.5 hover:bg-muted/30 text-sm font-medium"
            onClick={copyHtml}>
            {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
            {copied ? 'Copied!' : 'Copy HTML (paste into email / Confluence)'}
          </button>
        </div>
      </div>

      {/* Backlog Ready — export CSV */}
      <div className="border border-border rounded-lg p-5 space-y-4 bg-muted/10">
        <div className="flex items-center gap-3">
          <div className="bg-green-100 rounded-full p-3">
            <Trophy className="text-green-600" size={24} />
          </div>
          <div>
            <h3 className="font-semibold">Backlog Ready</h3>
            <p className="text-sm text-muted-foreground">
              {epicCount} epics · {featCount} features · {storyCount} stories
            </p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            className="flex items-center justify-center gap-2 border border-border rounded-lg px-4 py-3 hover:bg-muted/30 text-sm font-medium"
            onClick={() => exportRallyCsv(epics)}>
            <Download size={16} /> Download Rally CSV
          </button>
          <button
            className="flex items-center justify-center gap-2 border border-border rounded-lg px-4 py-3 hover:bg-muted/30 text-sm font-medium"
            onClick={() => exportJiraCsv(epics)}>
            <Download size={16} /> Download Jira CSV
          </button>
        </div>
        <button className="text-sm text-muted-foreground hover:text-foreground underline w-full text-center" onClick={onDone}>
          Start a new session →
        </button>
      </div>
    </div>
  );
}
