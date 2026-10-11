import { useState, useCallback } from 'react';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { extractBacklog } from '../lib/groq';
import type { Session, Epic, Feature, Story, Stakeholder } from '../types';

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startExtraction = useCallback(async (transcript: string, title: string, stakeholders: Stakeholder[] = []) => {
    setLoading(true);
    setError(null);
    try {
      const sessionId = `session-${Date.now()}`;
      const sessionRef = doc(db, 'sessions', sessionId);

      await setDoc(sessionRef, {
        title,
        transcriptRaw: transcript,
        createdAt: serverTimestamp(),
        status: 'processing',
      });

      const extracted = await extractBacklog(transcript);

      const batch: Promise<void>[] = [];
      extracted.epics?.forEach(({ features, ...epicData }) => {
        const epicRef = doc(collection(sessionRef, 'epics'), epicData.id);
        batch.push(setDoc(epicRef, epicData));
        features?.forEach(({ stories, ...featData }) => {
          const featRef = doc(collection(epicRef, 'features'), featData.id);
          batch.push(setDoc(featRef, featData));
          stories?.forEach(story => {
            batch.push(setDoc(doc(collection(featRef, 'stories'), story.id), story));
          });
        });
      });
      extracted.dependencies?.forEach((dep, i) =>
        batch.push(setDoc(doc(collection(sessionRef, 'dependencies'), `dep-${i}`), dep))
      );
      extracted.raci?.forEach((r, i) =>
        batch.push(setDoc(doc(collection(sessionRef, 'raci'), `raci-${i}`), r))
      );
      extracted.impediments?.forEach((imp, i) =>
        batch.push(setDoc(doc(collection(sessionRef, 'impediments'), `imp-${i}`), imp))
      );
      extracted.risks?.forEach((risk, i) =>
        batch.push(setDoc(doc(collection(sessionRef, 'risks'), `risk-${i}`), risk))
      );
      extracted.actionItems?.forEach((ai, i) =>
        batch.push(setDoc(doc(collection(sessionRef, 'actionItems'), `ai-${i}`), ai))
      );
      await Promise.all(batch);
      await setDoc(sessionRef, { status: 'complete', meetingMinutes: extracted.meetingMinutes ?? '' }, { merge: true });

      setSession({
        id: sessionId,
        title,
        transcriptRaw: transcript,
        createdAt: new Date(),
        status: 'complete',
        epics: extracted.epics ?? [],
        dependencies: extracted.dependencies ?? [],
        raci: extracted.raci ?? [],
        impediments: extracted.impediments ?? [],
        risks: extracted.risks ?? [],
        actionItems: extracted.actionItems ?? [],
        meetingMinutes: extracted.meetingMinutes ?? '',
        stakeholders,
        phases: extracted.phases ?? [],
        votes: [],
      });
      return true;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Extraction failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateEpic = useCallback((epicId: string, changes: Partial<Epic>) => {
    setSession(prev => prev ? {
      ...prev,
      epics: prev.epics?.map(e => e.id === epicId ? { ...e, ...changes } : e),
    } : prev);
  }, []);

  const updateFeature = useCallback((epicId: string, featureId: string, changes: Partial<Feature>) => {
    setSession(prev => prev ? {
      ...prev,
      epics: prev.epics?.map(e =>
        e.id === epicId
          ? { ...e, features: e.features.map(f => f.id === featureId ? { ...f, ...changes } : f) }
          : e
      ),
    } : prev);
  }, []);

  const updateStory = useCallback((epicId: string, featureId: string, storyId: string, changes: Partial<Story>) => {
    setSession(prev => prev ? {
      ...prev,
      epics: prev.epics?.map(e =>
        e.id === epicId ? {
          ...e,
          features: e.features.map(f =>
            f.id === featureId ? {
              ...f,
              stories: f.stories.map(s => s.id === storyId ? { ...s, ...changes } : s),
            } : f
          ),
        } : e
      ),
    } : prev);
  }, []);

  return { session, loading, error, startExtraction, updateEpic, updateFeature, updateStory, setSession };
}
