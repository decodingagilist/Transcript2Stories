import { useState } from 'react';
import { TranscriptUploader } from './components/TranscriptUploader';
import { BacklogReview } from './components/BacklogReview';
import { Timeline } from './components/Timeline';
import { ExportPanel } from './components/ExportPanel';
import { useSession } from './hooks/useSession';
import type { Epic, Dependency } from './types';

type Step = 1 | 2 | 3 | 4;

const STEPS = [
  { num: 1, label: 'Upload' },
  { num: 2, label: 'Backlog' },
  { num: 3, label: 'Timeline' },
  { num: 4, label: 'Export' },
];

export default function App() {
  const [step, setStep] = useState<Step>(1);
  const { session, loading, error, startExtraction, setSession } = useSession();

  async function handleUpload(transcript: string, title: string) {
    const ok = await startExtraction(transcript, title);
    if (ok) setStep(2);
  }

  function handleEpicsChange(epics: Epic[]) {
    if (!session) return;
    setSession({ ...session, epics });
  }

  function handleDepsChange(dependencies: Dependency[]) {
    if (!session) return;
    setSession({ ...session, dependencies });
  }

  function reset() {
    setSession(null);
    setStep(1);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-primary">CeremonyIQ</span>
            <span className="text-xs text-muted-foreground hidden sm:block">SAFe Backlog Generator</span>
          </div>
          {step > 1 && session && (
            <span className="text-sm text-muted-foreground truncate max-w-[200px]">{session.title}</span>
          )}
        </div>
      </header>

      {step > 1 && (
        <div className="border-b border-border bg-card">
          <div className="max-w-5xl mx-auto px-4">
            <nav className="flex">
              {STEPS.map(s => (
                <button
                  key={s.num}
                  className={`px-4 py-3 text-sm border-b-2 transition-colors ${
                    step === s.num
                      ? 'border-primary text-primary font-medium'
                      : step > s.num
                      ? 'border-transparent text-muted-foreground hover:text-foreground'
                      : 'border-transparent text-muted-foreground/40 cursor-not-allowed'
                  }`}
                  onClick={() => { if (step > s.num) setStep(s.num as Step); }}
                  disabled={step < s.num}
                >
                  {s.num}. {s.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 py-8">
        {step === 1 && (
          <TranscriptUploader onSubmit={handleUpload} loading={loading} error={error} />
        )}
        {step === 2 && session?.epics && (
          <BacklogReview
            epics={session.epics}
            dependencies={session.dependencies ?? []}
            onEpicsChange={handleEpicsChange}
            onDepsChange={handleDepsChange}
            onApprove={() => setStep(3)}
          />
        )}
        {step === 3 && session?.epics && (
          <Timeline
            epics={session.epics}
            dependencies={session.dependencies ?? []}
            onApprove={() => setStep(4)}
          />
        )}
        {step === 4 && session?.epics && (
          <ExportPanel epics={session.epics} onDone={reset} />
        )}
      </main>

      <footer className="fixed bottom-4 right-4">
        <button
          className="w-9 h-9 rounded-full bg-muted border border-border text-muted-foreground hover:text-foreground flex items-center justify-center text-sm font-bold shadow-sm"
          title="About CeremonyIQ"
          onClick={() => alert('CeremonyIQ\nBy Arnab Chakrabortty — SAFe 6 SM/RTE\nlinkedin.com/in/chakraborttyarnab\nagileaiarnab.lovable.app\n\nPortfolio demo: Groq + Firebase + React')}
        >
          ?
        </button>
      </footer>
    </div>
  );
}
