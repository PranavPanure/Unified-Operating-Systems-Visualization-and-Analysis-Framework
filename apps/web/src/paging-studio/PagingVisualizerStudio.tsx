import { useEffect, useMemo, useState } from 'react'
import './styles.css'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  Activity, AlertTriangle, ArrowDown, ArrowLeft, ArrowRight, BookOpen, Check, ChevronDown, CircleHelp, Clock3, Code2,
  Cpu, Database, GitBranch, Layers3, Moon, Network, Pause, Play, RotateCcw, Search, Settings2, Sparkles,
  Sun, Table2, Zap,
} from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { algorithmDetails, parseReferences, simulatePaging, translateAddress } from './simulation'
import type { Algorithm, SimulationResult, StepSnapshot } from './types'

const SAMPLE = '7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2'
const ALGORITHMS: Algorithm[] = ['FIFO', 'LRU', 'Optimal', 'LFU', 'MFU', 'Second Chance']
const pageColors = ['#5c6cff', '#19b7a3', '#e98b53', '#d56eff', '#f0b44f', '#3ba6ff', '#ff668f', '#79d47c', '#8f94ff', '#f2d05a', '#67d6e8', '#d88fff']

function formatPercent(value: number) { return `${value.toFixed(1)}%` }
function hexColor(page: number | null) { return page === null ? '#24324a' : pageColors[Math.abs(page) % pageColors.length] }

function App() {
  const [dark] = useState(true)
  const [algorithm, setAlgorithm] = useState<Algorithm>('FIFO')
  const [referencesInput, setReferencesInput] = useState(SAMPLE)
  const [virtualPages, setVirtualPages] = useState(8)
  const [pageSize, setPageSize] = useState(1024)
  const [frameCount, setFrameCount] = useState(3)
  const [currentStep, setCurrentStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [address, setAddress] = useState('2560')
  const [advancedOpen, setAdvancedOpen] = useState<string | null>('tlb')
  const reduceMotion = useReducedMotion()
  const motionTransition = reduceMotion ? { duration: 0 } : { type: 'spring' as const, stiffness: 260, damping: 22 }

  const parsed = useMemo(() => parseReferences(referencesInput, virtualPages), [referencesInput, virtualPages])
  const pageSizeError = !Number.isInteger(pageSize) || pageSize < 2 || (pageSize & (pageSize - 1)) !== 0 ? 'Page size must be a power of two.' : null
  const references = parsed.references
  const simulation = useMemo(() => simulatePaging(references, frameCount, algorithm), [references, frameCount, algorithm])
  const snapshot = simulation.snapshots[Math.min(currentStep - 1, simulation.snapshots.length - 1)] ?? null
  const displayedFrames = snapshot?.frames ?? Array(frameCount).fill(null)
  const pageTable = snapshot?.pageTable ?? {}
  const currentReference = currentStep > 0 ? references[currentStep - 1] : null
  const metrics = { total: references.length, hits: snapshot?.pageHits ?? 0, faults: snapshot?.pageFaults ?? 0, replacements: snapshot?.replacements ?? 0 }
  const translator = translateAddress(Number(address), pageSize, virtualPages, pageTable)
  const missingTranslationPage = translator.valid && translator.frame === null ? translator.page : null
  const comparison = useMemo(() => ALGORITHMS.map((name) => {
    const result = simulatePaging(references, frameCount, name)
    return { algorithm: name, hits: result.pageHits, faults: result.pageFaults, rate: references.length ? (result.pageFaults / references.length) * 100 : 0, replacements: result.replacements }
  }), [references, frameCount])

  useEffect(() => {
    if (!playing) return
    if (currentStep >= references.length) { setPlaying(false); return }
    const timer = window.setTimeout(() => setCurrentStep((step) => Math.min(step + 1, references.length)), 900 / speed)
    return () => window.clearTimeout(timer)
  }, [playing, currentStep, references.length, speed])

  const reset = () => { setCurrentStep(0); setPlaying(false) }
  const updateRefs = (value: string) => { setReferencesInput(value); setCurrentStep(0); setPlaying(false) }
  const randomize = () => {
    const values = Array.from({ length: 14 }, () => Math.floor(Math.random() * virtualPages))
    updateRefs(values.join(', '))
  }

  return <div className={dark ? 'paging-studio-route app dark' : 'paging-studio-route app'}>
    <header className="topbar">
      <div className="brand-wrap">
        <div className="brand-mark"><Layers3 size={20} /></div>
        <div><div className="brand-name">Virtual Memory Studio</div><div className="brand-subtitle">OS A2Z · paging and memory lab</div></div>
      </div>
      <div className="top-actions">
        <a className="ghost-button" href="/dashboard" title="Back to the OS A2Z workspace"><ArrowLeft size={16} /> Workspace</a>
        <button className="reset-button" onClick={reset}><RotateCcw size={15} /> Reset simulation</button>
      </div>
    </header>

    <main className="shell">
      <aside className="sidebar">
        <div className="section-label"><Settings2 size={14} /> Simulation setup</div>
        <div className="setup-block">
          <div className="label-row"><label htmlFor="algorithm">Replacement algorithm</label><span className="info-chip">6 available</span></div>
          <select id="algorithm" value={algorithm} onChange={(event) => { setAlgorithm(event.target.value as Algorithm); reset() }}><option>FIFO</option><option>LRU</option><option>Optimal</option><option>LFU</option><option>MFU</option><option>Second Chance</option></select>
          <div className="algorithm-note"><Sparkles size={14} /><span>{algorithmDetails[algorithm].description}</span></div>
        </div>

        <div className="setup-block">
          <div className="label-row"><label htmlFor="references">Page reference string</label><span className="info-chip">{references.length}/100</span></div>
          <textarea id="references" value={referencesInput} onChange={(event) => updateRefs(event.target.value)} rows={4} spellCheck={false} />
          <div className="mini-actions"><button onClick={() => updateRefs(SAMPLE)}>Load sample</button><button onClick={randomize}>Randomize</button><button onClick={() => updateRefs('')}>Clear</button></div>
          {parsed.error && <div className="validation"><AlertTriangle size={14} /> {parsed.error}</div>}
        </div>

        <div className="setup-block">
          <div className="label-row"><label>Memory configuration</label><span className="info-chip">Live</span></div>
          <div className="field-grid">
            <label>Virtual pages<input type="number" min="2" max="16" value={virtualPages} onChange={(e) => { setVirtualPages(Number(e.target.value)); reset() }} /></label>
            <label>Page size<input type="number" min="2" step="2" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} /></label>
            <label>Physical frames<input type="number" min="1" max="8" value={frameCount} onChange={(e) => { setFrameCount(Math.max(1, Math.min(8, Number(e.target.value)))); reset() }} /></label>
            <label>Address width<input value={`${Math.ceil(Math.log2(Math.max(2, virtualPages * pageSize)))} bits`} readOnly /></label>
          </div>
          <div className="config-summary"><span>Virtual space</span><strong>{(virtualPages * pageSize / 1024).toFixed(0)} KB</strong><span>Physical RAM</span><strong>{(frameCount * pageSize / 1024).toFixed(0)} KB</strong></div>
          {pageSizeError && <div className="validation"><AlertTriangle size={14} /> {pageSizeError}</div>}
        </div>

        <div className="sidebar-tip"><CircleHelp size={16} /><div><strong>Tip</strong><p>Step through a fault to see the exact frame and page-table mutation.</p></div></div>
      </aside>

      <section className="content">
        <section className="hero-row">
          <div><div className="eyebrow"><span className="status-dot" /> LIVE SIMULATION</div><h1>Paging, made visible.</h1><p>Follow every page reference from virtual address to physical frame.</p></div>
          <div className="hero-status"><div className="hero-status-label">ACTIVE POLICY</div><div className="hero-status-value">{algorithm}</div><div className="hero-status-caption">{algorithmDetails[algorithm].complexity}</div></div>
        </section>

        <section className="card progress-card">
          <div className="progress-top"><div><span className="muted">REFERENCE PROGRESS</span><strong>{currentStep} <small>/ {references.length || 0}</small></strong></div><div className={snapshot?.fault ? 'event-badge fault' : 'event-badge hit'}>{snapshot ? snapshot.fault ? 'PAGE FAULT' : 'PAGE HIT' : 'READY TO RUN'}</div></div>
          <div className="progress-track"><motion.div className="progress-fill" animate={{ width: `${references.length ? (currentStep / references.length) * 100 : 0}%` }} /></div>
          <div className="reference-strip">{references.slice(0, 24).map((page, index) => <motion.button layout key={`${page}-${index}`} className={`ref-pill ${index === currentStep - 1 ? 'active' : ''} ${index < currentStep ? (simulation.snapshots[index]?.fault ? 'faulted' : 'visited') : ''}`} style={{ '--pill-color': hexColor(page) } as React.CSSProperties} onClick={() => setCurrentStep(index + 1)} whileHover={reduceMotion ? undefined : { y: -4, scale: 1.12 }} whileTap={reduceMotion ? undefined : { scale: .9 }} transition={motionTransition}>{page}</motion.button>)}</div>
        </section>

        <section className="card architecture-card">
          <div className="card-heading"><div><div className="section-label"><Network size={14} /> Memory architecture</div><h2>Virtual → Physical mapping</h2></div><div className="legend"><span><i className="legend-dot virtual" /> Virtual page</span><span><i className="legend-dot loaded" /> Resident</span><span><i className="legend-dot empty" /> Free frame</span></div></div>
          <div className="architecture-grid">
            <div className="memory-column"><div className="memory-title"><div><span className="kicker">SOURCE</span><h3>Virtual memory</h3></div><span className="space-label">{virtualPages} pages</span></div><div className="virtual-grid">{Array.from({ length: virtualPages }, (_, page) => { const loaded = pageTable[page] !== undefined; const current = currentReference === page; return <motion.div layout key={page} animate={{ scale: current ? 1.04 : 1, opacity: current || loaded ? 1 : .5 }} whileHover={reduceMotion ? undefined : { y: -5, scale: 1.05 }} transition={motionTransition} className={`page-tile ${current ? 'current' : ''} ${loaded ? 'loaded' : ''}`} style={{ '--page-color': hexColor(page) } as React.CSSProperties}><span className="tile-index">P{page}</span><span className="tile-state">{current ? 'accessed' : loaded ? `F${pageTable[page]}` : 'not resident'}</span><div className="tile-bar" /></motion.div> })}</div></div>
            <div className="flow-connector"><div className="connector-line" /><ArrowRight size={18} /><div className="connector-line" /></div>
            <div className="memory-column physical"><div className="memory-title"><div><span className="kicker">DESTINATION</span><h3>Physical memory</h3></div><span className="space-label">{frameCount} frames</span></div><div className="frame-stack">{displayedFrames.map((page, frame) => <motion.div layout key={frame} className={`frame-row ${currentReference === page ? 'current' : ''} ${page === null ? 'free' : ''}`} animate={{ backgroundColor: currentReference === page ? 'rgba(25,183,163,.16)' : 'rgba(255,255,255,.025)', x: currentReference === page && !reduceMotion ? [0, 5, -3, 0] : 0 }} transition={motionTransition} whileHover={reduceMotion ? undefined : { x: 4 }}><div className="frame-id">F{frame}</div><div className="frame-main">{page === null ? <><Database size={15} /><span>Free frame</span></> : <><div className="mini-page" style={{ background: hexColor(page) }}>P{page}</div><span>Page {page}</span></>}</div><div className="frame-bit">{snapshot?.referenceBits[frame] ? 'R 1' : 'R 0'}</div></motion.div>)}</div></div>
          </div>
        </section>

        <div className="two-col">
          <section className="card table-card"><div className="card-heading compact"><div><div className="section-label"><Table2 size={14} /> State inspector</div><h2>Page table</h2></div><span className="live-label"><span className="status-dot" /> Updating</span></div><div className="table-wrap"><table><thead><tr><th>Page</th><th>Frame</th><th>Valid</th><th>Ref</th><th>Dirty</th></tr></thead><tbody>{Array.from({ length: virtualPages }, (_, page) => { const frame = pageTable[page]; const active = currentReference === page; return <tr key={page} className={active ? 'active-row' : ''}><td><span className="table-page" style={{ background: hexColor(page) }}>P{page}</span></td><td>{frame === undefined ? '—' : `F${frame}`}</td><td><span className={`valid-pill ${frame !== undefined ? 'yes' : ''}`}>{frame !== undefined ? '1' : '0'}</span></td><td>{frame === undefined ? '—' : snapshot?.referenceBits[frame] ?? 0}</td><td>{frame === undefined ? '—' : snapshot?.dirtyBits[frame] ? '1' : '0'}</td></tr> })}</tbody></table></div></section>
          <section className="card event-card"><div className="card-heading compact"><div><div className="section-label"><Activity size={14} /> Execution log</div><h2>What just happened?</h2></div><span className="event-step">STEP {currentStep || '—'}</span></div><AnimatePresence mode="wait"><motion.div key={`${currentStep}-${algorithm}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="event-panel">{snapshot ? <><div className={`big-event ${snapshot.fault ? 'fault' : 'hit'}`}><span>{snapshot.fault ? '!' : <Check size={20} />}</span><div><strong>{snapshot.fault ? `Page ${snapshot.reference} faulted` : `Page ${snapshot.reference} hit`}</strong><small>{snapshot.fault ? 'Demand load / replacement' : `Resolved in frame ${pageTable[snapshot.reference]}`}</small></div></div><p>{snapshot.explanation}</p><div className="event-map"><span>Page {snapshot.reference}</span><ArrowRight size={15} /><span className="map-frame">Frame {pageTable[snapshot.reference] ?? '—'}</span></div></> : <div className="empty-state"><Play size={19} /><p>Press play or step forward to start the simulation.</p></div>}</motion.div></AnimatePresence></section>
        </div>

        <section className="card playback-card"><div className="playback-controls"><button className="play-button" onClick={() => { if (!references.length || parsed.error || pageSizeError) return; if (currentStep >= references.length) setCurrentStep(0); setPlaying(!playing) }}>{playing ? <Pause size={17} /> : <Play size={17} />} {playing ? 'Pause' : 'Play'}</button><button className="control-button" onClick={() => setCurrentStep((step) => Math.max(0, step - 1))} disabled={currentStep === 0}>Back</button><button className="control-button" onClick={() => setCurrentStep((step) => Math.min(references.length, step + 1))} disabled={currentStep >= references.length}>Next</button><span className="control-divider" /><label className="speed-control">Speed<select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}><option value="0.25">0.25×</option><option value="0.5">0.5×</option><option value="1">1×</option><option value="2">2×</option><option value="4">4×</option></select></label><button className="control-button reset-small" onClick={reset}><RotateCcw size={14} /> Restart</button></div><input aria-label="Simulation progress" className="timeline" type="range" min="0" max={references.length} value={currentStep} onChange={(e) => { setCurrentStep(Number(e.target.value)); setPlaying(false) }} /></section>

        <section className="metric-grid"><Metric label="Page faults" value={metrics.faults} accent="orange" detail={references.length ? `${formatPercent(metrics.faults / references.length * 100)} fault rate` : '—'} icon={<AlertTriangle size={16} />} /><Metric label="Page hits" value={metrics.hits} accent="teal" detail={references.length ? `${formatPercent(metrics.hits / references.length * 100)} hit rate` : '—'} icon={<Zap size={16} />} /><Metric label="Replacements" value={metrics.replacements} accent="purple" detail={`${frameCount} physical frames`} icon={<RotateCcw size={16} />} /><Metric label="Free frames" value={displayedFrames.filter((frame) => frame === null).length} accent="blue" detail="Demand paging" icon={<Database size={16} />} /></section>

        <div className="chart-grid"><section className="card chart-card"><div className="card-heading compact"><div><div className="section-label"><Activity size={14} /> Timeline analytics</div><h2>Faults over time</h2></div><span className="chart-caption">Cumulative</span></div><div className="chart"><ResponsiveContainer width="100%" height={205}><LineChart data={simulation.faultsByStep}><CartesianGrid strokeDasharray="3 3" stroke="rgba(145,160,190,.14)" vertical={false} /><XAxis dataKey="step" stroke="#8391aa" tickLine={false} axisLine={false} /><YAxis allowDecimals={false} stroke="#8391aa" tickLine={false} axisLine={false} width={24} /><Tooltip contentStyle={{ background: '#101a2a', border: '1px solid #2b3a56', borderRadius: 10 }} /><Line type="monotone" dataKey="faults" stroke="#e98b53" strokeWidth={2.5} dot={{ r: 3, fill: '#e98b53' }} name="Faults" /><Line type="monotone" dataKey="hits" stroke="#19b7a3" strokeWidth={2.5} dot={{ r: 3, fill: '#19b7a3' }} name="Hits" /></LineChart></ResponsiveContainer></div></section><section className="card chart-card"><div className="card-heading compact"><div><div className="section-label"><Cpu size={14} /> Working set</div><h2>Access frequency</h2></div><span className="chart-caption">Current run</span></div><div className="chart"><ResponsiveContainer width="100%" height={205}><BarChart data={simulation.frequencies}><CartesianGrid strokeDasharray="3 3" stroke="rgba(145,160,190,.14)" vertical={false} /><XAxis dataKey="page" stroke="#8391aa" tickLine={false} axisLine={false} /><YAxis allowDecimals={false} stroke="#8391aa" tickLine={false} axisLine={false} width={24} /><Tooltip contentStyle={{ background: '#101a2a', border: '1px solid #2b3a56', borderRadius: 10 }} /><Bar dataKey="accesses" name="Accesses" radius={[5, 5, 0, 0]}>{simulation.frequencies.map((entry) => <Cell key={entry.page} fill={hexColor(Number(entry.page.slice(1)))} />)}</Bar></BarChart></ResponsiveContainer></div></section></div>

        <section className="card translation-card"><div className="card-heading"><div><div className="section-label"><ArrowRight size={14} /> Address translation</div><h2>Logical → physical address</h2><p>See exactly how the page table resolves an address.</p></div><div className="address-input"><label htmlFor="address"><Search size={14} /> Logical address</label><input id="address" value={address} onChange={(e) => setAddress(e.target.value)} /></div></div><div className="translation-flow"><TranslationNode label="Logical address" value={translator.valid ? `${translator.address}` : '—'} /><ArrowDown className="mobile-arrow" size={18} /><ArrowRight className="desktop-arrow" size={18} /><TranslationNode label="Page + offset" value={translator.valid ? `P${translator.page}  ·  ${translator.offset}` : 'Invalid'} accent="purple" /><ArrowRight className="desktop-arrow" size={18} /><TranslationNode label="Page table lookup" value={translator.valid ? translator.frame === null ? 'Not resident' : `Frame ${translator.frame}` : '—'} accent={translator.valid && translator.frame !== null ? 'teal' : 'orange'} /><ArrowRight className="desktop-arrow" size={18} /><TranslationNode label="Physical address" value={translator.valid && translator.physical !== null ? `${translator.physical}` : 'Awaiting page'} accent={translator.valid && translator.physical !== null ? 'teal' : 'orange'} /></div>{!translator.valid && <div className="validation"><AlertTriangle size={14} /> {translator.error}</div>}{missingTranslationPage !== null && <div className="translation-callout"><AlertTriangle size={15} /><span>Page {missingTranslationPage} is not resident. Load it with <button onClick={() => { const i = references.indexOf(missingTranslationPage); if (i >= 0) setCurrentStep(i + 1) }}>the next matching reference</button> to complete translation.</span></div>}<div className="binary-row"><span>Binary</span><code>{translator.valid ? translator.address.toString(2).padStart(Math.ceil(Math.log2(virtualPages * pageSize)), '0') : '—'}</code><span>Page size</span><code>{pageSize.toLocaleString()} bytes</code></div></section>

        <section className="card comparison-card"><div className="card-heading"><div><div className="section-label"><BarChartIcon /> Benchmark lab</div><h2>Algorithm comparison</h2><p>Same reference string, same {frameCount} frames. Different decisions.</p></div><div className="best-badge"><Sparkles size={14} /> Best: {comparison.reduce((best, row) => row.faults < best.faults ? row : best, comparison[0] ?? { algorithm: '—', faults: 0 }).algorithm}</div></div><div className="comparison-layout"><div className="comparison-table-wrap"><table className="comparison-table"><thead><tr><th>Algorithm</th><th>Hits</th><th>Faults</th><th>Fault rate</th><th>Replacements</th></tr></thead><tbody>{comparison.map((row) => <tr key={row.algorithm} className={row.algorithm === algorithm ? 'selected-row' : ''}><td><button onClick={() => { setAlgorithm(row.algorithm); reset() }}>{row.algorithm}{row.algorithm === algorithm && <span className="you-badge">Active</span>}</button></td><td>{row.hits}</td><td className="fault-number">{row.faults}</td><td>{formatPercent(row.rate)}</td><td>{row.replacements}</td></tr>)}</tbody></table></div><div className="comparison-chart"><ResponsiveContainer width="100%" height={185}><BarChart data={comparison} layout="vertical" margin={{ left: 4, right: 18 }}><XAxis type="number" hide /><YAxis type="category" dataKey="algorithm" width={92} tick={{ fill: '#8391aa', fontSize: 11 }} tickLine={false} axisLine={false} /><Tooltip contentStyle={{ background: '#101a2a', border: '1px solid #2b3a56', borderRadius: 10 }} /><Bar dataKey="faults" name="Faults" radius={[0, 5, 5, 0]} fill="#e98b53" /></BarChart></ResponsiveContainer></div></div></section>

        <section className="learning-grid"><section className="card explanation-card"><div className="section-label"><BookOpen size={14} /> Learn the policy</div><h2>{algorithm}</h2><p>{algorithmDetails[algorithm].description}</p><div className="learn-facts"><div><span>Why use it</span><strong>{algorithmDetails[algorithm].best}</strong></div><div><span>Trade-off</span><strong>{algorithmDetails[algorithm].tradeoff}</strong></div><div><span>Stack algorithm</span><strong>{algorithmDetails[algorithm].stack}</strong></div></div></section><section className="card advanced-card"><div className="section-label"><Code2 size={14} /> Advanced concepts</div><h2>Explore further</h2>{[['tlb', 'TLB simulation', 'Fast path for recent page-table lookups'], ['thrashing', 'Thrashing demo', 'Working set larger than physical memory'], ['belady', 'Belady’s anomaly', 'Why FIFO can fault more with more frames']].map(([key, title, desc]) => <div key={key} className="concept-row"><button onClick={() => setAdvancedOpen(advancedOpen === key ? null : key)}><span className="concept-icon">{key === 'tlb' ? <Search size={15} /> : key === 'thrashing' ? <Activity size={15} /> : <Clock3 size={15} />}</span><span><strong>{title}</strong><small>{desc}</small></span><ChevronDown size={16} className={advancedOpen === key ? 'rotated' : ''} /></button>{advancedOpen === key && <div className="concept-detail">{key === 'tlb' ? 'A TLB caches page → frame pairs. A hit bypasses the page table; a miss falls through to the lookup shown above.' : key === 'thrashing' ? 'When the working set exceeds available frames, the simulator’s fault rate rises because pages are evicted before they can be reused.' : 'FIFO is not stack-based: adding a frame can change its eviction order and, on some strings, increase page faults.'}</div>}</div>)}</section></section>
      </section>
    </main>
  </div>
}

function Metric({ label, value, detail, icon, accent }: { label: string; value: number; detail: string; icon: React.ReactNode; accent: string }) { return <motion.div layout className={`metric metric-${accent}`} whileHover={{ y: -4, scale: 1.015 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}><motion.div className="metric-icon" animate={{ rotate: value ? [0, -8, 8, 0] : 0, scale: value ? [1, 1.12, 1] : 1 }} transition={{ duration: .55 }}>{icon}</motion.div><div><span>{label}</span><motion.strong key={value} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>{value}</motion.strong><small>{detail}</small></div></motion.div> }
function TranslationNode({ label, value, accent = 'blue' }: { label: string; value: string; accent?: string }) { return <motion.div layout className={`translation-node node-${accent}`} whileHover={{ y: -5, scale: 1.02 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}><span>{label}</span><motion.strong key={value} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>{value}</motion.strong></motion.div> }
function BarChartIcon() { return <Activity size={14} /> }

export default App


