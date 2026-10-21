import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from './AuthState';
import { defaultState, loadState, saveState } from '../lib/storage';
import { api, type ApiProgress } from '../lib/api';
import type { Activity, AppState } from '../types';

type AppStateContextValue = { state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; addActivity: (activity: Omit<Activity, 'id' | 'createdAt'>) => void; toggleBookmark: (id: string) => void; completeLesson: (id: string, title: string) => void; completeChallenge: (id: string, title: string) => void; solveExercise: (id: string, title: string) => void; recordAttempt: (exerciseId: string, answer: string, correct: boolean, title: string) => void; resetProgress: () => void };
const Context = createContext<AppStateContextValue | null>(null);

function toApiProgress(state: AppState): ApiProgress {
  const noteConflicts = new Set(Object.keys(state.noteConflicts));
  return {
    completed_lessons: state.completedLessons,
    completed_challenges: state.completedChallenges,
    challenge_attempts: state.challengeAttempts.map((attempt) => ({ id: attempt.id, challenge_id: attempt.challengeId, reflection: attempt.reflection, completed_at: attempt.completedAt })),
    solved_exercises: state.solvedExercises,
    bookmarks: state.bookmarks,
    notes: Object.fromEntries(Object.entries(state.notes).filter(([lessonId]) => !noteConflicts.has(lessonId))),
    note_versions: state.noteVersions,
    note_conflicts: {},
    attempts: state.attempts.map((attempt) => ({ id: attempt.id, exercise_id: attempt.exerciseId, answer: attempt.answer, correct: attempt.correct, attempted_at: attempt.attemptedAt })),
  };
}

function mergeRemoteProgress(state: AppState, remote: ApiProgress): AppState {
  const attempts = new Map([...remote.attempts.map((attempt) => ({ id: attempt.id ?? crypto.randomUUID(), exerciseId: attempt.exercise_id, answer: attempt.answer, correct: attempt.correct, attemptedAt: attempt.attempted_at ?? new Date().toISOString() })), ...state.attempts].map((attempt) => [attempt.id, attempt]));
  return {
    ...state,
    completedLessons: [...new Set([...state.completedLessons, ...remote.completed_lessons])],
    completedChallenges: [...new Set([...state.completedChallenges, ...remote.completed_challenges])],
    challengeAttempts: [...new Map([
      ...remote.challenge_attempts.map((attempt) => { const id = attempt.id ?? crypto.randomUUID(); return [id, { id, challengeId: attempt.challenge_id, reflection: attempt.reflection, completedAt: attempt.completed_at ?? new Date().toISOString() }] as const; }),
      ...state.challengeAttempts.map((attempt) => [attempt.id, attempt] as const),
    ]).values()].slice(0, 100),
    solvedExercises: [...new Set([...state.solvedExercises, ...remote.solved_exercises])],
    bookmarks: [...new Set([...state.bookmarks, ...remote.bookmarks])],
    notes: { ...remote.notes, ...state.notes },
    noteVersions: { ...remote.note_versions, ...state.noteVersions },
    noteConflicts: state.noteConflicts,
    attempts: [...attempts.values()].slice(0, 100),
  };
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState());
  const { user } = useAuth();
  const [syncReadyFor, setSyncReadyFor] = useState<string | null>(null);
  useEffect(() => { saveState(state); document.documentElement.dataset.theme = state.theme; }, [state]);
  useEffect(() => {
    if (!user) { setSyncReadyFor(null); return; }
    let cancelled = false;
    setSyncReadyFor(null);
    api.getProgress().then((remote) => { if (!cancelled) { setState((current) => mergeRemoteProgress(current, remote)); setSyncReadyFor(user.id); } }).catch(() => { if (!cancelled) setSyncReadyFor(user.id); });
    return () => { cancelled = true; };
  }, [user?.id]);
  useEffect(() => {
    if (!user || syncReadyFor !== user.id) return;
    const timer = window.setTimeout(() => {
      void api.syncProgress(toApiProgress(state)).then((remote) => {
        if (!Object.keys(remote.note_conflicts).length) return;
        setState((current) => ({
          ...current,
          noteVersions: { ...current.noteVersions, ...remote.note_versions },
          noteConflicts: {
            ...current.noteConflicts,
            ...Object.fromEntries(Object.entries(remote.note_conflicts).map(([lessonId, conflict]) => [lessonId, {
              localBody: conflict.local_body,
              serverBody: conflict.server_body,
              serverUpdatedAt: conflict.server_updated_at,
            }])),
          },
        }));
      }).catch(() => undefined);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [state, syncReadyFor, user]);
  const value = useMemo<AppStateContextValue>(() => ({
    state,
    setState,
    addActivity: (activity) => setState((current) => ({ ...current, activity: [{ ...activity, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...current.activity].slice(0, 20) })),
    toggleBookmark: (id) => setState((current) => ({ ...current, bookmarks: current.bookmarks.includes(id) ? current.bookmarks.filter((item) => item !== id) : [...current.bookmarks, id] })),
    completeLesson: (id, title) => setState((current) => current.completedLessons.includes(id) ? current : { ...current, completedLessons: [...current.completedLessons, id], activity: [{ id: crypto.randomUUID(), label: 'Lesson completed', detail: title, createdAt: new Date().toISOString(), kind: 'lesson' as const }, ...current.activity].slice(0, 20) }),
    completeChallenge: (id, title) => setState((current) => current.completedChallenges.includes(id) ? current : { ...current, completedChallenges: [...current.completedChallenges, id], activity: [{ id: crypto.randomUUID(), label: 'Mission completed', detail: title, createdAt: new Date().toISOString(), kind: 'challenge' as const }, ...current.activity].slice(0, 20) }),
    solveExercise: (id, title) => setState((current) => current.solvedExercises.includes(id) ? current : { ...current, solvedExercises: [...current.solvedExercises, id], activity: [{ id: crypto.randomUUID(), label: 'Exercise solved', detail: title, createdAt: new Date().toISOString(), kind: 'exercise' as const }, ...current.activity].slice(0, 20) }),
    recordAttempt: (exerciseId, answer, correct, title) => setState((current) => ({
      ...current,
      attempts: [{ id: crypto.randomUUID(), exerciseId, answer, correct, attemptedAt: new Date().toISOString() }, ...current.attempts].slice(0, 100),
      solvedExercises: correct && !current.solvedExercises.includes(exerciseId) ? [...current.solvedExercises, exerciseId] : current.solvedExercises,
      activity: correct && !current.solvedExercises.includes(exerciseId)
        ? [{ id: crypto.randomUUID(), label: 'Exercise solved', detail: title, createdAt: new Date().toISOString(), kind: 'exercise' as const }, ...current.activity].slice(0, 20)
        : current.activity,
    })),
    resetProgress: () => setState(defaultState),
  }), [state]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAppState() { const value = useContext(Context); if (!value) throw new Error('useAppState must be used inside AppStateProvider'); return value; }
