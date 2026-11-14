import './styles.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, type Variants } from 'framer-motion'
import {
  Activity, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BookOpen, Check, ChevronDown, ChevronRight,
  CircleHelp, Clock3, Disc3, Code2, Gauge, GitCompare, Info, Lightbulb, Moon, Pause, Play, Plus,
  RotateCcw, Settings2, Shuffle, SkipBack, SkipForward, Sparkles, Sun, Trash2, Waves, X,
} from 'lucide-react'
import { algorithmMeta, algorithms, schedule } from './algorithms'
import { AlgorithmKey, Direction, DiskConfig, Movement, RequestItem } from './types'
import { averageRotationalLatency, estimateSeekTime, estimatedTransferTime, getMetrics, movementColor } from './utils'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const SAMPLE_REQUESTS = [98, 183, 37, 122, 14, 124, 65, 67]

const initialConfig: DiskConfig = { min: 0, max: 199, head: 53, direction: 'up', rpm: 7200, seekCost: 0.08, requestSize: 4, transferRate: 180 }

const pageMotion: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.55, staggerChildren: 0.055 } },
}

const riseMotion: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.985 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 90, damping: 17 } },
}

const softMotion: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

function DiskSchedulerStudio() {
  const [config, setConfig] = useState<DiskConfig>(initialConfig)
  const [requests, setRequests] = useState<RequestItem[]>(SAMPLE_REQUESTS.map((cylinder, id) => ({ id, cylinder })))
  const [algorithm, setAlgorithm] = useState<AlgorithmKey>('FCFS')
  const [speed, setSpeed] = useState(1)
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [dark] = useState(true)
  const [newRequest, setNewRequest] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showComparison, setShowComparison] = useState(true)
  const [toast, setToast] = useState('')
  const timer = useRef<number | undefined>(undefined)

  const result = useMemo(() => schedule(algorithm, config, requests), [algorithm, config, requests])
  const metrics = useMemo(() => getMetrics(result, step), [result, step])
  const fullMetrics = useMemo(() => getMetrics(result), [result])
  const comparisons = useMemo(() => algorithms.map((name) => {
    const scheduleResult = schedule(name, config, requests)
    return { name, result: scheduleResult, metrics: getMetrics(scheduleResult) }
  }), [config, requests])

  useEffect(() => {
    setStep(0)
    setPlaying(false)
  }, [algorithm, config.head, config.direction, config.min, config.max, requests])

  useEffect(() => {
    if (!playing) return
    if (step >= result.movements.length) { setPlaying(false); return }
    timer.current = window.setTimeout(() => setStep((current) => Math.min(current + 1, result.movements.length)), 850 / speed)
    return () => window.clearTimeout(timer.current)
  }, [playing, step, speed, result.movements.length])

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(''), 2400)
    return () => window.clearTimeout(id)
  }, [toast])

  const visibleMoves = result.movements.slice(0, step)
  const currentPosition = visibleMoves.length ? visibleMoves[visibleMoves.length - 1].to : result.initialHead
  const activeMovement = step > 0 ? result.movements[step - 1] : undefined
  const progress = result.movements.length ? (step / result.movements.length) * 100 : 0

  const updateConfig = <K extends keyof DiskConfig>(key: K, value: DiskConfig[K]) => setConfig((current) => ({ ...current, [key]: value }))
  const isValidCylinder = (value: number) => Number.isFinite(value) && value >= config.min && value <= config.max
  const addRequest = (value = newRequest) => {
    const cylinder = Number(value)
    if (!isValidCylinder(cylinder)) { setToast(`Cylinder must be between ${config.min} and ${config.max}.`); return }
    if (requests.length >= 100) { setToast('The queue is limited to 100 requests.'); return }
    setRequests((current) => [...current, { id: Math.max(-1, ...current.map((item) => item.id)) + 1, cylinder }])
    setNewRequest('')
  }
  const changeBounds = (key: 'min' | 'max', raw: string) => {
    const next = Number(raw)
    if (!Number.isFinite(next)) return
    setConfig((current) => {
      const proposed = { ...current, [key]: next }
      const min = Math.min(proposed.min, proposed.max - 1)
      const max = Math.max(proposed.max, min + 1)
      return { ...proposed, min, max, head: Math.min(max, Math.max(min, proposed.head)) }
    })
  }
  const reset = () => { setConfig(initialConfig); setRequests(SAMPLE_REQUESTS.map((cylinder, id) => ({ id, cylinder }))); setAlgorithm('FCFS'); setStep(0); setPlaying(false); setToast('Simulation reset to the textbook example.') }
  const loadRandom = () => {
    const values = Array.from({ length: 10 }, () => Math.floor(Math.random() * (config.max - config.min + 1)) + config.min)
    setRequests(values.map((cylinder, id) => ({ id, cylinder })))
    setToast('Generated a fresh deterministic queue for this run.')
  }

  return <motion.div className={`disk-studio-route ${dark ? 'app dark' : 'app'}`} initial="hidden" animate="show" variants={pageMotion}>
    <motion.header className="topbar" initial={{ y: -70, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 80, damping: 15 }}>
      <motion.div className="brand" whileHover={{ x: 3 }}>
        <motion.div className="brand-mark" animate={{ rotate: [0, 360] }} transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}><Disc3 size={21} /></motion.div>
        <div><div className="brand-title">Disk Scheduler <span>Studio</span></div><motion.div className="brand-subtitle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .45 }}>OS A2Z · disk scheduling lab</motion.div></div>
      </motion.div>
      <motion.div className="top-actions" variants={softMotion}>
        <motion.div className="live-pill" animate={{ opacity: [0.65, 1, 0.65] }} transition={{ duration: 2.2, repeat: Infinity }}><span className="pulse-dot" /> Simulation ready</motion.div>
        <motion.button className="ghost-button" whileHover={{ y: -2 }} whileTap={{ scale: .96 }} onClick={reset}><RotateCcw size={15} /> Reset</motion.button>
        <motion.a className="icon-button" whileHover={{ y: -2, rotate: -8 }} href="/dashboard" title="Back to the OS A2Z workspace"><ArrowLeft size={17} /></motion.a>
      </motion.div>
    </motion.header>

    <motion.main className="workspace" variants={pageMotion}>
      <motion.aside className="sidebar" variants={pageMotion}>
        <motion.section className="side-section" variants={riseMotion}>
          <div className="section-kicker"><Settings2 size={14} /> SIMULATION SETUP</div>
          <div className="field-grid">
            <Field label="Min cylinder"><input type="number" value={config.min} onChange={(event) => changeBounds('min', event.target.value)} /></Field>
            <Field label="Max cylinder"><input type="number" value={config.max} onChange={(event) => changeBounds('max', event.target.value)} /></Field>
          </div>
          <Field label="Initial head position"><input type="number" min={config.min} max={config.max} value={config.head} onChange={(event) => updateConfig('head', Math.min(config.max, Math.max(config.min, Number(event.target.value))))} /></Field>
          <Field label="Initial direction"><div className="segmented"><button className={config.direction === 'up' ? 'selected' : ''} onClick={() => updateConfig('direction', 'up')}><ArrowUp size={14} /> Higher</button><button className={config.direction === 'down' ? 'selected' : ''} onClick={() => updateConfig('direction', 'down')}><ArrowDown size={14} /> Lower</button></div></Field>
        </motion.section>

        <motion.section className="side-section queue-section" variants={riseMotion}>
          <div className="section-kicker"><Waves size={14} /> REQUEST QUEUE <span className="count-badge">{requests.length}/100</span></div>
          <div className="add-row"><input placeholder="Cylinder #" value={newRequest} onChange={(event) => setNewRequest(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && addRequest()} /><button className="primary-icon" onClick={() => addRequest()}><Plus size={16} /></button></div>
          <div className="queue-actions"><button onClick={loadRandom}><Shuffle size={13} /> Random</button><button onClick={() => { setRequests(SAMPLE_REQUESTS.map((cylinder, id) => ({ id, cylinder }))); setToast('Loaded the classic 98, 183, 37… example.') }}>Sample</button><button onClick={() => setRequests([])} className="danger-text">Clear</button></div>
          <div className="request-list">
            {requests.length === 0 && <div className="empty-state">No pending requests. Add a cylinder to begin.</div>}
            {requests.map((item, index) => {
              const movementIndex = result.movements.findIndex((movement) => movement.requestId === item.id)
              const done = movementIndex >= 0 && movementIndex < step
              const active = movementIndex === step - 1
              return <motion.div className={`request-row ${done ? 'done' : ''} ${active ? 'active' : ''}`} key={item.id} layout initial={{ opacity: 0, x: -18, scale: .96 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 18, scale: .92 }} transition={{ type: 'spring', stiffness: 220, damping: 20 }} whileHover={{ x: 4 }}>
                <span className="request-index">{String(index + 1).padStart(2, '0')}</span><span className="request-cylinder">{item.cylinder}</span><span className="request-status">{done ? <Check size={13} /> : active ? 'NOW' : 'PEND'}</span><button className="remove-button" onClick={() => setRequests((current) => current.filter((request) => request.id !== item.id))}><X size={13} /></button>
              </motion.div>
            })}
          </div>
        </motion.section>

        <motion.section className="side-section" variants={riseMotion}>
          <div className="section-kicker"><Sparkles size={14} /> ALGORITHM</div>
          <motion.div className="algorithm-picker" variants={pageMotion}>{algorithms.map((item, index) => <motion.button key={item} className={algorithm === item ? 'algorithm-option selected' : 'algorithm-option'} onClick={() => setAlgorithm(item)} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * .045 }} whileHover={{ x: 5 }} whileTap={{ scale: .97 }}><motion.span className="algorithm-dot" style={{ background: algorithmMeta[item].accent }} animate={algorithm === item ? { scale: [1, 1.35, 1] } : { scale: 1 }} transition={{ duration: 1.4, repeat: algorithm === item ? Infinity : 0 }} /><span>{item}</span><ChevronRight size={14} /></motion.button>)}</motion.div>
        </motion.section>

        <motion.section className="side-section compact-settings" variants={riseMotion}>
          <div className="section-kicker"><Gauge size={14} /> DRIVE MODEL</div>
          <div className="field-grid"><Field label="RPM"><input type="number" value={config.rpm} onChange={(event) => updateConfig('rpm', Number(event.target.value))} /></Field><Field label="ms / cylinder"><input type="number" step="0.01" value={config.seekCost} onChange={(event) => updateConfig('seekCost', Number(event.target.value))} /></Field></div>
        </motion.section>
      </motion.aside>

      <motion.div className="content" variants={pageMotion}>
        <motion.div className="content-heading" variants={riseMotion}><div><div className="eyebrow">WORKBENCH / {algorithm}</div><h1>Head movement <span>in motion.</span></h1><p>Trace every decision, seek, and direction change in a living disk simulation.</p></div><motion.div className="heading-badge" key={algorithm} initial={{ opacity: 0, x: 25 }} animate={{ opacity: 1, x: 0 }} transition={{ type: 'spring' }}><span className="mini-label">ACTIVE STRATEGY</span><strong>{algorithmMeta[algorithm].label}</strong><span>{algorithmMeta[algorithm].complexity} time complexity</span></motion.div></motion.div>

        <section className="hero-card card">
          <div className="card-header"><div><div className="section-kicker">LIVE DISK TRACK <span className="live-dot" /> </div><div className="card-title">Cylinder landscape</div></div><div className="legend"><span><i className="legend-dot pending" /> Pending</span><span><i className="legend-dot complete" /> Serviced</span><span><i className="legend-dot head" /> Head</span></div></div>
          <DiskTrack config={config} result={result} currentPosition={currentPosition} step={step} />
          <div className="track-footer"><span>0 / MIN</span><span className="track-readout">HEAD <strong>{currentPosition}</strong> <span className={activeMovement?.direction === 'down' ? 'down' : ''}>{activeMovement?.direction === 'up' ? '↑' : activeMovement?.direction === 'down' ? '↓' : '•'}</span></span><span>{config.max} / MAX</span></div>
          {activeMovement && <motion.div className="movement-callout" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} key={`${step}-${activeMovement.to}`}><span className="callout-icon" style={{ color: movementColor(activeMovement.type) }}>{activeMovement.type === 'wrap' ? <RotateCcw size={15} /> : activeMovement.type === 'boundary' ? <ArrowRight size={15} /> : <Activity size={15} />}</span><span><strong>{activeMovement.type === 'request' ? `Servicing request at cylinder ${activeMovement.to}` : activeMovement.type === 'wrap' ? `Wraparound: ${activeMovement.from} → ${activeMovement.to}` : `Boundary traversal to ${activeMovement.to}`}</strong><small>{activeMovement.distance} cylinders · {activeMovement.direction ? `moving ${activeMovement.direction === 'up' ? 'higher' : 'lower'}` : 'stationary request'}</small></span><b>+{activeMovement.distance}</b></motion.div>}
        </section>

        <section className="control-card card"><div className="play-controls"><button className="play-button" onClick={() => { if (step >= result.movements.length) setStep(0); setPlaying((value) => !value) }}>{playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}</button><button className="control-icon" onClick={() => setStep((value) => Math.max(0, value - 1))}><SkipBack size={17} /></button><button className="control-icon" onClick={() => setStep((value) => Math.min(result.movements.length, value + 1))}><SkipForward size={17} /></button><div className="progress-wrap"><div className="progress-label"><span>{playing ? 'Playing simulation' : step === result.movements.length ? 'Simulation complete' : 'Ready to step through'}</span><strong>{step} / {result.movements.length} movements</strong></div><input className="progress" type="range" min="0" max={result.movements.length} value={step} onChange={(event) => { setPlaying(false); setStep(Number(event.target.value)) }} style={{ '--progress': `${progress}%` } as React.CSSProperties} /></div></div><div className="speed-control"><Clock3 size={14} /><span>Speed</span>{[0.25, 0.5, 1, 2, 4].map((value) => <button key={value} className={speed === value ? 'speed selected' : 'speed'} onClick={() => setSpeed(value)}>{value}×</button>)}</div></section>

        <div className="section-heading"><div><div className="section-kicker">EXECUTION TRACE</div><h2>Seek sequence</h2></div><span className="sequence-caption">{fullMetrics.requestsServiced} requests · {fullMetrics.totalMovement} cylinders total</span></div>
        <section className="sequence-card card"><div className="sequence-scroll">{result.sequence.map((position, index) => <div className="sequence-item" key={`${position}-${index}`}><button className={`sequence-node ${index === 0 ? 'initial' : index <= step ? 'completed' : index === step + 1 ? 'current' : ''}`} onClick={() => index > 0 && setStep(index)}><span>{position}</span>{index === 0 && <small>START</small>}</button>{index < result.sequence.length - 1 && <div className={`sequence-line ${index < step ? 'filled' : ''}`}><span>{result.movements[index].distance}</span><i /></div>}</div>)}</div><div className="sequence-meta"><span><i className="line-swatch" /> request movement</span>{fullMetrics.wraps > 0 && <span><i className="line-swatch wrap" /> wraparound included</span>}<span className="sequence-algo">{algorithmMeta[algorithm].description}</span></div></section>

        <div className="section-heading"><div><div className="section-kicker">TELEMETRY</div><h2>Performance at a glance</h2></div><button className="link-button" onClick={() => setShowComparison((value) => !value)}><GitCompare size={15} /> {showComparison ? 'Hide' : 'Show'} comparison</button></div>
        <div className="metrics-grid"><MetricCard label="Total movement" value={`${metrics.totalMovement}`} unit="cyl" icon={<Activity size={16} />} accent="purple" trend={fullMetrics.totalMovement ? `${Math.round((metrics.totalMovement / fullMetrics.totalMovement) * 100)}% of run` : 'Ready'} /><MetricCard label="Average seek" value={metrics.averageSeek.toFixed(1)} unit="cyl / req" icon={<Waves size={16} />} accent="cyan" trend={`max ${metrics.maxSeek} cyl`} /><MetricCard label="Seek time est." value={estimateSeekTime(metrics.totalMovement, config.seekCost).toFixed(1)} unit="ms" icon={<Clock3 size={16} />} accent="amber" trend={`${config.seekCost} ms / cylinder`} /><MetricCard label="Direction changes" value={`${metrics.reversals}`} unit="reversals" icon={<RotateCcw size={16} />} accent="rose" trend={`${metrics.wraps} wrap${metrics.wraps === 1 ? '' : 's'}`} /></div>

        {showComparison && <section className="comparison-card card"><div className="card-header"><div><div className="section-kicker"><GitCompare size={14} /> WORKLOAD COMPARISON</div><div className="card-title">Same queue, six strategies</div></div><span className="best-badge"><Sparkles size={13} /> Best: {comparisons.reduce((best, item) => item.metrics.totalMovement < best.metrics.totalMovement ? item : best, comparisons[0])?.name}</span></div><div className="chart-layout"><div className="comparison-table"><div className="table-row table-head"><span>Algorithm</span><span>Total movement</span><span>Avg seek</span><span>Reversals</span></div>{comparisons.map((item) => <div className={`table-row ${item.name === algorithm ? 'active-row' : ''}`} key={item.name} onClick={() => setAlgorithm(item.name)}><span><i className="algorithm-dot" style={{ background: algorithmMeta[item.name].accent }} />{item.name}</span><strong>{item.metrics.totalMovement}</strong><span>{item.metrics.averageSeek.toFixed(1)}</span><span>{item.metrics.reversals}</span></div>)}</div><div className="chart-box"><div className="chart-label">Total head movement</div><ResponsiveContainer width="100%" height={180}><BarChart data={comparisons.map((item) => ({ name: item.name, movement: item.metrics.totalMovement }))} layout="vertical" margin={{ left: 0, right: 18, top: 4, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" stroke="#24304a" horizontal={false} /><XAxis type="number" hide /><YAxis dataKey="name" type="category" tick={{ fill: '#94a3b8', fontSize: 11 }} width={55} axisLine={false} tickLine={false} /><Tooltip cursor={{ fill: '#18233a' }} contentStyle={{ background: '#101a2c', border: '1px solid #293b5d', borderRadius: 10, color: '#e2e8f0' }} /><Bar dataKey="movement" fill="#8b5cf6" radius={[0, 5, 5, 0]} /></BarChart></ResponsiveContainer></div></div></section>}

        <section className="lower-grid"><section className="education-card card"><div className="card-header"><div><div className="section-kicker"><Lightbulb size={14} /> DECISION INSIGHT</div><div className="card-title">Why did it move there?</div></div><span className="info-icon"><CircleHelp size={15} /></span></div><AnimatePresence mode="wait"><motion.div className="insight-body" key={`${algorithm}-${step}`} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}><div className="insight-number">{String(step).padStart(2, '0')}</div><p>{explainEvent(algorithm, config, result, step)}</p></motion.div></AnimatePresence><div className="algorithm-facts"><div><span>Strategy</span><strong>{algorithmMeta[algorithm].label}</strong></div><div><span>Complexity</span><strong>{algorithmMeta[algorithm].complexity}</strong></div><div><span>Starvation</span><strong>{algorithmMeta[algorithm].starvation}</strong></div></div></section><section className="education-card card geometry-card"><div className="card-header"><div><div className="section-kicker"><Disc3 size={14} /> DISK GEOMETRY</div><div className="card-title">The anatomy of a seek</div></div></div><div className="geometry-visual"><div className="platter platter-one"><div className="platter-ring ring-one" /><div className="platter-ring ring-two" /><div className="platter-hole" /></div><motion.div className="read-arm" animate={{ rotate: -22 + (currentPosition / config.max) * 40 }} transition={{ type: 'spring', stiffness: 100 }}><span className="read-head" /></motion.div><div className="geometry-label track-label">TRACKS</div><div className="geometry-label head-label">READ / WRITE HEAD</div></div><div className="geometry-legend"><span><b>Track</b> concentric path</span><span><b>Cylinder</b> matching tracks across platters</span><span><b>Sector</b> smallest addressable slice</span></div></section></section>

        <section className="advanced card"><button className="advanced-toggle" onClick={() => setShowAdvanced((value) => !value)}><span><BookOpen size={16} /> Advanced disk concepts</span>{showAdvanced ? <ChevronDown size={17} /> : <ChevronRight size={17} />}</button>{showAdvanced && <div className="advanced-content"><Concept title="Seek time" value={`${estimateSeekTime(fullMetrics.totalMovement, config.seekCost).toFixed(1)} ms`} text="The mechanical time to move the actuator across cylinders. This is the cost disk scheduling primarily optimizes." /><Concept title="Rotational latency" value={`${averageRotationalLatency(config.rpm).toFixed(2)} ms`} text={`Average wait for the platter to rotate under the head at ${config.rpm.toLocaleString()} RPM. It is roughly half a revolution.`} /><Concept title="Transfer time" value={`${estimatedTransferTime(config.requestSize, config.transferRate).toFixed(2)} ms`} text={`${config.requestSize} MB at ${config.transferRate} MB/s. SSDs largely remove mechanical seek, so modern schedulers weigh queueing and parallelism too.`} /></div>}</section>
        <footer><span>Disk Scheduler Studio · built for learning OS fundamentals</span><span>Real algorithms · deterministic playback · no fake data</span></footer>
      </motion.div>
    </motion.main>
    {toast && <motion.div className="toast" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>{toast}</motion.div>}
  </motion.div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="field"><span>{label}</span>{children}</label> }

function MetricCard({ label, value, unit, icon, accent, trend }: { label: string; value: string; unit: string; icon: React.ReactNode; accent: string; trend: string }) { return <motion.div className={`metric-card ${accent}`} layout initial={{ opacity: 0, y: 16, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} whileHover={{ y: -7, scale: 1.025 }} transition={{ type: 'spring', stiffness: 130, damping: 18 }}><div className="metric-top"><span>{label}</span><motion.i animate={{ rotate: [0, 8, -8, 0] }} transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}>{icon}</motion.i></div><motion.div className="metric-value" key={value} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>{value}<small>{unit}</small></motion.div><div className="metric-trend">{trend}</div></motion.div> }

function DiskTrack({ config, result, currentPosition, step }: { config: DiskConfig; result: ReturnType<typeof schedule>; currentPosition: number; step: number }) {
  const range = config.max - config.min || 1
  const x = (value: number) => ((value - config.min) / range) * 100
  const pathPoints = result.movements.slice(0, step).map((movement, index) => `${x(index === 0 ? result.initialHead : result.movements[index - 1].to)},${18 + (index % 3) * 22} ${x(movement.to)},${18 + ((index + 1) % 3) * 22}`).join(' ')
  return <div className="track-wrap"><svg className="track-svg" viewBox="0 0 1000 110" preserveAspectRatio="none"><defs><linearGradient id="track-gradient" x1="0" x2="1"><stop offset="0" stopColor="#334155" /><stop offset=".5" stopColor="#58698a" /><stop offset="1" stopColor="#334155" /></linearGradient><filter id="glow"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs><line x1="0" y1="55" x2="1000" y2="55" stroke="url(#track-gradient)" strokeWidth="3" /><line x1="0" y1="55" x2={x(currentPosition) * 10} y2="55" stroke="#8b5cf6" strokeWidth="3" opacity=".75" /><g className="path-lines">{pathPoints && <polyline points={pathPoints.split(' ').map((point) => { const [px, py] = point.split(','); return `${Number(px) * 10},${py}` }).join(' ')} fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="4 5" opacity=".65" />}</g><line x1={x(config.min) * 10} y1="42" x2={x(config.min) * 10} y2="68" stroke="#fb7185" strokeWidth="2" /><line x1={x(config.max) * 10} y1="42" x2={x(config.max) * 10} y2="68" stroke="#fb7185" strokeWidth="2" />{result.requests.map((request) => { const movementIndex = result.movements.findIndex((movement) => movement.requestId === request.id); const done = movementIndex >= 0 && movementIndex < step; const active = request.cylinder === currentPosition && movementIndex === step - 1; return <g key={request.id}><circle cx={x(request.cylinder) * 10} cy="55" r={active ? 7 : 5} fill={active ? '#ffffff' : done ? '#34d399' : '#2dd4bf'} opacity={active ? 1 : done ? .95 : .8} filter={active ? 'url(#glow)' : undefined} /><circle cx={x(request.cylinder) * 10} cy="55" r="9" fill="none" stroke={done ? '#34d399' : '#2dd4bf'} strokeOpacity=".25" /></g>})}<g className="head-marker" transform={`translate(${x(currentPosition) * 10}, 0)`}><circle cx="0" cy="55" r="13" fill="#8b5cf6" fillOpacity=".18" /><circle cx="0" cy="55" r="7" fill="#a78bfa" stroke="#f5f3ff" strokeWidth="2" filter="url(#glow)" /><path d="M 0 35 L -5 43 L 5 43 Z" fill="#a78bfa" /></g></svg><div className="track-ticks">{[0, .25, .5, .75, 1].map((tick) => <span key={tick} style={{ left: `${tick * 100}%` }}>{Math.round(config.min + range * tick)}</span>)}</div></div>
}

function explainEvent(algorithm: AlgorithmKey, config: DiskConfig, result: ReturnType<typeof schedule>, step: number) {
  if (!result.movements.length) return 'The queue is empty. Add requests to see the scheduling engine make decisions.'
  if (step === 0) return `${algorithmMeta[algorithm].description} Starting at cylinder ${config.head}, the first move follows the selected ${config.direction === 'up' ? 'higher-cylinder' : 'lower-cylinder'} direction where relevant.`
  const movement = result.movements[step - 1]
  if (movement.type === 'wrap') return `${algorithm} explicitly wraps from cylinder ${movement.from} to cylinder ${movement.to}. This jump keeps the scheduler moving in one direction while resetting to the opposite side.`
  if (movement.type === 'boundary') return `${algorithm} traverses to the physical boundary at cylinder ${movement.to}. The boundary is part of the algorithm's route even though it is not a request.`
  if (algorithm === 'SSTF') return `At cylinder ${movement.from}, SSTF selected request ${movement.to} because it is the closest pending request. This is a ${movement.distance}-cylinder seek.`
  if (algorithm === 'FCFS') return `FCFS follows arrival order, so the next queued request is cylinder ${movement.to}, regardless of distance from ${movement.from}.`
  if (algorithm === 'LOOK') return `LOOK services cylinder ${movement.to} while sweeping, then reverses at the final pending request instead of visiting a physical boundary.`
  if (algorithm === 'C-LOOK') return `C-LOOK services requests in one direction and jumps only between request endpoints, avoiding unnecessary travel to cylinder ${movement.to === config.min || movement.to === config.max ? 'a boundary' : 'the disk boundary'}.`
  return `${algorithm} is sweeping ${movement.direction === 'up' ? 'toward higher' : 'toward lower'} cylinders. It services the request at ${movement.to}, then continues according to the elevator route.`
}

function Concept({ title, value, text }: { title: string; value: string; text: string }) { return <motion.div className="concept" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ type: 'spring', stiffness: 120 }} whileHover={{ x: 5 }}><motion.div className="concept-icon" whileHover={{ rotate: 12, scale: 1.12 }}><Info size={15} /></motion.div><div><span>{title}</span><strong>{value}</strong><p>{text}</p></div></motion.div> }

export default DiskSchedulerStudio


