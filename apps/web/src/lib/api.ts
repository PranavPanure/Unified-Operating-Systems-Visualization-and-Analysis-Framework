export type ApiUser = { id: string; email: string; display_name: string };
export type ApiNoteConflict = { local_body: string; server_body: string; server_updated_at: string };
export type ApiAnalytics = { completed_lessons: number; completed_challenges: number; challenge_attempts: number; reflections: number; solved_exercises: number; practice_attempts: number; practice_accuracy: number; recent_reflections: Array<{ challenge_id: string; reflection: string; completed_at: string }> };
export type ApiPracticeAttempt = { id: string; exercise_id: string; answer: string; correct: boolean; attempted_at: string };
export type ApiActivityEvent = { id: string; label: string; detail: string; kind: string; created_at: string };
export type ApiTerminalResult = { stdout: string; stderr: string; exit_code: number | null; timed_out: boolean; duration_ms: number; sandbox: string; session_id: string };
export type ApiMission = { id: string; title: string; module: string; objective: string; hint: string; expected_output: string };
export type ApiMissionValidation = { mission_id: string; passed: boolean; message: string };
export type ApiProgress = {
  completed_lessons: string[];
  completed_challenges: string[];
  challenge_attempts: Array<{ id?: string; challenge_id: string; reflection: string; completed_at?: string }>;
  solved_exercises: string[];
  bookmarks: string[];
  notes: Record<string, string>;
  note_versions: Record<string, string>;
  note_conflicts: Record<string, ApiNoteConflict>;
  attempts: Array<{ id?: string; exercise_id: string; answer: string; correct: boolean; attempted_at?: string }>;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api/v1';

function csrfToken() {
  return document.cookie.split('; ').find((cookie) => cookie.startsWith('os_a2z_csrf='))?.split('=')[1];
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const csrf = csrfToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(csrf && !['GET', 'HEAD', 'OPTIONS'].includes(method) ? { 'X-CSRF-Token': csrf } : {}), ...(options.headers ?? {}) },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { detail?: string | Array<{ msg?: string }> };
    const detail = Array.isArray(payload.detail) ? payload.detail.map((item) => item.msg).filter(Boolean).join('; ') : payload.detail;
    throw new Error(detail ?? `Request failed (${response.status})`);
  }
  return response.status === 204 ? (undefined as T) : response.json() as Promise<T>;
}

export const api = {
  me: () => request<ApiUser>('/auth/me'),
  register: (payload: { email: string; password: string; display_name: string }) => request<ApiUser>('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload: { email: string; password: string }) => request<ApiUser>('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  getProgress: () => request<ApiProgress>('/progress'),
  getAnalytics: () => request<ApiAnalytics>('/analytics'),
  getPracticeAttempts: (limit = 8) => request<{ attempts: ApiPracticeAttempt[] }>(`/practice/attempts?limit=${limit}`),
  getActivity: (limit = 8) => request<{ events: ApiActivityEvent[] }>(`/activity?limit=${limit}`),
  executeTerminal: (payload: { command: string; cwd?: string; timeout_ms?: number; session_id?: string }) => request<ApiTerminalResult>('/terminal/execute', { method: 'POST', body: JSON.stringify(payload) }),
  resetTerminalSession: (sessionId: string) => request<void>(`/terminal/sessions/${sessionId}`, { method: 'DELETE' }),
  getMissions: () => request<ApiMission[]>('/missions'),
  validateMission: (payload: { mission_id: string; stdout: string; exit_code: number | null }) => request<ApiMissionValidation>('/missions/validate', { method: 'POST', body: JSON.stringify(payload) }),
  syncProgress: (payload: ApiProgress) => request<ApiProgress>('/progress', { method: 'PUT', body: JSON.stringify(payload) }),
};
