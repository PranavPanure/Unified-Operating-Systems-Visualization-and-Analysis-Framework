import { useEffect, useState } from 'react';
import { ArrowRight, Clipboard, TerminalSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SectionHeader } from '../components/SectionHeader';
import { api, type ApiMission } from '../lib/api';

/** Mirrors the API catalogue so the page still works without a running backend. */
const offlineMissions: ApiMission[] = [
  {
    id: 'linux-files-01',
    title: 'Create a workspace file',
    module: 'Linux & Terminal Fundamentals',
    objective: 'Create lab/status.txt and write process-ready into it.',
    hint: "mkdir -p lab && printf 'process-ready\\n' > lab/status.txt",
    expected_output: 'process-ready',
  },
  {
    id: 'linux-pipeline-01',
    title: 'Build a pipeline',
    module: 'Linux & Terminal Fundamentals',
    objective: 'Use a pipeline to transform the word operating-systems to uppercase.',
    hint: "printf 'operating-systems\\n' | tr a-z A-Z",
    expected_output: 'OPERATING-SYSTEMS',
  },
  {
    id: 'linux-process-01',
    title: 'Inspect the current process',
    module: 'Processes & Job Control',
    objective: 'Print the current shell PID and prove the process is running as learner.',
    hint: "printf '%s\\n' $$; whoami",
    expected_output: 'learner',
  },
];

export function MissionsPage() {
  const [missions, setMissions] = useState<ApiMission[]>([]);
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    api.getMissions()
      .then((result) => { setMissions(result.length ? result : offlineMissions); setOffline(result.length === 0); })
      .catch(() => { setMissions(offlineMissions); setOffline(true); });
  }, []);
  return <div className="page-stack">
    <SectionHeader eyebrow="MISSIONS / LEARN BY DOING" title="Turn commands into experiments." description="Each mission gives you an objective, a hint, and a real Linux workspace where you can test your idea. Run the command, inspect the output, and explain what happened." action={<Link className="button button-primary" to="/terminal"><TerminalSquare size={16} /> Open terminal</Link>} />
    {offline && <div className="analytics-sync-note"><span className="status-dot offline" /><span>Showing the offline mission set. Start the API and sign in to have mission results saved to your account.</span></div>}
    <div className="mission-grid">{missions.map((mission, index) => <article className="panel mission-card" key={mission.id}><div className="mission-number">{String(index + 1).padStart(2, '0')}</div><span className="eyebrow">{mission.module}</span><h2>{mission.title}</h2><p>{mission.objective}</p><div className="mission-command"><code>{mission.hint}</code><button className="icon-button" title="Copy hint" onClick={() => navigator.clipboard?.writeText(mission.hint)}><Clipboard size={16} /></button></div><div className="mission-footer"><span>Expected: <code>{mission.expected_output}</code></span><Link className="button button-secondary" to={`/terminal?mission=${mission.id}`}>Try mission <ArrowRight size={15} /></Link></div></article>)}</div>
    {missions.length === 0 && <div className="empty-state"><span>Loading missions…</span></div>}
  </div>;
}
