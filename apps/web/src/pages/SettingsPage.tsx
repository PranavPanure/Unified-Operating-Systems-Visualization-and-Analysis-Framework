import { Download, RotateCcw, Trash2 } from 'lucide-react';
import { useAppState } from '../app/AppState';
import { SectionHeader } from '../components/SectionHeader';
import type { AppState } from '../types';

type Goal = AppState['goal'];

const goals: Array<{ value: Goal; label: string; detail: string }> = [
  { value: 'foundation', label: 'Build OS foundations', detail: 'Follow the roadmap in order and finish every lesson challenge.' },
  { value: 'interviews', label: 'Prepare for interviews', detail: 'Prioritise scheduling, paging, synchronization and deadlock analysis.' },
  { value: 'linux', label: 'Become fluent in Linux', detail: 'Spend more time in the terminal, command reference and missions.' },
];

export function SettingsPage() {
  const { state, setState, resetProgress } = useAppState();
  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'os-a2z-progress.json';
    link.click();
    URL.revokeObjectURL(url);
  };
  const activeGoal = goals.find((goal) => goal.value === state.goal) ?? goals[0];
  return <div className="page-stack">
    <SectionHeader eyebrow="SETTINGS / LOCAL PROFILE" title="Tune your learning workspace." description="Progress is stored in this browser until you connect an account. Export it before clearing the workspace." />
    <div className="settings-grid">
      <section className="panel settings-card">
        <span className="eyebrow">PREFERENCES</span>
        <h2>Learning goal</h2>
        <select aria-label="Learning goal" value={state.goal} onChange={(event) => setState((current) => ({ ...current, goal: event.target.value as Goal }))}>
          {goals.map((goal) => <option key={goal.value} value={goal.value}>{goal.label}</option>)}
        </select>
        <p className="settings-note">{activeGoal.detail}</p>
      </section>
      <section className="panel settings-card danger-card">
        <span className="eyebrow">DATA CONTROL</span>
        <h2>Your local records</h2>
        <p>{state.completedLessons.length} lessons, {state.solvedExercises.length} exercises, and {state.activity.length} activity events are stored in this browser.</p>
        <button className="button button-secondary" onClick={exportData}><Download size={16} /> Export progress</button>
        <button className="button button-danger" onClick={() => { if (window.confirm('Reset all local OS A2Z progress?')) resetProgress(); }}><Trash2 size={16} /> Reset all progress</button>
        <small><RotateCcw size={14} /> Reset keeps the curriculum but clears your records.</small>
      </section>
    </div>
  </div>;
}
