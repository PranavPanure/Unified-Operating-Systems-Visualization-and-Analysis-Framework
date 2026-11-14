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
  goal: 'foundation',
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

const localDay = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** Counts consecutive days ending today (or yesterday, so a streak is not lost before the first activity of the day). */
export function currentStreak(state: AppState, now = new Date()) {
  const days = new Set<string>();
  const mark = (value?: string) => { if (value) days.add(localDay(new Date(value))); };
  state.activity.forEach((item) => mark(item.createdAt));
  state.attempts.forEach((item) => mark(item.attemptedAt));
  state.challengeAttempts.forEach((item) => mark(item.completedAt));
  if (days.size === 0) return 0;
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!days.has(localDay(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(localDay(cursor))) { streak += 1; cursor.setDate(cursor.getDate() - 1); }
  return streak;
}
