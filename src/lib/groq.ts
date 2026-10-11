import Groq from 'groq-sdk';
import type { Epic, Dependency, RaciItem, Impediment, Risk, ActionItem, Phase } from '../types';

const SYSTEM_PROMPT = `You are an expert SAFe Agile coach. Extract from the transcript and return ONLY valid JSON:
{"epics":[{"id":"epic-1","title":"","description":"","sprint":1,"size":"XL","points":8,"confidence":0.9,"features":[{"id":"feat-1","title":"","description":"","sprint":1,"endSprint":2,"size":"M","points":3,"confidence":0.85,"plannedStartDate":null,"stories":[{"id":"story-1","asA":"","iWant":"","soThat":"","sprint":1,"size":"S","points":2,"confidence":0.8,"assignee":null,"tags":[],"moscow":"Must Have"}]}]}],"dependencies":[{"from":"feat-2","to":"feat-1","type":"blocks","reason":""}],"raci":[{"feature":"feat-1","accountable":"","responsible":[],"consulted":[],"informed":[]}],"impediments":[{"description":"","owner":"","status":"open"}],"risks":[{"description":"","impact":"High","mitigation":"","owner":""}],"actionItems":[{"description":"","owner":"","dueDate":null}],"phases":[{"name":"","startDate":null,"endDate":null,"type":"Custom"}],"meetingMinutes":"3-5 sentence summary."}
Rules: XS=1 S=2 M=3 L=5 XL=8. Velocity 40pts/sprint. Confidence 0-1. Dates YYYY-MM-DD or null. Tags: Development/Test/Support/DevOps/Design. MoSCoW: Must Have/Should Have/Could Have/Won't Have. Phases: Code Lock/Freeze/Moratorium/Year End Shutdown/go-live blackout.`;

export interface ExtractedBacklog {
  epics: Epic[];
  dependencies: Dependency[];
  raci: RaciItem[];
  impediments: Impediment[];
  risks: Risk[];
  actionItems: ActionItem[];
  phases: Phase[];
  meetingMinutes: string;
}

export async function extractBacklog(transcript: string): Promise<ExtractedBacklog> {
  const groq = new Groq({
    apiKey: import.meta.env.VITE_GROQ_API_KEY,
    dangerouslyAllowBrowser: true,
  });

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: transcript },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 8192,
  });

  const raw = response.choices[0].message.content ?? '{}';
  console.log('[Groq raw response]', raw.slice(0, 500));
  const parsed = JSON.parse(raw);
  const data = parsed.epics ? parsed : (Object.values(parsed)[0] as ExtractedBacklog) ?? parsed;
  console.log('[Extracted epics count]', data.epics?.length);

  const risks: Risk[] = (data.risks ?? []).map((r: Omit<Risk, 'id' | 'status'> & { status?: string }, i: number) => ({
    id: `risk-${i + 1}`,
    status: 'open' as const,
    ...r,
  }));
  const actionItems: ActionItem[] = (data.actionItems ?? []).map((a: Omit<ActionItem, 'id' | 'done'>, i: number) => ({
    id: `ai-${i + 1}`,
    done: false,
    ...a,
  }));
  const phases: Phase[] = (data.phases ?? []).filter((p: Partial<Phase>) => p.name && p.startDate).map((p: Partial<Phase>, i: number) => ({
    id: `phase-${i + 1}`,
    type: 'Custom' as const,
    endDate: p.startDate ?? '',
    ...p,
  }));

  return {
    ...data,
    risks,
    actionItems,
    phases,
    meetingMinutes: data.meetingMinutes ?? '',
  } as ExtractedBacklog;
}

export async function askAboutTranscript(transcript: string, question: string): Promise<string> {
  const groq = new Groq({
    apiKey: import.meta.env.VITE_GROQ_API_KEY,
    dangerouslyAllowBrowser: true,
  });

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: 'You are CeremonyIQ, an AI Agile coach. Answer questions concisely based on the meeting transcript. Be specific and reference names/items from the transcript.',
      },
      { role: 'user', content: `Transcript:\n${transcript}\n\nQuestion: ${question}` },
    ],
    max_tokens: 512,
  });

  return response.choices[0].message.content ?? 'Unable to answer.';
}
