import Groq from 'groq-sdk';
import type { Epic, Dependency, RaciItem, Impediment } from '../types';

const SYSTEM_PROMPT = `You are an expert Agile coach and SAFe practitioner.
Extract from the meeting transcript and return ONLY valid JSON:
{
  "epics": [{
    "id": "epic-1",
    "title": "",
    "description": "",
    "sprint": 1,
    "size": "XL",
    "points": 8,
    "confidence": 0.9,
    "features": [{
      "id": "feat-1",
      "title": "",
      "description": "",
      "sprint": 1,
      "size": "M",
      "points": 3,
      "confidence": 0.85,
      "stories": [{
        "id": "story-1",
        "asA": "",
        "iWant": "",
        "soThat": "",
        "sprint": 1,
        "size": "S",
        "points": 2,
        "confidence": 0.8
      }]
    }]
  }],
  "dependencies": [{"from": "feat-2", "to": "feat-1", "type": "blocks", "reason": ""}],
  "raci": [{"feature": "feat-1", "accountable": "", "responsible": [], "consulted": [], "informed": []}],
  "impediments": [{"description": "", "owner": "", "status": "open"}]
}
T-shirt points: XS=1 S=2 M=3 L=5 XL=8. Velocity 40 pts/sprint. Confidence 0-1.`;

export interface ExtractedBacklog {
  epics: Epic[];
  dependencies: Dependency[];
  raci: RaciItem[];
  impediments: Impediment[];
}

export async function extractBacklog(transcript: string): Promise<ExtractedBacklog> {
  const groq = new Groq({
    apiKey: import.meta.env.VITE_GROQ_API_KEY,
    dangerouslyAllowBrowser: true,
  });

  const response = await groq.chat.completions.create({
    model: 'openai/gpt-oss-20b',
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
  // Handle models that wrap output in a top-level key
  const data = parsed.epics ? parsed : (Object.values(parsed)[0] as ExtractedBacklog) ?? parsed;
  console.log('[Extracted epics count]', data.epics?.length);
  return data as ExtractedBacklog;
}
