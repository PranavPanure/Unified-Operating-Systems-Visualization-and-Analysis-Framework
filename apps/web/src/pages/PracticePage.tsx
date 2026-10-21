import { useMemo, useState } from 'react';
import { CheckCircle2, Filter, Lightbulb, RotateCcw, Send, XCircle } from 'lucide-react';
import { exercises, modules } from '../data/curriculum';
import { useAppState } from '../app/AppState';
import { SectionHeader } from '../components/SectionHeader';
import type { Difficulty } from '../types';

const difficulties: Array<'All' | Difficulty> = ['All', 'Beginner', 'Intermediate', 'Advanced'];

export function PracticePage() {
  const { state, recordAttempt } = useAppState();
  const [moduleId, setModuleId] = useState('all');
  const [difficulty, setDifficulty] = useState<'All' | Difficulty>('All');
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const filteredExercises = useMemo(() => exercises.filter((exercise) => (
    (moduleId === 'all' || exercise.moduleId === moduleId) &&
    (difficulty === 'All' || exercise.difficulty === difficulty)
  )), [difficulty, moduleId]);
  const exercise = filteredExercises[index] ?? filteredExercises[0] ?? exercises[0];
  const correct = answer.trim().toLowerCase() === exercise.answer.toLowerCase();

  const selectExercise = (itemIndex: number) => {
    setIndex(itemIndex);
    setAnswer('');
    setSubmitted(false);
    setShowHint(false);
  };
  const changeModule = (nextModule: string) => {
    setModuleId(nextModule);
    if (difficulty !== 'All' && nextModule !== 'all' && !exercises.some((item) => item.moduleId === nextModule && item.difficulty === difficulty)) setDifficulty('All');
    selectExercise(0);
  };
  const changeDifficulty = (nextDifficulty: 'All' | Difficulty) => { setDifficulty(nextDifficulty); selectExercise(0); };
  const submit = () => { setSubmitted(true); recordAttempt(exercise.id, answer, correct, exercise.title); };
  const next = () => { selectExercise(filteredExercises.length === 0 ? 0 : (index + 1) % filteredExercises.length); };

  return <div className="page-stack">
    <SectionHeader
      eyebrow="PRACTICE / ACTIVE RECALL"
      title="Make the model answer back."
      description="Choose a lane, then work through focused exercises across the roadmap. Hints and explanations are part of the learning loop, not a penalty."
      action={<div className="practice-score"><strong>{state.solvedExercises.length}/{exercises.length}</strong><span>solved</span></div>}
    />
    <section className="panel practice-controls">
      <div className="practice-filter-title"><Filter size={16} /><strong>Choose your practice lane</strong><span>{filteredExercises.length} exercise{filteredExercises.length === 1 ? '' : 's'} available</span></div>
      <label><span>Module</span><select value={moduleId} onChange={(event) => changeModule(event.target.value)}><option value="all">All modules</option>{modules.map((module) => <option key={module.id} value={module.id}>M{module.number} · {module.title}</option>)}</select></label>
      <label><span>Difficulty</span><select value={difficulty} onChange={(event) => changeDifficulty(event.target.value as 'All' | Difficulty)}>{difficulties.map((level) => <option key={level} value={level} disabled={level !== 'All' && moduleId !== 'all' && !exercises.some((item) => item.moduleId === moduleId && item.difficulty === level)}>{level}</option>)}</select></label>
    </section>
    <div className="practice-layout">
      <aside className="practice-index panel">{filteredExercises.length === 0 ? <div className="empty-state"><strong>No exercises match.</strong><span>Try a different lane.</span></div> : filteredExercises.map((item, itemIndex) => <button key={item.id} className={`${itemIndex === index ? 'active' : ''} ${state.solvedExercises.includes(item.id) ? 'solved' : ''}`} onClick={() => selectExercise(itemIndex)}><span>{state.solvedExercises.includes(item.id) ? <CheckCircle2 size={15} /> : String(itemIndex + 1).padStart(2, '0')}</span><div><strong>{item.title}</strong><small>{item.difficulty} · {item.points} pts</small></div></button>)}</aside>
      <section className="panel exercise-card">
        <div className="exercise-meta"><span className="pill">{exercise.type}</span><span>{exercise.difficulty}</span><span>{exercise.points} points</span></div>
        <h2>{exercise.title}</h2>
        <p className="exercise-prompt">{exercise.prompt}</p>
        {exercise.options ? <div className="option-list">{exercise.options.map((option) => <button className={answer === option ? 'selected' : ''} key={option} onClick={() => !submitted && setAnswer(option)}><span>{answer === option ? '●' : '○'}</span>{option}</button>)}</div> : <input className="answer-input" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Type your answer..." disabled={submitted} />}
        {showHint && !submitted && <div className="warning-card"><Lightbulb size={18} /><span>Hint: focus on the direct responsibility of the concept in this question. Try an answer before checking the explanation.</span></div>}
        {submitted && <div className={`feedback-card ${correct ? 'correct' : 'incorrect'}`}>{correct ? <CheckCircle2 size={20} /> : <XCircle size={20} />}<div><strong>{correct ? 'Correct — nice trace.' : 'Not quite yet.'}</strong><p>{exercise.explanation}</p></div></div>}
        <div className="exercise-footer">{!submitted ? <><button className="button button-secondary" onClick={() => setShowHint(true)}><Lightbulb size={16} /> Show hint</button><button className="button button-primary" onClick={submit} disabled={!answer}><Send size={16} /> Submit answer</button></> : <><button className="button button-secondary" onClick={() => { setAnswer(''); setSubmitted(false); setShowHint(false); }}><RotateCcw size={16} /> Retry</button><button className="button button-primary" onClick={next}>Next exercise <Send size={16} /></button></>}</div>
      </section>
    </div>
  </div>;
}
