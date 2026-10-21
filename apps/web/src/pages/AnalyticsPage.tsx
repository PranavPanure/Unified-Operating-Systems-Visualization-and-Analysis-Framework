import { useEffect, useState } from 'react';
import { BarChart3, CalendarDays, CheckCircle2, ClipboardCheck, History, MessageSquareText, Target, TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { exercises, getExercise, getLesson, modules } from '../data/curriculum';
import { useAppState } from '../app/AppState';
import { useAuth } from '../app/AuthState';
import { api, type ApiActivityEvent, type ApiAnalytics, type ApiPracticeAttempt } from '../lib/api';
import { SectionHeader } from '../components/SectionHeader';

export function AnalyticsPage() {
  const { state } = useAppState();
  const { user } = useAuth();
  const [serverAnalytics, setServerAnalytics] = useState<ApiAnalytics | null>(null);
  const [serverAttempts, setServerAttempts] = useState<ApiPracticeAttempt[]>([]);
  const [serverActivity, setServerActivity] = useState<ApiActivityEvent[]>([]);
  useEffect(() => {
    if (!user) { setServerAnalytics(null); setServerAttempts([]); setServerActivity([]); return; }
    Promise.all([api.getAnalytics(), api.getPracticeAttempts(), api.getActivity()]).then(([analytics, history, activity]) => {
      setServerAnalytics(analytics);
      setServerAttempts(history.attempts);
      setServerActivity(activity.events);
    }).catch(() => { setServerAnalytics(null); setServerAttempts([]); setServerActivity([]); });
  }, [user?.id]);
  const totalLessons = modules.reduce((sum, module) => sum + module.lessons.length, 0);
  const data = modules.slice(0, 7).map((module) => ({ name: `M${module.number}`, completed: module.lessons.filter((lesson) => state.completedLessons.includes(lesson.id)).length, total: module.lessons.length }));
  const reviewQueue = exercises.filter((exercise) => !state.solvedExercises.includes(exercise.id) && state.attempts.some((attempt) => attempt.exerciseId === exercise.id && !attempt.correct));
  const accuracy = state.attempts.length === 0 ? 0 : Math.round((state.attempts.filter((attempt) => attempt.correct).length / state.attempts.length) * 100);
  const challengeRate = totalLessons === 0 ? 0 : Math.round((state.completedChallenges.length / totalLessons) * 100);
  const reflections = state.challengeAttempts.filter((attempt) => attempt.reflection.trim()).slice(0, 6);
  const challengeModules = modules.map((module) => {
    const lessonIds = new Set(module.lessons.map((lesson) => lesson.id));
    const completed = module.lessons.filter((lesson) => state.completedChallenges.includes(lesson.id)).length;
    const attempts = state.challengeAttempts.filter((attempt) => lessonIds.has(attempt.challengeId)).length;
    return { ...module, completed, attempts, rate: module.lessons.length === 0 ? 0 : Math.round((completed / module.lessons.length) * 100) };
  });

  return <div className="page-stack">
    <SectionHeader eyebrow="ANALYTICS / MASTERY" title="See where the model is strong." description="Analytics are derived from your local lesson, challenge, and exercise records. No activity is fabricated." />
    <div className="stat-grid">
      <div className="stat-card"><span className="stat-icon"><TrendingUp size={18} /></span><strong>{state.completedLessons.length}</strong><span>Lessons completed</span></div>
      <div className="stat-card"><span className="stat-icon"><CheckCircle2 size={18} /></span><strong>{state.solvedExercises.length}</strong><span>Exercises solved</span></div>
      <div className="stat-card"><span className="stat-icon"><CalendarDays size={18} /></span><strong>{accuracy}%</strong><span>Attempt accuracy</span></div>
      <div className="stat-card"><span className="stat-icon"><BarChart3 size={18} /></span><strong>{state.attempts.length}</strong><span>Practice attempts</span></div>
      <div className="stat-card"><span className="stat-icon"><Target size={18} /></span><strong>{challengeRate}%</strong><span>Challenges completed</span></div>
      <div className="stat-card"><span className="stat-icon"><MessageSquareText size={18} /></span><strong>{reflections.length}</strong><span>Recent reflections</span></div>
    </div>
    {serverAnalytics && <div className="analytics-sync-note"><span className="status-dot" /><span>Account snapshot synced: {serverAnalytics.completed_challenges} challenges, {serverAnalytics.challenge_attempts} attempts, {serverAnalytics.reflections} reflections.</span></div>}
    <div className="analytics-grid">
      <section className="panel chart-panel"><div className="panel-title"><div><span className="eyebrow">MODULE COVERAGE</span><h2>Progress by module</h2></div></div><div className="chart-wrap"><ResponsiveContainer width="100%" height={280}><BarChart data={data}><CartesianGrid stroke="#263544" vertical={false} /><XAxis dataKey="name" stroke="#7890a2" /><YAxis stroke="#7890a2" allowDecimals={false} /><Tooltip contentStyle={{ background: '#17212b', border: '1px solid #334a5d', borderRadius: 8, color: '#f4f7fa' }} /><Bar dataKey="completed" fill="#71d8cc" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></section>
      <section className="panel weak-panel"><div className="panel-title"><div><span className="eyebrow">NEXT REVIEW</span><h2>Revision queue</h2></div></div>{reviewQueue.length === 0 ? <div className="empty-state"><TrendingUp size={18} /><div><strong>Your queue is clear.</strong><span>Miss a practice question and it will appear here until you solve it.</span></div></div> : <div className="activity-list">{reviewQueue.map((exercise) => <div className="activity-row" key={exercise.id}><span className="activity-icon"><TrendingUp size={15} /></span><div><strong>{exercise.title}</strong><small>{getExercise(exercise.id)?.difficulty} · revisit in Practice</small></div></div>)}</div>}</section>
    </div>
    <section className="panel reflection-panel"><div className="panel-title"><div><span className="eyebrow">LAB NOTEBOOK</span><h2>Recent challenge reflections</h2></div><span className="reflection-count">{state.challengeAttempts.length} attempt{state.challengeAttempts.length === 1 ? '' : 's'}</span></div>{reflections.length === 0 ? <div className="empty-state"><MessageSquareText size={18} /><div><strong>No reflections yet.</strong><span>Complete a lesson challenge and write what changed in the experiment.</span></div></div> : <div className="reflection-list">{reflections.map((attempt) => <article className="reflection-row" key={attempt.id}><div><strong>{getLesson(attempt.challengeId)?.title ?? attempt.challengeId}</strong><small>{new Date(attempt.completedAt).toLocaleString()}</small></div><p>{attempt.reflection}</p></article>)}</div>}</section>
    <section className="panel challenge-module-panel"><div className="panel-title"><div><span className="eyebrow">CHALLENGE COVERAGE</span><h2>Practice by module</h2></div><span className="reflection-count">Lowest rates need attention</span></div><div className="challenge-module-list">{challengeModules.map((module) => <div className="challenge-module-row" key={module.id}><div className="challenge-module-copy"><strong>M{module.number} · {module.title}</strong><small>{module.completed}/{module.lessons.length} challenges · {module.attempts} attempt{module.attempts === 1 ? '' : 's'}</small></div><div className="challenge-module-track"><i style={{ width: `${module.rate}%`, background: module.accent }} /></div><b>{module.rate}%</b></div>)}</div></section>
    {user && <section className="panel reflection-panel"><div className="panel-title"><div><span className="eyebrow">ACCOUNT HISTORY</span><h2>Recent practice attempts</h2></div><span className="reflection-count">{serverAttempts.length} loaded</span></div>{serverAttempts.length === 0 ? <div className="empty-state"><ClipboardCheck size={18} /><div><strong>No account attempts yet.</strong><span>Submit an exercise and it will appear here.</span></div></div> : <div className="activity-list">{serverAttempts.map((attempt) => <div className="activity-row" key={attempt.id}><span className="activity-icon">{attempt.correct ? <CheckCircle2 size={15} /> : <Target size={15} />}</span><div><strong>{getExercise(attempt.exercise_id)?.title ?? attempt.exercise_id}</strong><small>{attempt.correct ? 'Correct' : 'Needs another pass'} · {new Date(attempt.attempted_at).toLocaleString()}</small></div></div>)}</div>}</section>}
    {user && <section className="panel reflection-panel"><div className="panel-title"><div><span className="eyebrow">LEARNING TIMELINE</span><h2>Recent account activity</h2></div><span className="reflection-count">{serverActivity.length} loaded</span></div>{serverActivity.length === 0 ? <div className="empty-state"><History size={18} /><div><strong>No activity yet.</strong><span>Your completed lessons and submitted work will appear here.</span></div></div> : <div className="activity-list">{serverActivity.map((event) => <div className="activity-row" key={event.id}><span className="activity-icon"><History size={15} /></span><div><strong>{event.label}</strong><small>{event.detail} · {new Date(event.created_at).toLocaleString()}</small></div></div>)}</div>}</section>}
  </div>;
}
