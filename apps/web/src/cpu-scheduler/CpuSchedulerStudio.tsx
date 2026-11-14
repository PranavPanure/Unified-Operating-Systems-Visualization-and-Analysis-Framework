import { useEffect, useMemo, useState } from 'react'
import './styles.css'
import { AnimatePresence, motion } from 'framer-motion'
import { Activity, ArrowLeft, BarChart3, Check, ChevronLeft, ChevronRight, Clock3, Cpu, Gauge, GitBranch, Info, Moon, Pause, Play, Plus, RotateCcw, Settings2, Shuffle, Sparkles, Sun, Trash2, Trophy, Zap } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { algorithmInfo, average, schedule } from './algorithms'
import type { AlgorithmId, PriorityDirection, ProcessInput, ProcessMetrics, Segment } from './types'

const palette = ['#39d3c8', '#ffb454', '#9b8cff', '#f47ea4', '#69a7ff', '#c6e36b', '#ff7e68', '#79d5f2']
const initialProcesses: ProcessInput[] = [
  { id: 'P1', arrival: 0, burst: 7, priority: 2, color: palette[0] },
  { id: 'P2', arrival: 1, burst: 4, priority: 1, color: palette[1] },
  { id: 'P3', arrival: 3, burst: 2, priority: 4, color: palette[2] },
  { id: 'P4', arrival: 5, burst: 5, priority: 3, color: palette[3] },
]
const algorithmOptions: AlgorithmId[] = ['fcfs', 'sjf', 'srtf', 'rr', 'priority', 'priority-preemptive', 'ljf', 'lrtf', 'hrrn']

function format(value: number, digits = 1) { return Number.isInteger(value) ? `${value}` : value.toFixed(digits) }
function clamp(value: number, low: number, high: number) { return Math.max(low, Math.min(high, value)) }

const pageReveal = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: .55, staggerChildren: .07 } } }
const riseIn = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 110, damping: 16 } } }
const sidebarReveal = { hidden: { opacity: 0, x: -22 }, show: { opacity: 1, x: 0, transition: { duration: .5, staggerChildren: .08 } } }
const cardReveal = { hidden: { opacity: 0, y: 14, scale: .98 }, show: { opacity: 1, y: 0, scale: 1, transition: { duration: .42, ease: 'easeOut' as const } } }

function App() {
  const [processes, setProcesses] = useState(initialProcesses)
  const [algorithm, setAlgorithm] = useState<AlgorithmId>('srtf')
  const [quantum, setQuantum] = useState(2)
  const [contextSwitch, setContextSwitch] = useState(0)
  const [priorityDirection, setPriorityDirection] = useState<PriorityDirection>('lower')
  const [dark] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [time, setTime] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [selectedSegment, setSelectedSegment] = useState<string | undefined>()
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'compare'>('overview')

  const result = useMemo(() => schedule(processes, algorithm, quantum, contextSwitch, priorityDirection), [processes, algorithm, quantum, contextSwitch, priorityDirection])
  const info = algorithmInfo[algorithm]
  const maxTime = result.totalTime || 1
  const currentSegment = result.segments.find((segment) => time >= segment.start && time < segment.end)
  const selectedProcess = selectedSegment && result.segments.find((segment) => segment.id === selectedSegment)?.id

  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => {
      setTime((current) => {
        const next = Math.min(maxTime, current + 0.25 * speed)
        if (next >= maxTime) setPlaying(false)
        return next
      })
    }, 140)
    return () => window.clearInterval(timer)
  }, [playing, speed, maxTime])

  const resetPlayback = () => { setPlaying(false); setTime(0); setSelectedSegment(undefined) }
  const resetAll = () => { setProcesses(initialProcesses); setAlgorithm('srtf'); setQuantum(2); setContextSwitch(0); setPriorityDirection('lower'); resetPlayback() }
  const updateProcess = (id: string, field: keyof ProcessInput, raw: string) => {
    setProcesses((current) => current.map((process) => process.id === id ? { ...process, [field]: field === 'id' || field === 'color' ? raw : Math.max(0, Number(raw) || 0) } : process))
  }
  const addProcess = () => {
    if (processes.length >= 20) return
    const number = Array.from({ length: 20 }, (_, index) => index + 1).find((candidate) => !processes.some((p) => p.id === `P${candidate}`)) ?? processes.length + 1
    setProcesses((current) => [...current, { id: `P${number}`, arrival: 0, burst: 3, priority: number, color: palette[current.length % palette.length] }])
  }
  const removeProcess = (id: string) => { if (processes.length > 1) setProcesses((current) => current.filter((process) => process.id !== id)) }
  const randomize = () => setProcesses((current) => current.map((process, index) => ({ ...process, arrival: Math.floor(Math.random() * 7), burst: Math.floor(Math.random() * 8) + 2, priority: index + 1 })))
  const loadSample = () => setProcesses(initialProcesses)
  const timelineSteps = result.segments.filter((segment) => segment.kind !== 'context')
  const currentIndex = result.segments.findIndex((segment) => segment === currentSegment)
  const currentProcess = currentSegment?.kind === 'process' ? processes.find((process) => process.id === currentSegment.id) : undefined
  const currentExecuted = currentProcess ? result.segments.filter((segment) => segment.kind === 'process' && segment.id === currentProcess.id && segment.start < time).reduce((sum, segment) => sum + Math.min(segment.end, time) - segment.start, 0) : 0
  const readyQueue = processes.filter((process) => process.arrival <= time && result.metrics.find((metric) => metric.id === process.id)?.completion! > time && process.id !== currentProcess?.id)

  const comparison = useMemo(() => {
    const raw = algorithmOptions.map((id) => {
      const item = schedule(processes, id, quantum, contextSwitch, priorityDirection)
      return { id, name: algorithmInfo[id].short, waiting: average(item.metrics, 'waiting'), turnaround: average(item.metrics, 'turnaround'), response: average(item.metrics, 'response'), utilization: item.utilization }
    })
    const maxWaiting = Math.max(...raw.map((item) => item.waiting), 1)
    const maxTurnaround = Math.max(...raw.map((item) => item.turnaround), 1)
    const maxResponse = Math.max(...raw.map((item) => item.response), 1)
    return raw.map((item) => ({ ...item, score: (item.waiting / maxWaiting + item.turnaround / maxTurnaround + item.response / maxResponse + (100 - item.utilization) / 100) / 4 }))
  }, [processes, quantum, contextSwitch, priorityDirection])
  const chartData = result.metrics.map((metric) => ({ name: metric.id, waiting: metric.waiting, turnaround: metric.turnaround, response: metric.response, completion: metric.completion, color: metric.color }))

  return (
    <motion.div className={dark ? 'cpu-scheduler-route app-shell dark' : 'cpu-scheduler-route app-shell'} variants={pageReveal} initial="hidden" animate="show">
      <motion.header className="topbar" variants={riseIn}>
        <motion.div className="brand-lockup" initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .15, duration: .5 }}>
          <motion.div className="brand-mark" animate={{ rotate: [0, -4, 4, 0], scale: [1, 1.04, 1] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}><Cpu size={22} /></motion.div>
          <div><div className="brand-name">CPU Scheduler <span>Studio</span></div><div className="brand-subtitle">OS A2Z · CPU scheduling lab</div></div>
        </motion.div>
        <motion.div className="top-actions" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .2, duration: .5 }}>
          <motion.button className="ghost-button" whileHover={{ y: -2 }} whileTap={{ scale: .96 }} onClick={resetAll}><RotateCcw size={15} /> Reset simulation</motion.button>
          <motion.a className="github-link" whileHover={{ y: -2 }} href="/dashboard" title="Back to the OS A2Z workspace"><ArrowLeft size={16} /> Workspace</motion.a>
        </motion.div>
      </motion.header>

      <motion.main className="dashboard" variants={pageReveal}>
        <motion.aside className="sidebar" variants={sidebarReveal} initial="hidden" animate="show">
          <div className="section-heading"><div><div className="eyebrow">01 / INPUT</div><h2>Process workload</h2></div><span className="count-pill">{processes.length} / 20</span></div>
          <div className="table-card">
            <div className="process-table-header"><span>Process</span><span>Arrival</span><span>Burst</span><span>Priority</span><span /></div>
          <motion.div className="process-rows">
              <AnimatePresence initial={false}>{processes.map((process, index) => <motion.div className="process-row" key={process.id} initial={{ opacity: 0, x: -18, height: 0 }} animate={{ opacity: 1, x: 0, height: 'auto' }} exit={{ opacity: 0, x: 18, height: 0 }} transition={{ delay: index * .035 }} whileHover={{ backgroundColor: 'rgba(57,211,200,.045)', x: 2 }}>
                <div className="process-name"><span className="process-dot" style={{ background: process.color }} /><input value={process.id} onChange={(event) => updateProcess(process.id, 'id', event.target.value.toUpperCase())} aria-label={`${process.id} id`} /></div>
                <input className="number-input" type="number" min="0" value={process.arrival} onChange={(event) => updateProcess(process.id, 'arrival', event.target.value)} />
                <input className="number-input" type="number" min="1" value={process.burst} onChange={(event) => updateProcess(process.id, 'burst', event.target.value)} />
                <input className="number-input" type="number" min="1" value={process.priority} onChange={(event) => updateProcess(process.id, 'priority', event.target.value)} />
                <button className="row-delete" onClick={() => removeProcess(process.id)} disabled={processes.length <= 1} aria-label={`Remove ${process.id}`}><Trash2 size={14} /></button>
              </motion.div>)}</AnimatePresence>
            </motion.div>
            <motion.button className="add-process" whileHover={{ backgroundColor: 'rgba(57,211,200,.08)' }} whileTap={{ scale: .98 }} onClick={addProcess} disabled={processes.length >= 20}><Plus size={15} /> Add process</motion.button>
          </div>
          <motion.div className="quick-actions" variants={riseIn}><motion.button whileHover={{ y: -2, scale: 1.03 }} whileTap={{ scale: .94 }} onClick={randomize}><Shuffle size={14} /> Randomize</motion.button><motion.button whileHover={{ y: -2, scale: 1.03 }} whileTap={{ scale: .94 }} onClick={loadSample}><Sparkles size={14} /> Sample data</motion.button><motion.button whileHover={{ y: -2, scale: 1.03 }} whileTap={{ scale: .94 }} onClick={() => { if (processes.length > 1) setProcesses([processes[0]]) }}><Trash2 size={14} /> Clear extras</motion.button></motion.div>

          <div className="divider" />
          <div className="section-heading"><div><div className="eyebrow">02 / POLICY</div><h2>Scheduler setup</h2></div><Settings2 size={17} className="muted-icon" /></div>
          <label className="field-label">Scheduling algorithm<select value={algorithm} onChange={(event) => { setAlgorithm(event.target.value as AlgorithmId); resetPlayback() }}>{algorithmOptions.map((id) => <option value={id} key={id}>{algorithmInfo[id].name}</option>)}</select></label>
          {algorithm === 'rr' && <label className="field-label">Time quantum<div className="range-row"><input type="range" min="1" max="8" value={quantum} onChange={(event) => setQuantum(Number(event.target.value))} /><span>{quantum} units</span></div></label>}
          {(algorithm === 'priority' || algorithm === 'priority-preemptive') && <label className="field-label">Priority direction<select value={priorityDirection} onChange={(event) => setPriorityDirection(event.target.value as PriorityDirection)}><option value="lower">Lower number = higher</option><option value="higher">Higher number = higher</option></select></label>}
          <label className="field-label">Context switch cost<div className="range-row"><input type="range" min="0" max="3" value={contextSwitch} onChange={(event) => setContextSwitch(Number(event.target.value))} /><span>{contextSwitch} units</span></div></label>

          <motion.div className="algorithm-mini-card" variants={cardReveal} whileHover={{ y: -4, boxShadow: '0 20px 44px rgba(57,211,200,.12)' }}><div className="mini-card-top"><motion.span className="algorithm-code" key={info.short} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>{info.short}</motion.span><motion.span className="behavior-tag" key={info.behavior} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}>{info.behavior}</motion.span></div><AnimatePresence mode="wait"><motion.p key={info.description} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>{info.description}</motion.p></AnimatePresence><div className="mini-specs"><motion.span whileHover={{ x: 3 }}><b>Starvation</b>{info.starvation}</motion.span><motion.span whileHover={{ x: 3 }}><b>Complexity</b>{info.complexity}</motion.span></div></motion.div>
        </motion.aside>

        <motion.section className="content" variants={pageReveal} initial="hidden" animate="show">
          <motion.div className="content-heading" variants={riseIn}><div><div className="eyebrow">LIVE WORKBENCH <span className="live-dot" /> COMPUTED FROM YOUR INPUT</div><AnimatePresence mode="popLayout"><motion.h1 key={info.name} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>{info.name} <span>·</span> {processes.length} processes</motion.h1></AnimatePresence></div><div className="tab-switcher"><motion.button whileHover={{ y: -1 }} className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}><Activity size={15} /> Overview</motion.button><motion.button whileHover={{ y: -1 }} className={activeTab === 'analytics' ? 'active' : ''} onClick={() => setActiveTab('analytics')}><BarChart3 size={15} /> Analytics</motion.button><motion.button whileHover={{ y: -1 }} className={activeTab === 'compare' ? 'active' : ''} onClick={() => setActiveTab('compare')}><Trophy size={15} /> Compare</motion.button></div></motion.div>

          {activeTab === 'overview' ? <motion.div className="overview-grid" variants={pageReveal} initial="hidden" animate="show">
            <motion.div className="metric-grid" variants={pageReveal}>
              <MetricCard label="CPU utilization" value={`${format(result.utilization)}%`} sub="busy time / total time" icon={<Gauge size={18} />} accent="teal" />
              <MetricCard label="Avg. waiting time" value={`${format(average(result.metrics, 'waiting'))}u`} sub="lower is better" icon={<Clock3 size={18} />} accent="orange" />
              <MetricCard label="Avg. turnaround" value={`${format(average(result.metrics, 'turnaround'))}u`} sub="completion − arrival" icon={<Zap size={18} />} accent="purple" />
              <MetricCard label="Throughput" value={`${result.throughput.toFixed(2)}`} sub="processes / time unit" icon={<Trophy size={18} />} accent="pink" />
            </motion.div>

            <motion.div className="card gantt-card" variants={cardReveal}>
              <div className="card-header"><div><div className="eyebrow">EXECUTION TIMELINE</div><h2>Gantt chart</h2></div><div className="chart-tools"><button className="icon-button small" onClick={() => setZoom(clamp(zoom - .15, .7, 2))}><ChevronLeft size={15} /></button><span>{Math.round(zoom * 100)}%</span><button className="icon-button small" onClick={() => setZoom(clamp(zoom + .15, .7, 2))}><ChevronRight size={15} /></button></div></div>
              <div className="playback"><motion.button className="play-button" whileHover={{ scale: 1.12, rotate: playing ? -4 : 4 }} whileTap={{ scale: .86 }} animate={playing ? { boxShadow: ['0 0 0 rgba(57,211,200,0)', '0 0 22px rgba(57,211,200,.65)', '0 0 0 rgba(57,211,200,0)'] } : {}} transition={{ duration: 1.5, repeat: playing ? Infinity : 0 }} onClick={() => { if (time >= maxTime) setTime(0); setPlaying(!playing) }}>{playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}</motion.button><motion.button className="transport-button" whileHover={{ x: -2 }} whileTap={{ scale: .85 }} onClick={() => setTime(clamp(time - 1, 0, maxTime))}><ChevronLeft size={17} /></motion.button><motion.button className="transport-button" whileHover={{ x: 2 }} whileTap={{ scale: .85 }} onClick={() => setTime(clamp(time + 1, 0, maxTime))}><ChevronRight size={17} /></motion.button><div className="playback-track"><input type="range" min="0" max={maxTime} step="0.25" value={time} onChange={(event) => setTime(Number(event.target.value))} /><div className="time-labels"><span>0.00</span><AnimatePresence mode="popLayout"><motion.strong key={time} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>{format(time, 2)} / {format(maxTime, 2)}</motion.strong></AnimatePresence><span>{format(maxTime, 2)}</span></div></div><select className="speed-select" value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>{[.25, .5, 1, 2, 4].map((item) => <option key={item} value={item}>{item}x speed</option>)}</select><motion.button className="transport-button" whileHover={{ rotate: -35 }} whileTap={{ scale: .85 }} onClick={resetPlayback}><RotateCcw size={15} /></motion.button></div>
              <div className="gantt-scroll"><div className="gantt-inner" style={{ minWidth: `${Math.max(720, maxTime * 76 * zoom)}px` }}><div className="timeline-ruler">{Array.from({ length: Math.ceil(maxTime) + 1 }, (_, index) => <motion.span initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .015 }} key={index} style={{ left: `${(index / maxTime) * 100}%` }}>{index}</motion.span>)}</div><div className="gantt-lane"><div className="lane-label">CPU</div><div className="gantt-track">{result.segments.map((segment, index) => <motion.button layout initial={{ opacity: 0, scaleX: 0, originX: 0 }} animate={{ opacity: 1, scaleX: 1 }} transition={{ delay: index * .045, type: 'spring', stiffness: 180, damping: 20 }} whileHover={{ y: -4, scaleY: 1.08 }} key={`${segment.id}-${segment.start}-${index}`} className={`gantt-block ${segment.kind} ${selectedProcess === segment.id ? 'selected' : ''} ${currentSegment === segment ? 'playing-now' : ''}`} style={{ width: `${((segment.end - segment.start) / maxTime) * 100}%`, background: segment.kind === 'process' ? segment.color : undefined }} onClick={() => setSelectedSegment(segment.id)} title={`${segment.id}: ${segment.start} → ${segment.end}`}><span>{segment.kind === 'process' ? segment.id : segment.kind === 'context' ? 'CS' : 'IDLE'}</span><small>{format(segment.start)}–{format(segment.end)}</small></motion.button>)}</div></div><motion.div className="time-cursor" animate={{ left: `calc(60px + ${time / maxTime} * (100% - 60px))` }} transition={{ type: 'spring', stiffness: 180, damping: 24 }} /></div></div>
              <div className="legend"><span><i className="legend-swatch running" /> Process execution</span><span><i className="legend-swatch idle" /> CPU idle</span><span><i className="legend-swatch context" /> Context switch</span><span className="legend-note">Click a block to inspect it</span></div>
            </motion.div>

            <motion.div className="split-grid" variants={pageReveal}>
              <motion.div className="card cpu-card" variants={cardReveal}><div className="card-header"><div><div className="eyebrow">CPU TELEMETRY</div><h2>Live execution</h2></div><motion.span className={`state-badge ${currentSegment?.kind ?? 'idle'}`} animate={currentSegment?.kind === 'process' ? { scale: [1, 1.04, 1] } : {}} transition={{ duration: .8, repeat: currentSegment?.kind === 'process' ? Infinity : 0 }}><span />{currentSegment?.kind === 'process' ? 'Running' : currentSegment?.kind === 'context' ? 'Context switch' : 'Idle'}</motion.span></div><div className="cpu-visual"><motion.div className="cpu-chip" animate={currentSegment?.kind === 'process' ? { scale: [1, 1.05, 1], rotate: [0, 1, -1, 0] } : { scale: 1 }} transition={{ duration: 1.7, repeat: currentSegment?.kind === 'process' ? Infinity : 0, ease: 'easeInOut' }}><div className="chip-lines" /><Cpu size={43} /><div className="chip-label">CORE 0</div></motion.div><div className="cpu-readout"><AnimatePresence mode="wait"><motion.strong key={currentProcess?.id ?? 'idle'} initial={{ opacity: 0, scale: .75, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 1.2, y: -8 }}>{currentProcess?.id ?? '—'}</motion.strong></AnimatePresence><span>{currentProcess ? 'currently executing' : 'waiting for work'}</span><div className="readout-row"><b>{format(time)}u</b><small>simulation time</small></div></div></div><div className="telemetry-grid"><span><b>{currentProcess ? format(Math.max(0, currentProcess.burst - currentExecuted)) : '—'}</b><small>remaining burst</small></span><span><b>{currentSegment ? `${format(currentSegment.start)}–${format(currentSegment.end)}` : '—'}</b><small>current interval</small></span><span><b>{result.busyTime}u</b><small>total work</small></span></div></motion.div>
              <motion.div className="card queue-card" variants={cardReveal}><div className="card-header"><div><div className="eyebrow">PROCESS LIFECYCLE</div><h2>Ready queue</h2></div><AnimatePresence mode="popLayout"><motion.span key={readyQueue.length} className="queue-count" initial={{ scale: .7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}> {readyQueue.length} waiting</motion.span></AnimatePresence></div><div className="queue-list"><AnimatePresence mode="popLayout">{readyQueue.length ? readyQueue.map((process, index) => <motion.div layout initial={{ opacity: 0, x: -20, scale: .94 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 24, scale: .9 }} transition={{ delay: index * .04 }} key={process.id} className="queue-item"><motion.span className="process-dot" style={{ background: process.color }} animate={{ scale: [1, 1.35, 1] }} transition={{ duration: 1.8, repeat: Infinity, delay: index * .15 }} /><b>{process.id}</b><span>arrived at {process.arrival}</span><em>burst {process.burst}</em></motion.div>) : <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="empty-queue"><Check size={18} /><span>No other process is ready</span></motion.div>}</AnimatePresence></div><div className="lifecycle-strip">{['New', 'Ready', 'Running', 'Terminated'].map((label, index) => <motion.div animate={{ opacity: index === (currentProcess ? 2 : time >= maxTime ? 3 : 1) ? 1 : .48, y: index === (currentProcess ? 2 : time >= maxTime ? 3 : 1) ? -2 : 0 }} transition={{ type: 'spring', stiffness: 200 }} className={index === (currentProcess ? 2 : time >= maxTime ? 3 : 1) ? 'lifecycle-step active' : 'lifecycle-step'} key={label}><span>{index + 1}</span>{label}</motion.div>)}</div></motion.div>
            </motion.div>

            <motion.div className="card explanation-card" variants={cardReveal}><div className="card-header"><div><div className="eyebrow">WHY THIS HAPPENED</div><h2>Execution trace</h2></div><span className="trace-count">{result.decisions.length} decisions</span></div><div className="trace-list">{result.decisions.slice(0, 8).map((decision, index) => <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * .035 }} className={`trace-item ${decision.processId && decision.processId === currentSegment?.id ? 'active' : ''}`} key={`${decision.time}-${index}`}><span className="trace-time">t={format(decision.time)}</span><div><b>{decision.title}</b><p>{decision.detail}</p></div></motion.div>)}</div></motion.div>
          </motion.div> : activeTab === 'analytics' ? <Analytics comparison={comparison} chartData={chartData} currentAlgorithm={algorithm} /> : <ComparisonPanel comparison={comparison} currentAlgorithm={algorithm} />}

          <motion.div className="card metrics-card" variants={cardReveal}><div className="card-header"><div><div className="eyebrow">PER-PROCESS RESULTS</div><h2>Performance metrics</h2></div><AnimatePresence mode="popLayout"><motion.span className="total-time" key={result.totalTime} initial={{ opacity: 0, scale: .8 }} animate={{ opacity: 1, scale: 1 }}>total execution {format(result.totalTime)}u</motion.span></AnimatePresence></div><div className="metrics-table-wrap"><table><thead><tr><th>Process</th><th>Arrival</th><th>Burst</th><th>Complete</th><th>Turnaround</th><th>Waiting</th><th>Response</th></tr></thead><tbody>{result.metrics.map((metric, index) => <motion.tr initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .05 }} key={metric.id}><td><span className="process-name"><motion.span className="process-dot" style={{ background: metric.color }} animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 1.8, repeat: Infinity, delay: index * .12 }} />{metric.id}</span></td><td>{metric.arrival}</td><td>{metric.burst}</td><td className="strong-cell">{format(metric.completion)}</td><td>{format(metric.turnaround)}</td><td>{format(metric.waiting)}</td><td>{format(metric.response)}</td></motion.tr>)}</tbody></table></div></motion.div>
        </motion.section>
      </motion.main>
    </motion.div>
  )
}

function MetricCard({ label, value, sub, icon, accent }: { label: string; value: string; sub: string; icon: React.ReactNode; accent: string }) {
  return <motion.div className={`metric-card ${accent}`} variants={riseIn} whileHover={{ y: -5, scale: 1.015, transition: { duration: .2 } }}><motion.div className="metric-icon" whileHover={{ rotate: 12, scale: 1.12 }}>{icon}</motion.div><div><span>{label}</span><AnimatePresence mode="popLayout"><motion.strong key={value} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>{value}</motion.strong></AnimatePresence><small>{sub}</small></div></motion.div>
}

function ComparisonPanel({ comparison, currentAlgorithm }: { comparison: { id: AlgorithmId; name: string; waiting: number; turnaround: number; response: number; utilization: number; score: number }[]; currentAlgorithm: AlgorithmId }) {
  const ranked = [...comparison].sort((a, b) => a.score - b.score)
  const winner = ranked[0]
  const bestWaiting = comparison.reduce((best, item) => item.waiting < best.waiting ? item : best)
  const bestTurnaround = comparison.reduce((best, item) => item.turnaround < best.turnaround ? item : best)
  const bestResponse = comparison.reduce((best, item) => item.response < best.response ? item : best)
  const bestUtilization = comparison.reduce((best, item) => item.utilization > best.utilization ? item : best)
  const current = comparison.find((item) => item.id === currentAlgorithm)
  const winnerCards = [
    { label: 'Lowest waiting', value: bestWaiting.name, metric: `${format(bestWaiting.waiting)}u`, accent: 'orange' },
    { label: 'Lowest turnaround', value: bestTurnaround.name, metric: `${format(bestTurnaround.turnaround)}u`, accent: 'purple' },
    { label: 'Fastest response', value: bestResponse.name, metric: `${format(bestResponse.response)}u`, accent: 'teal' },
    { label: 'Highest utilization', value: bestUtilization.name, metric: `${format(bestUtilization.utilization)}%`, accent: 'pink' },
  ]
  return <motion.div className="comparison-view" variants={pageReveal} initial="hidden" animate="show"><motion.div className="comparison-hero" variants={cardReveal}><div className="comparison-hero-copy"><div className="eyebrow">POLICY LAB · SAME PROCESS DATASET</div><h2>Which algorithm is best?</h2><p>We score every policy against the metrics that matter: shorter waits, faster turnaround, quicker response, and efficient CPU use.</p></div><motion.div className="overall-winner" animate={{ y: [0, -4, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}><div className="winner-crown"><Trophy size={22} /></div><span>Overall winner</span><strong>{winner?.name ?? '—'}</strong><small>{winner ? `${Math.round((1 - winner.score) * 100)} / 100 fit score` : '—'}</small></motion.div></motion.div><div className="winner-grid">{winnerCards.map((card, index) => <motion.div className={`winner-card ${card.accent}`} variants={riseIn} whileHover={{ y: -5, scale: 1.02 }} key={card.label} transition={{ delay: index * .05 }}><span>{card.label}</span><strong>{card.value}</strong><small>{card.metric}</small></motion.div>)}</div><motion.div className="card ranked-card" variants={cardReveal}><div className="card-header"><div><div className="eyebrow">RANKED SCORECARD</div><h2>All algorithms, ranked</h2></div><span className="comparison-note">Lower score = better balance</span></div><div className="ranked-list">{ranked.map((item, index) => <motion.div className={`ranked-row ${item.id === currentAlgorithm ? 'current' : ''}`} layout key={item.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * .055 }} whileHover={{ x: 5 }}><span className={`rank-number ${index === 0 ? 'gold' : ''}`}>{index + 1}</span><div className="rank-name"><b>{item.name}</b>{item.id === currentAlgorithm && <em>current</em>}<span>{algorithmInfo[item.id].behavior}</span></div><div className="rank-bar"><div><i style={{ width: `${Math.max(7, (1 - item.score) * 100)}%` }} /></div><span>{Math.round((1 - item.score) * 100)}</span></div><span className="rank-metric">wait <b>{format(item.waiting)}</b></span><span className="rank-metric">turn <b>{format(item.turnaround)}</b></span><span className="rank-metric">resp <b>{format(item.response)}</b></span></motion.div>)}</div></motion.div><motion.div className="card recommendation-card" variants={cardReveal}><div className="recommendation-icon"><Sparkles size={18} /></div><div><b>Recommendation for this workload</b><p>{current && winner && current.id === winner.id ? `Keep ${current.name} selected — it is currently the best balanced policy for these processes.` : `Try ${winner?.name ?? 'the top-ranked policy'} next. It has the strongest combined score for this exact workload, while ${current?.name ?? 'your current policy'} remains available for comparison.`}</p></div></motion.div></motion.div>
}

function Analytics({ comparison, chartData, currentAlgorithm }: { comparison: { id: AlgorithmId; name: string; waiting: number; turnaround: number; response: number; utilization: number }[]; chartData: { name: string; waiting: number; turnaround: number; response: number; completion: number; color: string }[]; currentAlgorithm: AlgorithmId }) {
  return <div className="analytics-view"><div className="analytics-intro"><div><div className="eyebrow">09 ALGORITHMS · SAME WORKLOAD</div><h2>Compare scheduling policies</h2><p>Every row is recalculated from the current process table, so trade-offs stay honest as you experiment.</p></div><div className="winner-badge"><Trophy size={16} /><span>Best waiting time<b>{comparison.reduce((best, item) => item.waiting < best.waiting ? item : best).name}</b></span></div></div><div className="chart-grid"><div className="card chart-card"><div className="card-header"><h2>Time metrics by process</h2><span>units</span></div><ResponsiveContainer width="100%" height={250}><BarChart data={chartData} margin={{ top: 5, right: 10, left: -16, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.12)" vertical={false} /><XAxis dataKey="name" stroke="#7c8aa4" tickLine={false} axisLine={false} /><YAxis stroke="#7c8aa4" tickLine={false} axisLine={false} /><Tooltip contentStyle={{ background: '#122039', border: '1px solid #263855', borderRadius: 10, color: '#f5f7fb' }} /><Bar dataKey="waiting" name="Waiting" fill="#ffb454" radius={[4, 4, 0, 0]} /><Bar dataKey="turnaround" name="Turnaround" fill="#9b8cff" radius={[4, 4, 0, 0]} /><Bar dataKey="response" name="Response" fill="#39d3c8" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div><div className="card chart-card"><div className="card-header"><h2>Completion timeline</h2><span>time units</span></div><ResponsiveContainer width="100%" height={250}><LineChart data={chartData} margin={{ top: 5, right: 10, left: -16, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.12)" vertical={false} /><XAxis dataKey="name" stroke="#7c8aa4" tickLine={false} axisLine={false} /><YAxis stroke="#7c8aa4" tickLine={false} axisLine={false} /><Tooltip contentStyle={{ background: '#122039', border: '1px solid #263855', borderRadius: 10, color: '#f5f7fb' }} /><Line type="monotone" dataKey="completion" name="Completion" stroke="#f47ea4" strokeWidth={3} dot={{ fill: '#f47ea4', r: 4 }} /></LineChart></ResponsiveContainer></div></div><div className="card comparison-card"><div className="card-header"><div><div className="eyebrow">POLICY SCORECARD</div><h2>Algorithm comparison</h2></div><span>lower time is better</span></div><div className="comparison-table"><div className="comparison-row comparison-heading"><span>Algorithm</span><span>Avg waiting</span><span>Avg turnaround</span><span>Avg response</span><span>Utilization</span></div>{comparison.map((item) => <div className="comparison-row" key={item.id}><span className={item.id === currentAlgorithm ? 'current-algorithm' : ''}>{item.name}{item.id === currentAlgorithm && <em>current</em>}</span><span>{format(item.waiting)}</span><span>{format(item.turnaround)}</span><span>{format(item.response)}</span><span><i className="util-bar"><i style={{ width: `${item.utilization}%` }} /></i>{format(item.utilization)}%</span></div>)}</div></div></div>
}

export default App


