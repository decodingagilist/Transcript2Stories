import { useState, useRef, useEffect } from 'react';
import type { Session } from '../types';
import { askAboutTranscript } from '../lib/groq';
import { MessageCircle, X, Send, Loader2, CheckSquare, Square } from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  session: Session | null;
  onActionItemToggle: (id: string, done: boolean) => void;
}

interface ChatMsg { role: 'user' | 'assistant'; content: string; }

type Tab = 'actions' | 'chat';

export function CeremonyIQAssistant({ session, onActionItemToggle }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('actions');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || !session?.transcriptRaw) return;
    const q = input.trim();
    setInput('');
    setMessages(p => [...p, { role: 'user', content: q }]);
    setLoading(true);
    try {
      const answer = await askAboutTranscript(session.transcriptRaw, q);
      setMessages(p => [...p, { role: 'assistant', content: answer }]);
    } catch {
      setMessages(p => [...p, { role: 'assistant', content: 'Sorry, I could not process that. Check your Groq API key.' }]);
    } finally {
      setLoading(false);
    }
  }

  const actionItems = session?.actionItems ?? [];
  const pendingCount = actionItems.filter(a => !a.done).length;

  return (
    <>
      {/* Floating button */}
      <button
        className={cn(
          'fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all',
          open ? 'bg-muted border border-border text-foreground' : 'bg-primary text-primary-foreground hover:opacity-90'
        )}
        onClick={() => setOpen(o => !o)}
        title="CeremonyIQ Assistant"
      >
        {open ? <X size={20} /> : <MessageCircle size={22} />}
        {!open && pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {pendingCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 max-h-[520px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border bg-primary/5 shrink-0">
            <div className="flex items-center gap-2">
              <MessageCircle size={16} className="text-primary" />
              <span className="font-semibold text-sm">CeremonyIQ Assistant</span>
              {session?.title && <span className="text-xs text-muted-foreground truncate ml-auto max-w-[100px]">{session.title}</span>}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border shrink-0">
            <button
              className={cn('flex-1 py-2 text-xs font-medium transition-colors', tab === 'actions' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground')}
              onClick={() => setTab('actions')}
            >
              Action Items {pendingCount > 0 && <span className="ml-1 text-[10px] bg-primary/10 text-primary px-1.5 rounded-full">{pendingCount}</span>}
            </button>
            <button
              className={cn('flex-1 py-2 text-xs font-medium transition-colors', tab === 'chat' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground')}
              onClick={() => setTab('chat')}
            >
              Ask about meeting
            </button>
          </div>

          {/* Action Items Tab */}
          {tab === 'actions' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {actionItems.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  {session ? 'No action items extracted.' : 'Upload a transcript to see action items.'}
                </p>
              )}
              {actionItems.map(ai => (
                <button
                  key={ai.id}
                  className={cn('w-full flex items-start gap-2 text-left px-2 py-2 rounded-lg hover:bg-muted/30 transition-colors', ai.done && 'opacity-60')}
                  onClick={() => onActionItemToggle(ai.id, !ai.done)}
                >
                  {ai.done ? <CheckSquare size={15} className="text-primary shrink-0 mt-0.5" /> : <Square size={15} className="text-muted-foreground shrink-0 mt-0.5" />}
                  <div className="min-w-0">
                    <p className={cn('text-xs leading-relaxed', ai.done && 'line-through text-muted-foreground')}>{ai.description || 'Untitled action'}</p>
                    <div className="flex gap-2 mt-0.5">
                      {ai.owner && <span className="text-[10px] text-muted-foreground">{ai.owner}</span>}
                      {ai.dueDate && <span className="text-[10px] text-muted-foreground">{ai.dueDate}</span>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Chat Tab */}
          {tab === 'chat' && (
            <>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {messages.length === 0 && (
                  <div className="text-center py-4 space-y-1">
                    <p className="text-xs text-muted-foreground">Ask me anything about the meeting transcript.</p>
                    <p className="text-[10px] text-muted-foreground/70">e.g. "Who owns the API integration?" or "What was agreed on timelines?"</p>
                  </div>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                    <div className={cn('max-w-[90%] rounded-2xl px-3 py-2 text-xs leading-relaxed',
                      m.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted text-foreground rounded-bl-sm'
                    )}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2">
                      <Loader2 size={13} className="animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-3 border-t border-border shrink-0">
                <div className="flex gap-2">
                  <input
                    className="flex-1 text-xs border border-input rounded-full px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder={session ? 'Ask about the meeting…' : 'Upload a transcript first'}
                    value={input}
                    disabled={!session?.transcriptRaw}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  />
                  <button
                    className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 disabled:opacity-40 shrink-0"
                    onClick={sendMessage}
                    disabled={!input.trim() || !session?.transcriptRaw || loading}
                  >
                    <Send size={13} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
