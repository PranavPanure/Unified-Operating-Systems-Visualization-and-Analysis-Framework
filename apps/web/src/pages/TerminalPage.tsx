import { useState, type FormEvent } from 'react';
import { ChevronRight, CircleHelp, RotateCcw, TerminalSquare, Trash2 } from 'lucide-react';
import { SectionHeader } from '../components/SectionHeader';
import { useAppState } from '../app/AppState';
import { useAuth } from '../app/AuthState';
import { api, type ApiTerminalResult } from '../lib/api';
import { useSearchParams } from 'react-router-dom';

type FileNode = { type: 'file' | 'dir'; content?: string; children?: Record<string, FileNode> };
const initialFs: FileNode = { type: 'dir', children: { home: { type: 'dir', children: { student: { type: 'dir', children: { 'welcome.txt': { type: 'file', content: 'Welcome to the OS A2Z terminal.\nTry: pwd, ls, cat welcome.txt' }, labs: { type: 'dir', children: {} } } } } }, tmp: { type: 'dir', children: {} } } };
const cloneFs = () => structuredClone(initialFs) as FileNode;

export function TerminalPage() {
  const [searchParams] = useSearchParams();
  const { addActivity, completeChallenge } = useAppState();
  const { user } = useAuth();
  const [fs, setFs] = useState<FileNode>(() => cloneFs());
  const [cwd, setCwd] = useState('/home/student');
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [lines, setLines] = useState<string[]>(['OS A2Z simulated terminal v0.1', 'Type help to see supported commands.', '']);
  const [linuxCommand, setLinuxCommand] = useState(() => searchParams.get('mission') === 'linux-files-01' ? "mkdir -p lab && printf 'process-ready\\n' > lab/status.txt && cat lab/status.txt" : 'printf "hello from Linux\\n" && uname -a');
  const [linuxResult, setLinuxResult] = useState<ApiTerminalResult | null>(null);
  const [linuxError, setLinuxError] = useState<string | null>(null);
  const [linuxBusy, setLinuxBusy] = useState(false);
  const [linuxSessionId, setLinuxSessionId] = useState<string | null>(null);
  const [linuxMissionId, setLinuxMissionId] = useState<string | null>(() => searchParams.get('mission'));
  const prompt = `student@os-a2z:${cwd === '/home/student' ? '~' : cwd}$`;

  const resolve = (path: string) => { const absolute = path.startsWith('/') ? path : `${cwd}/${path}`; return absolute.split('/').filter(Boolean); };
  const getNode = (parts: string[], root = fs): FileNode | null => parts.reduce<FileNode | null>((node, part) => node?.type === 'dir' ? node.children?.[part] ?? null : null, root);

  const execute = (raw: string) => {
    const command = raw.trim();
    if (!command) return;
    const [name, ...args] = command.split(/\s+/);
    let output: string[] = [];
    let nextCwd = cwd;
    let nextFs = fs;
    const current = getNode(resolve('.'));
    const children = current?.children ?? {};
    if (name === 'clear') { setLines([]); setInput(''); return; }
    if (name === 'help') output = ['Supported: pwd ls cd mkdir touch cat echo whoami uname date clear history help', 'This is a safe simulation; use the Linux sandbox below for real commands.'];
    else if (name === 'pwd') output = [cwd];
    else if (name === 'whoami') output = ['student'];
    else if (name === 'uname') output = ['Linux os-a2z 6.8.0-learning #1 SMP x86_64 GNU/Linux'];
    else if (name === 'date') output = [new Date().toString()];
    else if (name === 'history') output = history.map((item, index) => `${index + 1}  ${item}`);
    else if (name === 'ls') output = Object.keys(children).sort().map((item) => children[item].type === 'dir' ? `${item}/` : item);
    else if (name === 'cd') { const destination = args[0] ?? '/home/student'; const node = getNode(resolve(destination)); if (node?.type === 'dir') nextCwd = destination.startsWith('/') ? destination.replace(/\/$/, '') || '/' : `${cwd}/${destination}`.replace('/.', ''); else output = [`cd: no such directory: ${destination}`]; }
    else if (name === 'cat') { const target = getNode(resolve(args[0] ?? '')); output = target?.type === 'file' ? (target.content ?? '').split('\n') : [`cat: ${args[0] ?? ''}: No such file`]; }
    else if (name === 'echo') output = [args.join(' ').replace('$HOME', '/home/student')];
    else if (name === 'mkdir' || name === 'touch') { const target = args.at(-1); if (!target) output = [`${name}: missing operand`]; else { const parentParts = resolve(target).slice(0, -1); const leaf = resolve(target).at(-1)!; const parent = getNode(parentParts); if (!parent || parent.type !== 'dir') output = [`${name}: parent directory does not exist`]; else { nextFs = structuredClone(fs); const nextParent = getNode(parentParts, nextFs)!; nextParent.children![leaf] = name === 'mkdir' ? { type: 'dir', children: {} } : { type: 'file', content: '' }; } } }
    else output = [`${name}: command not available in the simulator. Try help for the supported subset.`];
    setFs(nextFs); setCwd(nextCwd); setHistory((items) => [...items, command]); setLines((items) => [...items, `${prompt} ${command}`, ...output, '']); setInput(''); addActivity({ label: 'Terminal experiment', detail: command, kind: 'terminal' });
  };

  const runMission = () => { const node = getNode(['home', 'student'], fs); const solved = node?.children?.labs?.type === 'dir'; setLines((items) => [...items, solved ? 'MISSION COMPLETE: you found the labs directory.' : 'MISSION: use ls, then cd labs to explore the workspace.', '']); setLinuxMissionId('linux-files-01'); setLinuxCommand("mkdir -p lab && printf 'process-ready\\n' > lab/status.txt && cat lab/status.txt"); };
  const runLinux = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || !linuxCommand.trim()) return;
    setLinuxBusy(true); setLinuxError(null); setLinuxResult(null);
    try { const result = await api.executeTerminal({ command: linuxCommand, cwd: '/workspace', timeout_ms: 4_000, session_id: linuxSessionId ?? undefined }); setLinuxSessionId(result.session_id); setLinuxResult(result); if (linuxMissionId) { const mission = await api.validateMission({ mission_id: linuxMissionId, stdout: result.stdout, exit_code: result.exit_code }); if (!mission.passed) setLinuxError(mission.message); else { completeChallenge(mission.mission_id, mission.mission_id); addActivity({ label: 'Linux mission completed', detail: mission.mission_id, kind: 'terminal' }); } } addActivity({ label: 'Linux sandbox run', detail: linuxCommand, kind: 'terminal' }); }
    catch (reason) { setLinuxError(reason instanceof Error ? reason.message : 'Linux sandbox unavailable'); }
    finally { setLinuxBusy(false); }
  };

  return <div className="page-stack"><SectionHeader eyebrow="INTERACTIVE ENVIRONMENT / LINUX SANDBOX" title="Operate a real Linux userland." description="Use the simulator for deterministic lessons, or sign in and run bounded commands inside an isolated non-root Linux container." action={<div className="terminal-actions"><button className="button button-secondary" onClick={() => { setFs(cloneFs()); setCwd('/home/student'); setHistory([]); setLines(['Session reset.', '']); }}><RotateCcw size={16} /> Reset session</button><button className="button button-secondary" onClick={runMission}><CircleHelp size={16} /> Give me a mission</button></div>} /><div className="terminal-layout"><section className="terminal-window"><div className="terminal-topbar"><span><i /> <i /> <i /></span><strong><TerminalSquare size={15} /> os-a2z / simulated-session</strong><button onClick={() => setLines([])}><Trash2 size={15} /></button></div><div className="terminal-body" role="log">{lines.map((line, index) => <div className={line.startsWith('MISSION') ? 'terminal-mission' : ''} key={`${index}-${line}`}>{line || '\u00a0'}</div>)}<div className="terminal-input-row"><span>{prompt}</span><input autoFocus value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') execute(input); }} aria-label="Terminal command" /></div></div></section><aside className="panel terminal-help"><span className="eyebrow">SESSION STATE</span><h2>Choose your environment</h2><div className="state-list"><div><strong>cwd</strong><code>{cwd}</code></div><div><strong>mode</strong><code>simulated</code></div><div><strong>exit code</strong><code>0</code></div></div><span className="eyebrow">TRY THIS</span><ol><li>Run <code>pwd</code>.</li><li>Run <code>ls</code>.</li><li>Read <code>welcome.txt</code>.</li><li>Create a file with <code>touch notes.txt</code>.</li></ol><p className="muted"><ChevronRight size={14} /> The simulator never touches your computer.</p></aside></div><section className="panel linux-runner"><div className="panel-title"><div><span className="eyebrow">AUTHENTICATED / BOUNDED EXECUTION</span><h2>Linux sandbox</h2></div><span className={`runner-status ${user ? 'ready' : 'locked'}`}>{user ? 'Sign-in enabled' : 'Sign in required'}</span></div><p className="muted">Commands run as a non-root user with no network, limited CPU/memory/processes, a read-only root filesystem, and a short timeout. The sandbox is unavailable if Docker is not running.</p><form className="linux-runner-form" onSubmit={runLinux}><input value={linuxCommand} onChange={(event) => setLinuxCommand(event.target.value)} placeholder="printf 'hello\\n' | tr a-z A-Z" aria-label="Linux sandbox command" /><button className="button button-primary" type="submit" disabled={!user || linuxBusy || !linuxCommand.trim()}>{linuxBusy ? 'Running…' : 'Run in Linux'}</button></form>{linuxError && <div className="runner-error">{linuxError}</div>}{linuxResult && <div className="runner-result"><div><span>exit {linuxResult.exit_code ?? 'timeout'}</span><span>{linuxResult.duration_ms} ms</span><span>{linuxResult.sandbox}</span></div>{linuxResult.stdout && <pre>{linuxResult.stdout}</pre>}{linuxResult.stderr && <pre className="runner-stderr">{linuxResult.stderr}</pre>}</div>}</section></div>;
}
