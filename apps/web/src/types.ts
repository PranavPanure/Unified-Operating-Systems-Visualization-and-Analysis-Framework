export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export type Lesson = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  duration: string;
  labRoute: string;
  challenge: string;
  objectives: string[];
  workedExample: string;
  mistakes: string[];
  recap: string;
};

export type Module = {
  id: string;
  slug: string;
  number: number;
  title: string;
  description: string;
  difficulty: Difficulty;
  duration: string;
  accent: string;
  prerequisites: string[];
  lessons: Lesson[];
};

export type Command = {
  slug: string;
  name: string;
  category: string;
  description: string;
  syntax: string;
  examples: { input: string; output: string }[];
  safety?: string;
  concept: string;
};

export type Exercise = {
  id: string;
  moduleId: string;
  title: string;
  difficulty: Difficulty;
  type: 'multiple-choice' | 'short-answer' | 'terminal' | 'algorithm';
  prompt: string;
  options?: string[];
  answer: string;
  explanation: string;
  points: number;
};

export type Activity = {
  id: string;
  label: string;
  detail: string;
  createdAt: string;
  kind: 'lesson' | 'exercise' | 'visualizer' | 'terminal' | 'challenge';
};

export type AssessmentAttempt = {
  id: string;
  exerciseId: string;
  answer: string;
  correct: boolean;
  attemptedAt: string;
};

export type ChallengeAttempt = {
  id: string;
  challengeId: string;
  reflection: string;
  completedAt: string;
};

export type AppState = {
  completedLessons: string[];
  completedChallenges: string[];
  challengeAttempts: ChallengeAttempt[];
  solvedExercises: string[];
  bookmarks: string[];
  notes: Record<string, string>;
  noteVersions: Record<string, string>;
  noteConflicts: Record<string, { localBody: string; serverBody: string; serverUpdatedAt: string }>;
  activity: Activity[];
  attempts: AssessmentAttempt[];
  theme: 'dark' | 'light';
  streakAnchor: string;
};
