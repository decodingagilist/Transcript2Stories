const functions = require('firebase-functions');
const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const Groq = require('groq-sdk');

if (!getApps().length) initializeApp();

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

exports.extractTranscript = functions.https.onCall(async (data) => {
  const { transcript, sessionId } = data;
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const db = getFirestore();

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: transcript }
    ],
    response_format: { type: 'json_object' },
    max_tokens: 8192
  });

  const extracted = JSON.parse(response.choices[0].message.content);
  const sessionRef = db.collection('sessions').doc(sessionId);

  const batch = db.batch();
  extracted.epics?.forEach(epic => {
    const epicRef = sessionRef.collection('epics').doc(epic.id);
    batch.set(epicRef, { ...epic, features: undefined });
    epic.features?.forEach(feat => {
      const featRef = epicRef.collection('features').doc(feat.id);
      batch.set(featRef, { ...feat, stories: undefined });
      feat.stories?.forEach(story => {
        batch.set(featRef.collection('stories').doc(story.id), story);
      });
    });
  });
  extracted.dependencies?.forEach((dep, i) => {
    batch.set(sessionRef.collection('dependencies').doc(`dep-${i}`), dep);
  });
  extracted.raci?.forEach((r, i) => {
    batch.set(sessionRef.collection('raci').doc(`raci-${i}`), r);
  });
  extracted.impediments?.forEach((imp, i) => {
    batch.set(sessionRef.collection('impediments').doc(`imp-${i}`), imp);
  });

  await batch.commit();
  await sessionRef.update({ status: 'complete' });
  return { status: 'complete', sessionId };
});
