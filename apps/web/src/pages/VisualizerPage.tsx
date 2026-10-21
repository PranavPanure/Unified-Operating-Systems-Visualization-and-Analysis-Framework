import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Activity, ArrowRight, BrainCircuit, CheckCircle2, CircleHelp, Disc3, MemoryStick, Play, RotateCcw, Users, Utensils } from 'lucide-react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useAppState } from '../app/AppState';
import { SectionHeader } from '../components/SectionHeader';
import { bankers, diningPhilosophers, diskClook, diskCscan, diskFcfs, diskLook, diskScan, diskSstf, fcfs, fifoPages, lruPages, optimalPages, priorityScheduling, producerConsumer, readersWriters, roundRobin, sjf, srtf, type PhilosopherAction, type ProcessInput, type ReadersWritersAction } from '../lib/simulators';

const starter: ProcessInput[] = [
  { id: 'P1', arrival: 0, burst: 8, priority: 2 },
  { id: 'P2', arrival: 1, burst: 4, priority: 1 },
  { id: 'P3', arrival: 2, burst: 2, priority: 3 },
  { id: 'P4', arrival: 4, burst: 3, priority: 2 },
];
type SchedulingAlgorithm = 'FCFS' | 'SJF' | 'SRTF' | 'Priority' | 'Preemptive Priority' | 'Round Robin';

export function VisualizerPage() {
  const { kind = 'scheduling' } = useParams();
  const { addActivity } = useAppState();
  if (kind === 'paging') return <PagingLab />;
  if (kind === 'deadlocks') return <DeadlockLab />;
  if (kind === 'disk') return <DiskLab />;
  if (kind === 'synchronization') return <SynchronizationLab />;
  return <SchedulingLab addActivity={addActivity} />;
}

function schedulingPreset(preset: string | null) {
  if (preset === 'preemption') return { workload: [{ id: 'P1', arrival: 0, burst: 7, priority: 2 }, { id: 'P2', arrival: 1, burst: 2, priority: 1 }, { id: 'P3', arrival: 2, burst: 5, priority: 3 }, { id: 'P4', arrival: 4, burst: 1, priority: 2 }], algorithm: 'SRTF' as SchedulingAlgorithm, quantum: 2 };
  if (preset === 'response') return { workload: [{ id: 'P1', arrival: 0, burst: 8, priority: 2 }, { id: 'P2', arrival: 2, burst: 3, priority: 1 }, { id: 'P3', arrival: 4, burst: 2, priority: 3 }], algorithm: 'Round Robin' as SchedulingAlgorithm, quantum: 2 };
  return { workload: starter.map((process) => ({ ...process })), algorithm: 'FCFS' as SchedulingAlgorithm, quantum: 2 };
}

function SchedulingLab({ addActivity }: { addActivity: (activity: { label: string; detail: string; kind: 'visualizer' }) => void }) {
  const [searchParams] = useSearchParams();
  const preset = searchParams.get('preset');
  const initial = schedulingPreset(preset);
  const [workload, setWorkload] = useState(initial.workload);
  const [algorithm, setAlgorithm] = useState<SchedulingAlgorithm>(initial.algorithm);
  const [quantum, setQuantum] = useState(initial.quantum);
  useEffect(() => { const next = schedulingPreset(preset); setWorkload(next.workload); setAlgorithm(next.algorithm); setQuantum(next.quantum); }, [preset]);
  const output = useMemo(() => {
    if (algorithm === 'SJF') return sjf(workload);
    if (algorithm === 'SRTF') return srtf(workload);
    if (algorithm === 'Priority') return priorityScheduling(workload);
    if (algorithm === 'Preemptive Priority') return priorityScheduling(workload, true);
    if (algorithm === 'Round Robin') return roundRobin(workload, quantum);
    return fcfs(workload);
  }, [algorithm, quantum, workload]);
  const max = Math.max(...output.blocks.map((block) => block.end), 1);
  const run = () => addActivity({ label: 'Visualizer run', detail: (preset ? preset + ' · ' : '') + algorithm + ' scheduling trace', kind: 'visualizer' });
  const update = (index: number, patch: Partial<ProcessInput>) => setWorkload((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  return <LabFrame eyebrow="VISUALIZER / CPU" title="Operate the scheduler" description="Change the workload, choose a policy, and read the exact trace the CPU follows." icon={<Activity size={18} />}><div className="sim-controls"><label>Algorithm<select value={algorithm} onChange={(event) => setAlgorithm(event.target.value as SchedulingAlgorithm)}>{['FCFS', 'SJF', 'SRTF', 'Priority', 'Preemptive Priority', 'Round Robin'].map((name) => <option key={name}>{name}</option>)}</select></label>{algorithm === 'Round Robin' && <label>Quantum<input type="number" min="1" value={quantum} onChange={(event) => setQuantum(Math.max(1, Number(event.target.value)))} /></label>}<button className="button button-primary" onClick={run}><Play size={16} /> Run trace</button><button className="button button-secondary" onClick={() => { const next = schedulingPreset(preset); setWorkload(next.workload); setAlgorithm(next.algorithm); setQuantum(next.quantum); }}><RotateCcw size={16} /> Reset preset</button></div><div className="process-editor process-editor-four"><div className="process-header"><span>ID</span><span>ARRIVAL</span><span>BURST</span><span>PRIORITY</span></div>{workload.map((process, index) => <div className="process-input-row" key={process.id}><input value={process.id} onChange={(event) => update(index, { id: event.target.value })} /><input type="number" min="0" value={process.arrival} onChange={(event) => update(index, { arrival: Number(event.target.value) })} /><input type="number" min="1" value={process.burst} onChange={(event) => update(index, { burst: Number(event.target.value) })} /><input type="number" min="1" value={process.priority ?? 1} onChange={(event) => update(index, { priority: Number(event.target.value) })} /></div>)}</div><div className="gantt-large"><div className="gantt-bar">{output.blocks.map((block, index) => <div className={'gantt-block ' + (block.id === 'IDLE' ? 'idle' : '')} key={block.id + '-' + index} style={{ width: ((block.end - block.start) / max * 100) + '%' }}><strong>{block.id}</strong><small>{block.start}–{block.end}</small></div>)}</div></div><div className="result-metrics">{[['Avg waiting', output.averages.waiting], ['Avg turnaround', output.averages.turnaround], ['Avg response', output.averages.response]].map(([label, value]) => <div key={String(label)}><span>{label}</span><strong>{value}</strong></div>)}</div><table className="metrics-table"><thead><tr><th>Process</th><th>Completion</th><th>Turnaround</th><th>Waiting</th><th>Response</th></tr></thead><tbody>{output.metrics.map((metric) => <tr key={metric.id}><td>{metric.id}</td><td>{metric.completion}</td><td>{metric.turnaround}</td><td>{metric.waiting}</td><td>{metric.response}</td></tr>)}</tbody></table></LabFrame>;
}

type PagingPolicy = 'FIFO' | 'LRU' | 'Optimal';
function pagingPreset(preset: string | null): { pages: string; frames: number; policy: PagingPolicy } {
  if (preset === 'translation') return { pages: '0 1 2 0 3 1', frames: 2, policy: 'FIFO' };
  if (preset === 'thrashing') return { pages: '1 2 3 4 1 2 5 1 2 3 4 5', frames: 3, policy: 'FIFO' };
  return { pages: '1 2 3 1 4 2 5 1', frames: 3, policy: 'LRU' };
}

function PagingLab() {
  const [searchParams] = useSearchParams();
  const preset = searchParams.get('preset');
  const initial = pagingPreset(preset);
  const [pages, setPages] = useState(initial.pages);
  const [frames, setFrames] = useState(initial.frames);
  const [policy, setPolicy] = useState<typeof initial.policy>(initial.policy);
  useEffect(() => { const next = pagingPreset(preset); setPages(next.pages); setFrames(next.frames); setPolicy(next.policy); }, [preset]);
  const input = pages.split(/\s+/).filter(Boolean).map(Number);
  const output = policy === 'LRU' ? lruPages(input, frames) : policy === 'Optimal' ? optimalPages(input, frames) : fifoPages(input, frames);
  return <LabFrame eyebrow="VISUALIZER / MEMORY" title="Watch pages move" description="Compare page replacement policies frame by frame and explain each fault." icon={<MemoryStick size={18} />}><div className="sim-controls"><label>Policy<select value={policy} onChange={(event) => setPolicy(event.target.value as typeof policy)}><option>FIFO</option><option>LRU</option><option>Optimal</option></select></label><label>Reference string<input value={pages} onChange={(event) => setPages(event.target.value)} /></label><label>Frames<input type="number" min="1" max="6" value={frames} onChange={(event) => setFrames(Math.max(1, Number(event.target.value)))} /></label><button className="button button-secondary" onClick={() => { const next = pagingPreset(preset); setPages(next.pages); setFrames(next.frames); setPolicy(next.policy); }}><RotateCcw size={16} /> Reset preset</button></div><div className="page-trace">{output.rows.map((row, index) => <div className={row.fault ? 'fault' : 'hit'} key={row.page + '-' + index}><strong>{row.page}</strong><span>{row.frames.join(' · ') || '—'}</span><small>{row.fault ? 'FAULT' : 'HIT'}</small></div>)}</div><div className="result-banner"><CheckCircle2 size={18} /> {policy} produced {output.faults} page faults across {output.rows.length} references.</div></LabFrame>;
}

function DeadlockLab() {
  const [searchParams] = useSearchParams();
  const preset = searchParams.get('preset');
  const availableForPreset = preset === 'conditions' ? '1,0,0' : preset === 'recovery' ? '0,1,0' : '3,3,2';
  const [available, setAvailable] = useState(availableForPreset);
  useEffect(() => { setAvailable(preset === 'conditions' ? '1,0,0' : preset === 'recovery' ? '0,1,0' : '3,3,2'); }, [preset]);
  const output = bankers(available.split(',').map(Number), [[1, 0, 0], [0, 1, 0], [1, 1, 1]], [[1, 1, 1], [1, 2, 1], [2, 2, 2]]);
  return <LabFrame eyebrow="VISUALIZER / SAFETY" title="Test a resource state" description="Banker's algorithm asks whether every process can still finish before granting more resources." icon={<BrainCircuit size={18} />}><div className="sim-controls"><label>Available resources<input value={available} onChange={(event) => setAvailable(event.target.value)} /></label><button className="button button-secondary" onClick={() => setAvailable(availableForPreset)}>Reset preset</button><div className={'safety-badge ' + (output.safe ? 'safe' : 'unsafe')}>{output.safe ? 'SAFE STATE' : 'UNSAFE STATE'}</div></div><div className="banker-grid"><div><span className="eyebrow">SAFE SEQUENCE</span><div className="sequence">{output.sequence.map((item, index) => <span key={item}>P{item + 1}{index < output.sequence.length - 1 && <ArrowRight size={14} />}</span>)}</div></div><div><span className="eyebrow">NEED MATRIX</span><table className="metrics-table"><tbody>{output.need.map((row, index) => <tr key={index}><td>P{index + 1}</td>{row.map((value, cell) => <td key={cell}>{value}</td>)}</tr>)}</tbody></table></div></div></LabFrame>;
}

function diskPreset(preset: string | null) {
  if (preset === 'disk-policies') return { start: 50, requests: '82,170,43,140,24,16,190', policy: 'LOOK' };
  return { start: 50, requests: '82,170,43,140,24,16,190', policy: 'FCFS' };
}

function DiskLab() {
  const [searchParams] = useSearchParams();
  const preset = searchParams.get('preset');
  const initial = diskPreset(preset);
  const [start, setStart] = useState(initial.start);
  const [requests, setRequests] = useState(initial.requests);
  const [policy, setPolicy] = useState(initial.policy);
  useEffect(() => { const next = diskPreset(preset); setStart(next.start); setRequests(next.requests); setPolicy(next.policy); }, [preset]);
  const parsed = requests.split(',').map(Number).filter((value) => !Number.isNaN(value));
  const output = policy === 'SSTF' ? diskSstf(start, parsed) : policy === 'SCAN' ? diskScan(start, parsed) : policy === 'C-SCAN' ? diskCscan(start, parsed) : policy === 'LOOK' ? diskLook(start, parsed) : policy === 'C-LOOK' ? diskClook(start, parsed) : diskFcfs(start, parsed);
  return <LabFrame eyebrow="VISUALIZER / STORAGE" title="Follow the disk head" description="Compare request ordering, direction, and boundary assumptions." icon={<Disc3 size={18} />}><div className="sim-controls"><label>Policy<select value={policy} onChange={(event) => setPolicy(event.target.value)}>{['FCFS', 'SSTF', 'SCAN', 'C-SCAN', 'LOOK', 'C-LOOK'].map((name) => <option key={name}>{name}</option>)}</select></label><label>Start track<input type="number" value={start} onChange={(event) => setStart(Number(event.target.value))} /></label><label>Requests<input value={requests} onChange={(event) => setRequests(event.target.value)} /></label><button className="button button-secondary" onClick={() => { const next = diskPreset(preset); setStart(next.start); setRequests(next.requests); setPolicy(next.policy); }}><RotateCcw size={16} /> Reset preset</button></div><div className="disk-track">{output.path.map((track, index) => <span key={track + '-' + index} style={{ left: Math.min(100, Math.max(0, track / 200 * 100)) + '%' }} title={'Track ' + track}>{index === 0 ? 'START' : track}</span>)}</div><div className="result-banner"><Disc3 size={18} /> {policy}: <strong>{output.movement} tracks</strong> across {output.path.length - 1} movements.</div></LabFrame>;
}

function SynchronizationLab() {
  const [searchParams] = useSearchParams();
  const preset = searchParams.get('preset');
  const [mode, setMode] = useState<'buffer' | 'readers-writers' | 'philosophers'>('buffer');
  return <LabFrame eyebrow="VISUALIZER / CONCURRENCY" title="Operate the shared resource" description="Compare three synchronization problems and inspect the exact step where progress is allowed or blocked." icon={<BrainCircuit size={18} />}><div className="sync-tabs"><button className={mode === 'buffer' ? 'active' : ''} onClick={() => setMode('buffer')}><BrainCircuit size={15} /> Bounded buffer</button><button className={mode === 'readers-writers' ? 'active' : ''} onClick={() => setMode('readers-writers')}><Users size={15} /> Readers–writers</button><button className={mode === 'philosophers' ? 'active' : ''} onClick={() => setMode('philosophers')}><Utensils size={15} /> Dining philosophers</button></div>{mode === 'buffer' ? <BufferLab preset={preset} /> : mode === 'readers-writers' ? <ReadersWritersLab preset={preset} /> : <PhilosophersLab preset={preset} />}</LabFrame>;
}

function TraceControls({ length, step, setStep }: { length: number; step: number; setStep: (step: number) => void }) {
  return <label className="trace-control">Trace step<input type="range" min="0" max={Math.max(length - 1, 0)} value={Math.min(step, Math.max(length - 1, 0))} onChange={(event) => setStep(Number(event.target.value))} /><span>{length ? `${Math.min(step + 1, length)} / ${length}` : '0 / 0'}</span></label>;
}

function BufferLab({ preset }: { preset: string | null }) {
  const operationsForPreset = preset === 'conditions' ? ['produce', 'consume', 'consume', 'produce'] as Array<'produce' | 'consume'> : preset === 'critical' ? ['produce', 'produce', 'consume'] as Array<'produce' | 'consume'> : ['produce', 'produce', 'produce', 'produce', 'consume'] as Array<'produce' | 'consume'>;
  const capacityForPreset = preset === 'critical' ? 2 : 3;
  const [capacity, setCapacity] = useState(capacityForPreset);
  const [operations, setOperations] = useState<Array<'produce' | 'consume'>>(operationsForPreset);
  const [step, setStep] = useState(operations.length - 1);
  useEffect(() => { setCapacity(capacityForPreset); setOperations(operationsForPreset); setStep(operationsForPreset.length - 1); }, [capacityForPreset, preset]);
  const trace = producerConsumer(capacity, operations);
  const visibleTrace = trace.slice(0, step + 1);
  const buffer = visibleTrace.at(-1)?.buffer ?? [];
  const operate = (action: 'produce' | 'consume') => { setOperations((items) => [...items, action]); setStep(operations.length); };
  return <><div className="sim-controls"><label>Buffer capacity<input type="number" min="1" max="8" value={capacity} onChange={(event) => { setCapacity(Math.max(1, Number(event.target.value))); setOperations([]); setStep(-1); }} /></label><button className="button button-primary" onClick={() => operate('produce')}>Produce item</button><button className="button button-secondary" onClick={() => operate('consume')}>Consume item</button><button className="button button-secondary" onClick={() => { setCapacity(capacityForPreset); setOperations(operationsForPreset); setStep(operationsForPreset.length - 1); }}><RotateCcw size={16} /> Reset preset</button></div><div className="trace-toolbar"><TraceControls length={trace.length} step={step} setStep={setStep} /></div><div className="buffer-visual"><span className="eyebrow">BUFFER / {buffer.length} OF {capacity}</span><div className="buffer-slots">{Array.from({ length: capacity }, (_, index) => <div className={buffer[index] ? 'filled' : ''} key={index}>{buffer[index] ?? '·'}</div>)}</div></div><div className="sync-trace">{visibleTrace.length ? visibleTrace.map((item, index) => <div className={item.blocked ? 'blocked' : 'progressed'} key={item.action + '-' + index}><strong>{index + 1}. {item.action}</strong><span>{item.message}</span></div>) : <div className="empty-state"><CircleHelp size={18} /><span>Choose produce or consume to create an interleaving trace.</span></div>}</div></>;
}

function ReadersWritersLab({ preset }: { preset: string | null }) {
  const defaultOperations: ReadersWritersAction[] = preset === 'conditions' ? ['read-start', 'read-start', 'write-start', 'read-end', 'read-end', 'write-start', 'write-end'] : ['read-start', 'read-start', 'read-end', 'write-start', 'write-end'];
  const [operations, setOperations] = useState<ReadersWritersAction[]>(defaultOperations);
  const [step, setStep] = useState(defaultOperations.length - 1);
  const trace = readersWriters(operations);
  const visibleTrace = trace.slice(0, step + 1);
  const current = visibleTrace.at(-1);
  const add = (action: ReadersWritersAction) => { setOperations((items) => [...items, action]); setStep(operations.length); };
  return <><div className="sim-controls"><button className="button button-primary" onClick={() => add('read-start')}>Reader enters</button><button className="button button-secondary" onClick={() => add('read-end')}>Reader leaves</button><button className="button button-primary" onClick={() => add('write-start')}>Writer enters</button><button className="button button-secondary" onClick={() => add('write-end')}>Writer leaves</button><button className="button button-secondary" onClick={() => { setOperations(defaultOperations); setStep(defaultOperations.length - 1); }}><RotateCcw size={16} /> Reset trace</button></div><div className="sync-state-grid"><div><span className="eyebrow">ACTIVE READERS</span><strong>{current?.activeReaders ?? 0}</strong></div><div><span className="eyebrow">WRITER</span><strong>{current?.writerActive ? 'EXCLUSIVE' : 'AVAILABLE'}</strong></div></div><div className="trace-toolbar"><TraceControls length={trace.length} step={step} setStep={setStep} /></div><div className="sync-trace">{visibleTrace.map((item, index) => <div className={item.blocked ? 'blocked' : 'progressed'} key={item.action + '-' + index}><strong>{index + 1}. {item.action.replace('-', ' ')}</strong><span>{item.message}</span></div>)}</div></>;
}

function PhilosophersLab({ preset }: { preset: string | null }) {
  const defaultOperations = (preset === 'conditions' ? [0, 1, 2, 3, 4].flatMap((philosopher) => [{ philosopher, action: 'take-left' as PhilosopherAction }]) : [{ philosopher: 0, action: 'take-left' as PhilosopherAction }, { philosopher: 0, action: 'take-right' as PhilosopherAction }]);
  const [operations, setOperations] = useState<Array<{ philosopher: number; action: PhilosopherAction }>>(defaultOperations);
  const [philosopher, setPhilosopher] = useState(0);
  const [step, setStep] = useState(defaultOperations.length - 1);
  const trace = diningPhilosophers(operations);
  const visibleTrace = trace.slice(0, step + 1);
  const current = visibleTrace.at(-1);
  const add = (action: PhilosopherAction) => { setOperations((items) => [...items, { philosopher, action }]); setStep(operations.length); };
  return <><div className="sim-controls"><label>Philosopher<select value={philosopher} onChange={(event) => setPhilosopher(Number(event.target.value))}>{[0, 1, 2, 3, 4].map((item) => <option key={item} value={item}>Philosopher {item + 1}</option>)}</select></label><button className="button button-primary" onClick={() => add('take-left')}>Take left fork</button><button className="button button-primary" onClick={() => add('take-right')}>Take right fork</button><button className="button button-secondary" onClick={() => add('release')}>Release forks</button><button className="button button-secondary" onClick={() => { setOperations(defaultOperations); setStep(defaultOperations.length - 1); }}><RotateCcw size={16} /> Reset trace</button></div><div className="fork-visual">{Array.from({ length: 5 }, (_, index) => <div className={current?.forks[index] === null || current?.forks[index] === undefined ? '' : 'held'} key={index}><strong>F{index + 1}</strong><span>{current?.forks[index] === null || current?.forks[index] === undefined ? 'free' : `P${(current.forks[index] ?? 0) + 1}`}</span></div>)}</div><div className="trace-toolbar"><TraceControls length={trace.length} step={step} setStep={setStep} /></div><div className="sync-trace">{visibleTrace.map((item, index) => <div className={item.blocked ? 'blocked' : 'progressed'} key={item.action + '-' + item.philosopher + '-' + index}><strong>{index + 1}. P{item.philosopher + 1} · {item.action.replace('-', ' ')}</strong><span>{item.message}</span></div>)}</div></>;
}

function LabFrame({ eyebrow, title, description, icon, children }: { eyebrow: string; title: string; description: string; icon: ReactNode; children: ReactNode }) {
  const [searchParams] = useSearchParams();
  const preset = searchParams.get('preset');
  const context: Record<string, string> = {
    objectives: 'Compare arrival order with waiting and turnaround time.',
    preemption: 'Watch a newly arrived process interrupt the current trace.',
    response: 'Focus on when each process first receives CPU time.',
    translation: 'Trace how a reference string creates hits and page faults.',
    replacement: 'Compare recency-based replacement decisions frame by frame.',
    thrashing: 'Look for fault pressure when the working set exceeds memory.',
    critical: 'Fill and drain the buffer to expose blocking behavior.',
    buffer: 'Find the exact operation that blocks a full producer.',
    conditions: 'Recheck the condition after every wake-up or interleaving.',
    banker: 'Test whether the available resources leave a safe sequence.',
    recovery: 'Change availability and observe when a state becomes unsafe.',
    'disk-policies': 'Compare head movement and the boundary policy.',
  };
  return <div className="page-stack"><SectionHeader eyebrow={eyebrow} title={title} description={description} action={<span className="lab-icon">{icon}</span>} /><div className="panel lab-panel">{preset && context[preset] && <div className="preset-context"><span className="eyebrow">LESSON PRESET</span><strong>{context[preset]}</strong><span>Change one input, predict the result, then run the trace.</span></div>}{children}</div><div className="lab-note"><CircleHelp size={16} /><span>These are educational models. Read the trace and explain the assumption before treating a result as a real hardware measurement.</span></div></div>;
}


