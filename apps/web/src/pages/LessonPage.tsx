import { ArrowLeft, ArrowRight, Bookmark, Check, Lightbulb, NotebookPen, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getLesson, modules } from '../data/curriculum';
import { useAppState } from '../app/AppState';
import { SectionHeader } from '../components/SectionHeader';

export function LessonPage() {
  const { lessonSlug = '' } = useParams();
  const lesson = getLesson(lessonSlug);
  const { state, setState, completeLesson, toggleBookmark, addActivity } = useAppState();
  const navigate = useNavigate();
  const [challengeDone, setChallengeDone] = useState(() => Boolean(lesson && (state.completedChallenges.includes(lesson.id) || state.completedLessons.includes(lesson.id))));
  const [challengeReflection, setChallengeReflection] = useState(() => lesson ? state.challengeAttempts.find((attempt) => attempt.challengeId === lesson.id)?.reflection ?? '' : '');

  if (!lesson) return <div className="empty-page"><h1>Lesson not found</h1><Link to="/roadmap" className="button button-primary">Return to roadmap</Link></div>;

  const parent = modules.find((module) => module.lessons.some((item) => item.id === lesson.id));
  const complete = state.completedLessons.includes(lesson.id);
  const bookmarked = state.bookmarks.includes(lesson.id);
  const conflict = state.noteConflicts[lesson.id];
  const lastChallengeAttempt = state.challengeAttempts.find((attempt) => attempt.challengeId === lesson.id);
  const index = parent?.lessons.findIndex((item) => item.id === lesson.id) ?? 0;
  const next = parent?.lessons[index + 1];

  const saveNote = (value: string) => setState((current) => ({
    ...current,
    notes: { ...current.notes, [lesson.id]: value },
    noteConflicts: current.noteConflicts[lesson.id]
      ? { ...current.noteConflicts, [lesson.id]: { ...current.noteConflicts[lesson.id], localBody: value } }
      : current.noteConflicts,
  }));

  const resolveNote = (useServer: boolean) => setState((current) => {
    const currentConflict = current.noteConflicts[lesson.id];
    if (!currentConflict) return current;
    const noteConflicts = { ...current.noteConflicts };
    delete noteConflicts[lesson.id];
    return {
      ...current,
      notes: { ...current.notes, [lesson.id]: useServer ? currentConflict.serverBody : current.notes[lesson.id] ?? currentConflict.localBody },
      noteVersions: { ...current.noteVersions, [lesson.id]: currentConflict.serverUpdatedAt },
      noteConflicts,
    };
  });

  return <div className="page-stack lesson-page">
    <Link to={`/roadmap/${parent?.slug ?? ''}`} className="back-link"><ArrowLeft size={15} /> {parent?.title}</Link>
    <SectionHeader eyebrow={`LESSON ${String(index + 1).padStart(2, '0')} / ${lesson.duration}`} title={lesson.title} description={lesson.summary} action={<button className={`bookmark-button ${bookmarked ? 'saved' : ''}`} onClick={() => toggleBookmark(lesson.id)}><Bookmark size={17} fill={bookmarked ? 'currentColor' : 'none'} /> {bookmarked ? 'Saved' : 'Bookmark'}</button>} />
    <div className="lesson-layout">
      <article className="lesson-article">
        <div className="lesson-callout"><Lightbulb size={19} /><div><strong>Learning objective</strong><p>{lesson.objectives.join(' · ')}</p></div></div>
        <h2>The mental model</h2><p>{lesson.summary} The most useful habit is to name the state that changes, then ask which component owns that state. That question prevents a lot of “magic” explanations.</p>
        <h2>Worked example</h2><div className="code-card"><div className="code-card-bar"><span>trace.sh</span><button onClick={() => navigator.clipboard?.writeText(lesson.workedExample)}>Copy</button></div><pre><code>{lesson.workedExample}</code></pre></div>
        <h2>Common mistakes</h2><ul className="mistake-list">{lesson.mistakes.map((mistake) => <li key={mistake}><RotateCcw size={15} />{mistake}</li>)}</ul>
        <h2>Experiment challenge</h2><div className="knowledge-check challenge-card"><strong>{lesson.challenge}</strong><p>Run the linked lab, change at least one input, and explain the state transition in your own words.</p><textarea className="challenge-reflection" value={challengeReflection} onChange={(event) => setChallengeReflection(event.target.value)} disabled={challengeDone} placeholder="What changed when you ran it? (optional reflection)" />{lastChallengeAttempt && <small className="challenge-recorded">Recorded {new Date(lastChallengeAttempt.completedAt).toLocaleString()}</small>}<div className="challenge-actions"><Link to={lesson.labRoute} className="text-link">Open experiment <ArrowRight size={15} /></Link><button className={`button ${challengeDone ? 'button-success' : 'button-secondary'}`} onClick={() => { const completedAt = new Date().toISOString(); setChallengeDone(true); setState((current) => ({ ...current, completedChallenges: [...new Set([...current.completedChallenges, lesson.id])], challengeAttempts: [{ id: crypto.randomUUID(), challengeId: lesson.id, reflection: challengeReflection.trim(), completedAt }, ...current.challengeAttempts].slice(0, 100) })); }} disabled={challengeDone}>{challengeDone ? <><Check size={16} /> Challenge recorded</> : 'I completed the experiment'}</button></div></div>
        <div className="lesson-actions"><button className={`button ${complete ? 'button-success' : 'button-primary'}`} onClick={() => { completeLesson(lesson.id, lesson.title); addActivity({ label: complete ? 'Lesson revisited' : 'Lesson completed', detail: lesson.title, kind: 'lesson' }); }} disabled={!challengeDone && !complete}>{complete ? <><Check size={16} /> Completed</> : <><Check size={16} /> Mark complete</>}</button>{next ? <button className="button button-secondary" onClick={() => navigate(`/lesson/${next.slug}`)}>Next lesson <ArrowRight size={16} /></button> : <Link className="button button-secondary" to={`/roadmap/${parent?.slug}`}>Finish module <ArrowRight size={16} /></Link>}</div>
      </article>
      <aside className="lesson-sidebar">
        <div className="panel notes-panel"><div className="panel-title"><div><span className="eyebrow">YOUR NOTES</span><h2><NotebookPen size={17} /> Scratchpad</h2></div></div><textarea value={state.notes[lesson.id] ?? ''} onChange={(event) => saveNote(event.target.value)} placeholder="Write the one thing you want to remember..." />{conflict && <div className="note-conflict"><strong>Note changed elsewhere</strong><p>Your local note is kept here. Choose which version should continue syncing.</p><div><button className="button button-secondary" onClick={() => resolveNote(false)}>Keep mine</button><button className="button button-primary" onClick={() => resolveNote(true)}>Use server version</button></div></div>}</div>
        <div className="panel lesson-objectives"><span className="eyebrow">IN THIS LESSON</span><ul>{lesson.objectives.map((objective) => <li key={objective}><Check size={14} />{objective}</li>)}</ul></div>
      </aside>
    </div>
  </div>;
}
