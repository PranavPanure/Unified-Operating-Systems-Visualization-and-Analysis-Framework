import type { AppState } from '../types';

export const STORAGE_KEY = 'os-a2z-state-v1';

export const defaultState: AppState = {
  completedLessons: [],
  completedChallenges: [],
  challengeAttempts: [],
  solvedExercises: [],
  bookmarks: [],
  notes: {},
  noteVersions: {},
  noteConflicts: {},
  activity: [],
  attempts: [],
  theme: 'dark',
  streakAnchor: new Date().toISOString().slice(0, 10),
};

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    return { ...defaultState, ...JSON.parse(raw) } as AppState;
  } catch { return defaultState; }
}

export function saveState(state: AppState) { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

export function completionFor(completed: string[], total: number) {
  return total === 0 ? 0 : Math.round((completed.length / total) * 100);
}
