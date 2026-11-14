import './styles.css'
import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity, AlertTriangle, ArrowDown, ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight,
  CircleHelp, Clock3, GitBranch, Layers3, Moon, Play, Plus, RotateCcw, ShieldCheck,
  SlidersHorizontal, Sparkles, Sun, Trash2, Unlock, X, Zap,
} from 'lucide-react'
import {
  Background, Controls, Edge, MarkerType, MiniMap, Node, Position, ReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'

type ProcessState = 'Ready' | 'Running' | 'Waiting' | 'Blocked' | 'Completed' | 'Deadlocked'
type Process = { id: string; name: string; color: string; allocation: number[]; max: number[]; state: ProcessState }
type Resource = { id: string; name: string; total: number; color: string }

const colors = ['#8b5cf6', '#28d7a1', '#f4b942', '#ff6b7a', '#53a7ff']
const initialProcesses: Process[] = [
  { id: 'P0', name: 'Compiler', color: colors[0], allocation: [1, 0, 0], max: [2, 1, 1], state: 'Ready' },
  { id: 'P1', name: 'Indexer', color: colors[1], allocation: [1, 1, 0], max: [2, 2, 1], state: 'Running' },
  { id: 'P2', name: 'Renderer', color: colors[2], allocation: [0, 0, 1], max: [1, 1, 2], state: 'Waiting' },
  { id: 'P3', name: 'Worker', color: colors[3], allocation: [0, 0, 0], max: [1, 1, 1], state: 'Ready' },
]
const resources: Resource[] = [
  { id: 'R0', name: 'CPU slots', total: 3, color: '#8b5cf6' },
  { id: 'R1', name: 'Memory pages', total: 3, color: '#28d7a1' },
  { id: 'R2', name: 'I/O channels', total: 2, color: '#f4b942' },
]
const history = [
  { step: '09:41', safe: 5, waiting: 1, allocated: 4 },
  { step: '09:44', safe: 6, waiting: 2, allocated: 4 },
  { step: '09:47', safe: 7, waiting: 1, allocated: 5 },
  { step: '09:50', safe: 6, waiting: 2, allocated: 5 },
  { step: '09:53', safe: 8, waiting: 1, allocated: 5 },
  { step: '09:56', safe: 8, waiting: 1, allocated: 6 },
]

function needFor(process: Process) { return process.max.map((v, i) => Math.max(0, v - process.allocation[i])) }
function sumAllocated(processes: Process[]) { return processes.length ? processes[0].allocation.map((_, i) => processes.reduce((s, p) => s + p.allocation[i], 0)) : [0, 0, 0] }
function runSafety(processes: Process[], available: number[]) {
  const work = [...available]
  const finish = processes.map(p => p.allocation.every(v => v === 0))
  const sequence: string[] = []
  let changed = true
  while (changed) {
    changed = false
    processes.forEach((p, i) => {
      if (!finish[i] && needFor(p).every((v, r) => v <= work[r])) {
        work.forEach((_, r) => { work[r] += p.allocation[r] })
        finish[i] = true
        sequence.push(p.id)
        changed = true
      }
    })
  }
  return { safe: finish.every(Boolean), sequence, work }
}

function Pill({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'green' | 'yellow' | 'red' | 'purple' }) {
  return <span className={`pill pill-${tone}`}>{children}</span>
}

function SectionTitle({ icon: Icon, title, action }: { icon: typeof Activity; title: string; action?: React.ReactNode }) {
  return <div className="section-title"><div className="section-title-main"><Icon size={16} /><h2>{title}</h2></div>{action}</div>
}

function ProcessNode({ data }: { data: { process: Process; deadlocked: boolean } }) {
  const p = data.process
  return <div className={`flow-node process-node ${data.deadlocked ? 'deadlocked' : ''}`} style={{ '--node-color': p.color } as React.CSSProperties}>
    <div className="node-top"><span className="node-dot" /><strong>{p.id}</strong><span className="node-state">{p.state}</span></div>
    <div className="node-name">{p.name}</div>
    <div className="node-detail"><span>alloc</span><b>[{p.allocation.join(', ')}]</b></div>
    <div className="node-detail"><span>need</span><b>[{needFor(p).join(', ')}]</b></div>
  </div>
}

function ResourceNode({ data }: { data: { resource: Resource; available: number; allocated: number } }) {
  const r = data.resource
  return <div className="flow-node resource-node" style={{ '--node-color': r.color } as React.CSSProperties}>
    <div className="resource-glyph" style={{ background: r.color }}><Layers3 size={17} /></div>
    <div><strong>{r.id}</strong><div className="node-name">{r.name}</div></div>
    <div className="resource-count"><b>{data.available}</b><span>available</span></div>
    <div className="resource-count"><b>{data.allocated}/{r.total}</b><span>allocated</span></div>
  </div>
}

const nodeTypes = { process: ProcessNode, resource: ResourceNode }

function DeadlockVisualizerStudio() {
  const [dark] = useState(true)
  const [processes, setProcesses] = useState(initialProcesses)
  const [available, setAvailable] = useState([1, 2, 1])
  const [selectedProcess, setSelectedProcess] = useState('P0')
  const [selectedResource, setSelectedResource] = useState(0)
  const [activeTab, setActiveTab] = useState<'overview' | 'banker' | 'fundamentals'>('overview')
  const [classicStep, setClassicStep] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [toast, setToast] = useState('Simulation ready')
  const [safeRun, setSafeRun] = useState<{ safe: boolean; sequence: string[]; work: number[] } | null>(null)
  const [bankerRequest, setBankerRequest] = useState([0, 1, 0])
  const [conditions, setConditions] = useState([true, true, true, true])

  const allocated = useMemo(() => sumAllocated(processes), [processes])
  const totalAvailable = available.reduce((a, b) => a + b, 0)
  const waitingCount = processes.filter(p => p.state === 'Waiting' || p.state === 'Blocked').length
  const deadlocked = classicStep >= 3
  const safety = useMemo(() => runSafety(processes, available), [processes, available])
  const activeProcess = processes.find(p => p.id === selectedProcess) ?? processes[0]

  const graphNodes = useMemo<Node[]>(() => [
    ...processes.map((p, i) => ({ id: p.id, type: 'process', position: { x: 60, y: 40 + i * 125 }, sourcePosition: Position.Right, targetPosition: Position.Left, data: { process: p, deadlocked } })),
    ...resources.map((r, i) => ({ id: r.id, type: 'resource', position: { x: 500, y: 75 + i * 150 }, sourcePosition: Position.Left, targetPosition: Position.Right, data: { resource: r, available: available[i], allocated: allocated[i] } })),
  ], [processes, available, allocated, deadlocked])

  const graphEdges = useMemo<Edge[]>(() => {
    const edges: Edge[] = []
    processes.forEach(p => p.allocation.forEach((amount, r) => { if (amount > 0) edges.push({ id: `${resources[r].id}-${p.id}`, source: resources[r].id, target: p.id, label: `${amount} instance${amount > 1 ? 's' : ''}`, animated: deadlocked, markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: resources[r].color, strokeWidth: 2.5 }, labelStyle: { fill: '#aab5c8', fontSize: 10 }, labelBgStyle: { fill: '#101a2b' } }) }))
    if (classicStep >= 1) edges.push({ id: 'P0-R1-request', source: 'P0', target: 'R1', label: 'request', animated: true, markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#f4b942', strokeWidth: 2, strokeDasharray: '5 4' }, labelStyle: { fill: '#f4b942', fontSize: 10 }, labelBgStyle: { fill: '#101a2b' } })
    if (classicStep >= 2) edges.push({ id: 'P1-R0-request', source: 'P1', target: 'R0', label: 'request', animated: true, markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#f4b942', strokeWidth: 2, strokeDasharray: '5 4' }, labelStyle: { fill: '#f4b942', fontSize: 10 }, labelBgStyle: { fill: '#101a2b' } })
    return edges
  }, [processes, classicStep, deadlocked])

  function flash(message: string) { setToast(message); window.setTimeout(() => setToast('Simulation ready'), 2500) }

  function requestResource() {
    const resource = resources[selectedResource]
    if (available[selectedResource] > 0) {
      setAvailable(a => a.map((v, i) => i === selectedResource ? v - 1 : v))
      setProcesses(ps => ps.map(p => p.id === selectedProcess ? { ...p, allocation: p.allocation.map((v, i) => i === selectedResource ? v + 1 : v), state: 'Running' } : p))
      flash(`${activeProcess.id} received ${resource.id}`)
    } else {
      setProcesses(ps => ps.map(p => p.id === selectedProcess ? { ...p, state: 'Blocked' } : p))
      flash(`${resource.id} unavailable — ${selectedProcess} is blocked`)
    }
  }

  function releaseProcess() {
    const p = activeProcess
    setAvailable(a => a.map((v, i) => v + p.allocation[i]))
    setProcesses(ps => ps.map(x => x.id === p.id ? { ...x, allocation: [0, 0, 0], state: 'Completed' } : x))
    flash(`${p.id} completed and released resources`)
  }

  function addProcess() {
    if (processes.length >= 10) { flash('Maximum of 10 processes reached'); return }
    const index = processes.length
    const next: Process = { id: `P${index}`, name: `Process ${index}`, color: colors[index % colors.length], allocation: [0, 0, 0], max: [1, 1, 1], state: 'Ready' }
    setProcesses(ps => [...ps, next]); setSelectedProcess(next.id); flash(`${next.id} added to the simulation`)
  }

  function removeSelectedProcess() {
    if (processes.length <= 1) { flash('Keep at least one process in the simulation'); return }
    const removed = activeProcess
    setAvailable(a => a.map((v, i) => v + removed.allocation[i]))
    const nextProcesses = processes.filter(p => p.id !== removed.id)
    setProcesses(nextProcesses); setSelectedProcess(nextProcesses[0].id); flash(`${removed.id} removed and its resources released`)
  }

  function reset() {
    setProcesses(initialProcesses); setAvailable([1, 2, 1]); setClassicStep(0); setSafeRun(null); setIsPaused(false); flash('Simulation reset')
  }

  function nextClassic() {
    if (isPaused) return
    setClassicStep(step => Math.min(4, step + 1))
    if (classicStep === 2) setProcesses(ps => ps.map(p => p.id === 'P0' || p.id === 'P1' ? { ...p, state: 'Deadlocked' } : p))
    if (classicStep === 3) { setProcesses(initialProcesses); setAvailable([1, 2, 1]); flash('Deadlock resolved — resources reclaimed') }
  }

  function runBanker() { const result = runSafety(processes, available); setSafeRun(result); flash(result.safe ? `Safe sequence found: ${result.sequence.join(' → ')}` : 'Unsafe state — no complete sequence') }

  function bankerCheck() {
    const requestValid = bankerRequest.every((v, i) => v <= needFor(activeProcess)[i])
    const availableValid = bankerRequest.every((v, i) => v <= available[i])
    if (!requestValid) { flash('Request exceeds the process need'); return }
    if (!availableValid) { flash('Request exceeds currently available resources'); return }
    const simulated = processes.map(p => p.id === activeProcess.id ? { ...p, allocation: p.allocation.map((v, i) => v + bankerRequest[i]) } : p)
    const result = runSafety(simulated, available.map((v, i) => v - bankerRequest[i]))
    setSafeRun(result)
    flash(result.safe ? 'Request granted — resulting state is safe' : 'Request denied — resulting state is unsafe')
  }

  return <div className={`deadlock-studio-route app-shell ${dark ? 'theme-dark' : 'theme-light'}`}>
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Activity size={19} /></div><div><div className="brand-name">Deadlock Studio</div><div className="brand-sub">OS A2Z · deadlock lab</div></div></div>
      <div className="side-label">Workspace</div>
      <nav className="side-nav">
        <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}><Activity size={17} /> Overview <span className="nav-count">01</span></button>
        <button className={activeTab === 'banker' ? 'active' : ''} onClick={() => setActiveTab('banker')}><ShieldCheck size={17} /> Banker's algorithm <span className="nav-count">02</span></button>
        <button className={activeTab === 'fundamentals' ? 'active' : ''} onClick={() => setActiveTab('fundamentals')}><BookOpen size={17} /> Deadlock fundamentals <span className="nav-count">04</span></button>
      </nav>
      <div className="side-label side-label-gap">Simulations</div>
      <div className="scenario-list"><button className="scenario active"><span className="scenario-dot red" /><span><b>Classic deadlock</b><small>2 processes · 2 resources</small></span><ChevronRight size={15} /></button><button className="scenario"><span className="scenario-dot blue" /><span><b>Dining philosophers</b><small>Coming soon</small></span><ChevronRight size={15} /></button><button className="scenario"><span className="scenario-dot gold" /><span><b>Readers & writers</b><small>Coming soon</small></span><ChevronRight size={15} /></button></div>
      <div className="sidebar-footer"><div className="tip"><Sparkles size={16} /><span><b>Learning tip</b><br />A cycle is only a deadlock when every resource in the cycle is single-instance.</span></div><div className="version">v1.0.0 · Educational preview</div></div>
    </aside>

    <main className="main-content">
      <header className="topbar"><div><div className="eyebrow">Interactive operating systems lab</div><h1>Deadlock Visualizer</h1><p>Explore allocation, waits, and safe states in real time.</p></div><div className="top-actions"><span className="live-status"><span className="live-dot" /> Live simulation</span><button className="icon-btn" aria-label="Reset simulation" onClick={reset}><RotateCcw size={17} /></button><a className="icon-btn" href="/dashboard" title="Back to the OS A2Z workspace" aria-label="Back to the OS A2Z workspace"><ArrowLeft size={17} /></a></div></header>

      {activeTab === 'overview' && <>
        <section className="stat-grid">
          <div className="stat-card"><div className="stat-icon violet"><Activity size={17} /></div><div><span>Processes</span><strong>{processes.length}</strong><small><span className="up">+1</span> this session</small></div></div>
          <div className="stat-card"><div className="stat-icon green"><Unlock size={17} /></div><div><span>Available resources</span><strong>{totalAvailable}<em> / 8</em></strong><small>{allocated.reduce((a,b)=>a+b,0)} allocated</small></div></div>
          <div className="stat-card"><div className="stat-icon gold"><Clock3 size={17} /></div><div><span>Waiting processes</span><strong>{waitingCount}</strong><small>1 needs attention</small></div></div>
          <div className="stat-card"><div className={`stat-icon ${deadlocked ? 'red' : 'blue'}`}><AlertTriangle size={17} /></div><div><span>System state</span><strong className="state-value">{deadlocked ? 'Deadlocked' : 'Safe'}</strong><small><span className={deadlocked ? 'down' : 'up'}>{deadlocked ? 'Cycle detected' : 'No cycles found'}</span></small></div></div>
        </section>

        <section className="content-grid top-grid">
          <div className="panel graph-panel"><SectionTitle icon={Activity} title="Resource allocation graph" action={<div className="legend"><span><i className="legend-line solid" /> Allocation</span><span><i className="legend-line dashed" /> Request</span></div>} /><div className="graph-wrap"><ReactFlow nodes={graphNodes} edges={graphEdges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.2 }} proOptions={{ hideAttribution: true }}><Background color="#24314a" gap={24} size={1} /><Controls showInteractive={false} /><MiniMap nodeColor={(node) => node.type === 'resource' ? '#28d7a1' : '#8b5cf6'} maskColor="rgba(5, 12, 24, 0.7)" /></ReactFlow><AnimatePresence>{deadlocked && <motion.div className="deadlock-banner" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}><AlertTriangle size={15} /><span><b>Deadlock detected</b> · P0 ↔ P1 circular wait</span></motion.div>}</AnimatePresence></div></div>
          <div className="panel config-panel"><SectionTitle icon={SlidersHorizontal} title="Live allocation" action={<div className="title-actions"><button className="text-btn" onClick={reset}>Reset all</button><button className="text-btn" onClick={addProcess}><Plus size={13} /> Add process</button></div>} /><div className="config-group"><label>Process</label><select value={selectedProcess} onChange={e => setSelectedProcess(e.target.value)}>{processes.map(p => <option key={p.id} value={p.id}>{p.id} · {p.name}</option>)}</select><button className="remove-process" onClick={removeSelectedProcess}><Trash2 size={12} /> Remove selected process</button></div><div className="config-group"><label>Resource request</label><div className="resource-select">{resources.map((r, i) => <button key={r.id} className={selectedResource === i ? 'resource-choice selected' : 'resource-choice'} onClick={() => setSelectedResource(i)}><span className="choice-dot" style={{ background: r.color }} />{r.id}<b>{available[i]}</b></button>)}</div></div><div className="config-actions"><button className="btn primary" onClick={requestResource}><ArrowRight size={15} /> Request resource</button><button className="btn secondary" onClick={releaseProcess}><Unlock size={15} /> Release all</button></div><div className="allocation-note"><CircleHelp size={15} /><span>Requests allocate immediately when an instance is available. Otherwise the process enters <b>Blocked</b>.</span></div><div className="mini-divider" /><div className="panel-subtitle">Current process states</div><div className="state-list">{processes.map(p => <button key={p.id} className="state-row" onClick={() => setSelectedProcess(p.id)}><span className="state-dot" style={{ background: p.color }} /><b>{p.id}</b><span>{p.name}</span><Pill tone={p.state === 'Running' ? 'green' : p.state === 'Waiting' || p.state === 'Blocked' ? 'yellow' : p.state === 'Deadlocked' ? 'red' : 'neutral'}>{p.state}</Pill></button>)}</div></div>
        </section>

        <section className="content-grid lower-grid"><div className="panel simulation-panel"><SectionTitle icon={Zap} title="Classic deadlock simulation" action={<Pill tone={deadlocked ? 'red' : 'purple'}>{deadlocked ? 'Deadlock found' : `Step ${classicStep + 1} of 5`}</Pill>} /><div className="classic-head"><div><div className="classic-title">Two processes, two resources</div><p>Watch the Coffman conditions emerge one operation at a time.</p></div><div className="classic-controls"><button className="icon-btn small" onClick={() => setIsPaused(v => !v)}>{isPaused ? <Play size={15} /> : <span className="pause-bars">Ⅱ</span>}</button><button className="btn primary small-btn" onClick={nextClassic}>{classicStep >= 4 ? 'Replay' : 'Execute next'} <ArrowRight size={14} /></button></div></div><div className="timeline">{['P0 owns R0', 'P1 owns R1', 'P0 requests R1', 'P1 requests R0', 'Deadlock'].map((label, i) => <div className={`timeline-item ${classicStep >= i ? 'done' : ''} ${classicStep === i ? 'current' : ''}`} key={label}><span className="timeline-dot">{classicStep > i ? <Check size={11} /> : i + 1}</span><span>{label}</span></div>)}</div><div className="classic-status"><div className={`status-icon ${deadlocked ? 'danger' : ''}`}>{deadlocked ? <AlertTriangle size={18} /> : <Play size={18} />}</div><div><b>{deadlocked ? 'Both processes are waiting forever' : classicStep === 0 ? 'Ready to start the scenario' : 'Allocation is progressing'}</b><span>{deadlocked ? 'Neither R0 nor R1 can be released without preemption.' : 'Execute the next operation to reveal the dependency.'}</span></div>{deadlocked && <button className="btn secondary small-btn" onClick={() => { setClassicStep(4); setProcesses(initialProcesses); flash('Deadlock resolved by resource preemption') }}><Unlock size={14} /> Resolve</button>}</div></div>
          <div className="panel analytics-panel"><SectionTitle icon={Activity} title="System analytics" action={<span className="time-range">Last 20 min</span>} /><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={history}><defs><linearGradient id="safeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.35} /><stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#25334b" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="step" tick={{ fill: '#71809a', fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis hide domain={[0, 10]} /><Tooltip contentStyle={{ background: '#101a2b', border: '1px solid #2a3b57', borderRadius: 10, fontSize: 11 }} /><Area type="monotone" dataKey="safe" stroke="#8b5cf6" strokeWidth={2} fill="url(#safeFill)" name="Safe operations" /><Area type="monotone" dataKey="allocated" stroke="#28d7a1" strokeWidth={2} fill="none" name="Allocated" /></AreaChart></ResponsiveContainer></div><div className="chart-legend"><span><i style={{ background: '#8b5cf6' }} />Safe operations</span><span><i style={{ background: '#28d7a1' }} />Allocated</span></div></div></section>
      </>}

      {activeTab === 'banker' && <section className="full-section"><div className="panel banker-hero"><div><Pill tone="green">Safety algorithm</Pill><h2>Banker's algorithm lab</h2><p>Temporarily grant a request, then prove the resulting state can still complete every process.</p></div><div className={`safety-result ${safeRun?.safe ?? safety.safe ? 'safe' : 'unsafe'}`}><div className="result-icon">{safeRun?.safe ?? safety.safe ? <ShieldCheck size={22} /> : <AlertTriangle size={22} />}</div><div><b>{safeRun?.safe ?? safety.safe ? 'Safe state' : 'Unsafe state'}</b><span>{(safeRun?.sequence ?? safety.sequence).length ? `Sequence: ${(safeRun?.sequence ?? safety.sequence).join(' → ')}` : 'No complete sequence found'}</span></div></div></div><div className="banker-grid"><div className="panel matrix-panel"><SectionTitle icon={Layers3} title="Need matrix" action={<button className="text-btn" onClick={() => setProcesses(initialProcesses)}>Load sample</button>} /><div className="matrix"><div className="matrix-row matrix-head"><span>Process</span>{resources.map(r => <span key={r.id}>{r.id}</span>)}</div>{processes.map(p => <div className="matrix-row" key={p.id}><span className="process-label"><i style={{ background: p.color }} />{p.id}</span>{needFor(p).map((v, i) => <span key={i} className="matrix-value">{v}</span>)}</div>)}</div><div className="matrix-caption"><span>Need = Max − Allocation</span><span>Available: <b>[{available.join(', ')}]</b></span></div></div><div className="panel request-panel"><SectionTitle icon={ArrowRight} title="Try a request" action={<Pill tone="purple">{activeProcess.id}</Pill>} /><p className="muted-copy">Ask the banker to grant resources to {activeProcess.name}. The request is only accepted if the system remains safe.</p><div className="request-fields">{resources.map((r, i) => <label key={r.id}><span>{r.id}</span><input type="number" min={0} max={9} value={bankerRequest[i]} onChange={e => setBankerRequest(v => v.map((x, j) => j === i ? Number(e.target.value) : x))} /></label>)}</div><button className="btn primary full-btn" onClick={bankerCheck}><ShieldCheck size={15} /> Check request</button><button className="btn secondary full-btn" onClick={runBanker}><Play size={15} /> Run safety algorithm</button><div className="work-strip"><span>Work vector</span><b>[{(safeRun?.work ?? available).join(', ')}]</b></div></div></div><div className="panel sequence-panel"><SectionTitle icon={ChevronRight} title="Safe sequence" action={<span className="text-muted">{(safeRun?.sequence ?? safety.sequence).length} of {processes.length} processes can finish</span>} /><div className="sequence-track">{(safeRun?.sequence ?? safety.sequence).map((id, i) => <motion.div layout key={id} className="sequence-card" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}><span>{String(i + 1).padStart(2, '0')}</span><b>{id}</b><small>releases allocation</small></motion.div>)}{!(safeRun?.sequence ?? safety.sequence).length && <div className="empty-sequence">Run the safety algorithm to reveal a valid execution order.</div>}</div></div></section>}

      {activeTab === 'fundamentals' && <section className="full-section"><div className="fundamentals-head"><div><Pill tone="purple">Core concepts</Pill><h2>The four Coffman conditions</h2><p>Deadlock requires all four conditions to hold at the same time. Toggle one off to see how the system becomes recoverable.</p></div><div className={`condition-summary ${conditions.every(Boolean) ? 'danger' : 'safe'}`}><b>{conditions.every(Boolean) ? 'Deadlock is possible' : 'Deadlock is prevented'}</b><span>{conditions.filter(Boolean).length}/4 conditions active</span></div></div><div className="conditions-grid">{[['Mutual exclusion', 'A resource can be held by only one process at a time.', 'One CPU slot, one owner.', 'M'], ['Hold and wait', 'A process holds resources while waiting for more.', 'P0 holds R0, waits for R1.', 'H'], ['No preemption', 'Resources cannot be forcibly taken from their owner.', 'Ownership ends on release.', 'N'], ['Circular wait', 'Every process waits for a resource held by the next.', 'P0 → P1 → P0.', 'C']].map(([title, copy, example, letter], i) => <button key={title} className={`condition-card ${conditions[i] ? 'active' : 'inactive'}`} onClick={() => setConditions(c => c.map((v, j) => j === i ? !v : v))}><div className="condition-top"><span className="condition-letter">{letter}</span><span className="toggle"><span /></span></div><h3>{title}</h3><p>{copy}</p><div className="condition-example"><ArrowRight size={13} /> {example}</div></button>)}</div><div className="panel lesson-panel"><div className="lesson-icon"><BookOpen size={18} /></div><div><b>Why this matters</b><p>Breaking any one condition is enough to prevent deadlock. In practice, operating systems often use preemption or impose a global resource ordering to break the cycle.</p></div><div className="lesson-flow"><span>4 conditions</span><ArrowRight size={14} /><strong>{conditions.every(Boolean) ? 'deadlock risk' : 'safe progress'}</strong></div></div></section>}

      <footer className="footer"><span><span className="live-dot" /> State updates are simulated locally</span><span>{toast}</span><span>Built for OS A2Z learners · <a href="/dashboard">Workspace</a></span></footer>
    </main>
  </div>
}

export default DeadlockVisualizerStudio


