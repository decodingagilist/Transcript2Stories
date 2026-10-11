import { useState } from 'react';
import { TranscriptUploader } from './components/TranscriptUploader';
import { BacklogReview } from './components/BacklogReview';
import { Timeline } from './components/Timeline';
import { ExportPanel } from './components/ExportPanel';
import { CeremonyIQAssistant } from './components/CeremonyIQAssistant';
import { useSession } from './hooks/useSession';
import type { Epic, Dependency, RaciItem, Risk, ActionItem, Stakeholder, Phase, VoteOfConfidence } from './types';

type Step = 1 | 2 | 3 | 4;

const STEPS = [
  { num: 1, label: 'Upload' },
  { num: 2, label: 'Backlog' },
  { num: 3, label: 'Release Timeline' },
  { num: 4, label: 'Review & Summary' },
];

export default function App() {
  const [step, setStep] = useState<Step>(1);
  const [timelineSummary, setTimelineSummary] = useState('');
  const { session, loading, error, startExtraction, setSession } = useSession();

  async function handleUpload(transcript: string, title: string, stakeholders: Stakeholder[]) {
    const ok = await startExtraction(transcript, title, stakeholders);
    if (ok) setStep(2);
  }

  function updateSession<K extends keyof NonNullable<typeof session>>(key: K, value: NonNullable<typeof session>[K]) {
    if (!session) return;
    setSession({ ...session, [key]: value });
  }

  function handleEpicsChange(epics: Epic[]) { updateSession('epics', epics); }
  function handleDepsChange(dependencies: Dependency[]) { updateSession('dependencies', dependencies); }
  function handleRaciChange(raci: RaciItem[]) { updateSession('raci', raci); }
  function handleRisksChange(risks: Risk[]) { updateSession('risks', risks); }
  function handleActionItemsChange(actionItems: ActionItem[]) { updateSession('actionItems', actionItems); }
  function handlePhasesChange(phases: Phase[]) { updateSession('phases', phases); }
  function handleVotesChange(votes: VoteOfConfidence[]) { updateSession('votes', votes); }
  function handleProjectStartDate(d: string) { updateSession('projectStartDate', d); }
  function handleForecastedEndDate(d: string) { updateSession('forecastedEndDate', d); }

  function handleActionItemToggle(id: string, done: boolean) {
    if (!session?.actionItems) return;
    updateSession('actionItems', session.actionItems.map(ai => ai.id === id ? { ...ai, done } : ai));
  }

  function reset() {
    setSession(null);
    setStep(1);
    setTimelineSummary('');
  }

  return (
    <div className="min-h-screen relative">
      {/* Background image */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          backgroundImage: `url('/images/bg.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      {/* Semi-transparent overlay */}
      <div className="fixed inset-0 -z-10 bg-white/92" />

      <header className="border-b border-border bg-card/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="w-[80%] max-w-none mx-auto px-4 py-4 flex items-center justify-between">
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
        <div className="border-b border-border bg-card/90 backdrop-blur-sm sticky top-[65px] z-10">
          <div className="w-[80%] max-w-none mx-auto px-4">
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

      <main className="w-[80%] max-w-none mx-auto px-4 py-8">
        {step === 1 && (
          <TranscriptUploader onSubmit={handleUpload} loading={loading} error={error} />
        )}
        {step === 2 && session?.epics && (
          <BacklogReview
            epics={session.epics}
            dependencies={session.dependencies ?? []}
            raci={session.raci ?? []}
            risks={session.risks ?? []}
            actionItems={session.actionItems ?? []}
            projectStartDate={session.projectStartDate ?? ''}
            stakeholders={session.stakeholders ?? []}
            onEpicsChange={handleEpicsChange}
            onDepsChange={handleDepsChange}
            onRaciChange={handleRaciChange}
            onRisksChange={handleRisksChange}
            onActionItemsChange={handleActionItemsChange}
            forecastedEndDate={session.forecastedEndDate ?? ''}
            onProjectStartDateChange={handleProjectStartDate}
            onForecastedEndDateChange={handleForecastedEndDate}
            onApprove={() => setStep(3)}
          />
        )}
        {step === 3 && session?.epics && (
          <Timeline
            epics={session.epics}
            dependencies={session.dependencies ?? []}
            actionItems={session.actionItems ?? []}
            projectStartDate={session.projectStartDate ?? ''}
            forecastedEndDate={session.forecastedEndDate ?? ''}
            stakeholders={session.stakeholders ?? []}
            phases={session.phases ?? []}
            onActionItemsChange={handleActionItemsChange}
            onSummaryChange={setTimelineSummary}
            onPhasesChange={handlePhasesChange}
            onApprove={() => setStep(4)}
          />
        )}
        {step === 4 && session?.epics && (
          <ExportPanel
            epics={session.epics}
            dependencies={session.dependencies ?? []}
            raci={session.raci ?? []}
            risks={session.risks ?? []}
            actionItems={session.actionItems ?? []}
            meetingMinutes={session.meetingMinutes ?? ''}
            timelineSummary={timelineSummary}
            stakeholders={session.stakeholders ?? []}
            votes={session.votes ?? []}
            onVotesChange={handleVotesChange}
            onDone={reset}
          />
        )}
      </main>

      <CeremonyIQAssistant session={session} onActionItemToggle={handleActionItemToggle} />

      <footer className="border-t border-border bg-card/80 backdrop-blur-sm mt-12">
        <div className="w-[80%] max-w-none mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            Crafted with <span className="text-red-400">♥</span> by{' '}
            <a
              href="https://agileaiarnab.lovable.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline underline-offset-2"
            >
              Arnab Chakrabortty
            </a>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            CeremonyIQ · SAFe Backlog Generator
          </span>
        </div>
      </footer>
    </div>
  );
}
