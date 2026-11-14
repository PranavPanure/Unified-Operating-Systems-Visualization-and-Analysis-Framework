import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CornerDownLeft, Search, TerminalSquare, X } from 'lucide-react';
import { commands, exercises, modules } from '../data/curriculum';

type Result = { id: string; label: string; detail: string; kind: string; to: string };

const pages: Result[] = [
  { id: 'page-dashboard', label: 'Dashboard', detail: 'Your current module, progress and recent work', kind: 'Page', to: '/dashboard' },
  { id: 'page-roadmap', label: 'Roadmap', detail: 'All twelve modules and their prerequisites', kind: 'Page', to: '/roadmap' },
  { id: 'page-terminal', label: 'Terminal lab', detail: 'Simulated filesystem and isolated Linux shell', kind: 'Page', to: '/terminal' },
  { id: 'page-missions', label: 'Linux missions', detail: 'Guided command objectives', kind: 'Page', to: '/missions' },
  { id: 'page-practice', label: 'Practice', detail: 'Active recall across every module', kind: 'Page', to: '/practice' },
  { id: 'page-analytics', label: 'Analytics', detail: 'Coverage, accuracy and revision queue', kind: 'Page', to: '/analytics' },
  { id: 'page-settings', label: 'Settings', detail: 'Theme, learning goal and local data', kind: 'Page', to: '/settings' },
];

const lessons: Result[] = modules.flatMap((module) => module.lessons.map((lesson) => ({
  id: `lesson-${lesson.id}`,
  label: lesson.title,
  detail: `M${module.number} · ${lesson.summary}`,
  kind: 'Lesson',
  to: `/lesson/${lesson.slug}`,
})));

const commandResults: Result[] = commands.map((command) => ({
  id: `command-${command.slug}`,
  label: `${command.name} — ${command.syntax}`,
  detail: command.description,
  kind: 'Command',
  to: `/commands/${command.slug}`,
}));

const exerciseResults: Result[] = exercises.map((exercise) => ({
  id: `exercise-${exercise.id}`,
  label: exercise.title,
  detail: `${exercise.difficulty} · ${exercise.points} points`,
  kind: 'Exercise',
  to: '/practice',
}));

const allResults = [...pages, ...lessons, ...commandResults, ...exerciseResults];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setOpen((current) => !current); }
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('os-a2z-search', onOpen);
    window.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('os-a2z-search', onOpen); window.removeEventListener('keydown', onKey); };
  }, []);

  useEffect(() => { if (open) { setQuery(''); setActive(0); } }, [open]);

  const results = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return allResults.slice(0, 7);
    return allResults
      .filter((result) => `${result.label} ${result.detail} ${result.kind}`.toLowerCase().includes(trimmed))
      .slice(0, 8);
  }, [query]);

  if (!open) return null;

  const go = (result: Result | undefined) => {
    if (!result) return;
    setOpen(false);
    navigate(result.to);
  };

  return <div className="palette-scrim" onClick={() => setOpen(false)}>
    <div className="palette" role="dialog" aria-modal="true" aria-label="Search the curriculum" onClick={(event) => event.stopPropagation()}>
      <div className="palette-input">
        <Search size={17} />
        <input
          autoFocus
          value={query}
          placeholder="Search lessons, commands, exercises…"
          aria-label="Search lessons, commands and exercises"
          onChange={(event) => { setQuery(event.target.value); setActive(0); }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') { event.preventDefault(); setActive((current) => Math.min(current + 1, results.length - 1)); }
            if (event.key === 'ArrowUp') { event.preventDefault(); setActive((current) => Math.max(current - 1, 0)); }
            if (event.key === 'Enter') { event.preventDefault(); go(results[active]); }
          }}
        />
        <button className="palette-close" onClick={() => setOpen(false)} aria-label="Close search"><X size={16} /></button>
      </div>
      <div className="palette-results" role="listbox" aria-label="Search results">
        {results.length === 0 ? <div className="palette-empty">No lesson, command or exercise matches “{query}”.</div> : results.map((result, index) => <button
          key={result.id}
          role="option"
          aria-selected={index === active}
          className={index === active ? 'active' : ''}
          onMouseEnter={() => setActive(index)}
          onClick={() => go(result)}
        >
          <span className="palette-kind">{result.kind === 'Lesson' ? <BookOpen size={15} /> : result.kind === 'Command' ? <TerminalSquare size={15} /> : <Search size={15} />}</span>
          <span className="palette-copy"><strong>{result.label}</strong><small>{result.detail}</small></span>
          <span className="palette-kind-label">{result.kind}</span>
        </button>)}
      </div>
      <div className="palette-hint"><span><kbd>↑</kbd><kbd>↓</kbd> to move</span><span><kbd><CornerDownLeft size={11} /></kbd> to open</span><span><kbd>Esc</kbd> to close</span></div>
    </div>
  </div>;
}
