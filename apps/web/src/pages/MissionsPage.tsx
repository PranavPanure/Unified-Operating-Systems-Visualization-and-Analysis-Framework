import { useEffect, useState } from 'react';
import { ArrowRight, Clipboard, TerminalSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SectionHeader } from '../components/SectionHeader';
import { api, type ApiMission } from '../lib/api';

export function MissionsPage() {
  const [missions, setMissions] = useState<ApiMission[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { api.getMissions().then(setMissions).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load missions')); }, []);
  return <div className="page-stack"><SectionHeader eyebrow="MISSIONS / LEARN BY DOING" title="Turn commands into experiments." description="Each mission gives you an objective, a hint, and a real Linux workspace where you can test your idea. Run the command, inspect the output, and explain what happened." action={<Link className="button button-primary" to="/terminal"><TerminalSquare size={16} /> Open terminal</Link>} />{error && <div className="runner-error">{error}</div>}<div className="mission-grid">{missions.map((mission, index) => <article className="panel mission-card" key={mission.id}><div className="mission-number">{String(index + 1).padStart(2, '0')}</div><span className="eyebrow">{mission.module}</span><h2>{mission.title}</h2><p>{mission.objective}</p><div className="mission-command"><code>{mission.hint}</code><button className="icon-button" title="Copy hint" onClick={() => navigator.clipboard?.writeText(mission.hint)}><Clipboard size={16} /></button></div><div className="mission-footer"><span>Expected: <code>{mission.expected_output}</code></span><Link className="button button-secondary" to={`/terminal?mission=${mission.id}`}>Try mission <ArrowRight size={15} /></Link></div></article>)}</div>{!error && missions.length === 0 && <div className="empty-state"><span>Loading missions…</span></div>}</div>;
}
