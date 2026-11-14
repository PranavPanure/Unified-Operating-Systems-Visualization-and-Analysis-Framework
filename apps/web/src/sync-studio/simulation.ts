export type Mechanism = 'none' | 'mutex' | 'binary' | 'counting' | 'spinlock' | 'monitor' | 'condition' | 'rwlock'
export type ProcessState = 'READY' | 'RUNNING' | 'CRITICAL' | 'BLOCKED' | 'DONE'
export type EventKind = 'run' | 'request' | 'acquire' | 'release' | 'block' | 'wake' | 'read' | 'write' | 'increment' | 'deadlock'

export type Process = {
  id: string
  name: string
  color: string
  state: ProcessState
  progress: number
  criticalAccesses: number
  completedAccesses: number
  blockedTicks: number
}

export type SimEvent = {
  id: number
  tick: number
  actor: string
  kind: EventKind
  message: string
  tone?: 'green' | 'amber' | 'red' | 'blue'
}

export type SimState = {
  tick: number
  running: boolean
  mechanism: Mechanism
  processes: Process[]
  owner: string | null
  waiting: string[]
  availablePermits: number
  maxPermits: number
  sharedValue: number
  lastValue: number
  lastWriter: string | null
  events: SimEvent[]
  cpuCycles: number
  contentions: number
  completed: number
}

export const colors = ['#61e7c7', '#ffb86b', '#a78bfa', '#60a5fa', '#f472b6', '#facc15', '#fb7185', '#34d399']

export const mechanismMeta: Record<Mechanism, { label: string; short: string; detail: string; behavior: string; color: string }> = {
  none: { label: 'No synchronization', short: 'UNSAFE', detail: 'Interleaving is unrestricted', behavior: 'Both processes may read the same value before either writes it, exposing a lost update.', color: '#fb7185' },
  mutex: { label: 'Mutex lock', short: 'MUTEX', detail: 'One owner · blocking wait', behavior: 'Exactly one process owns the lock. Contenders sleep in a FIFO queue until release.', color: '#61e7c7' },
  binary: { label: 'Binary semaphore', short: 'BINARY', detail: 'Permit: 0 / 1', behavior: 'wait() consumes the single permit; signal() returns it and wakes one waiter.', color: '#60a5fa' },
  counting: { label: 'Counting semaphore', short: 'COUNTING', detail: 'Multiple permits', behavior: 'A finite permit pool limits concurrent entries while keeping blocked waiters explicit.', color: '#a78bfa' },
  spinlock: { label: 'Spinlock', short: 'SPIN', detail: 'Busy-wait acquisition', behavior: 'Contenders repeatedly retry instead of sleeping, increasing CPU cycles under contention.', color: '#ffb86b' },
  monitor: { label: 'Monitor', short: 'MONITOR', detail: 'Implicit mutual exclusion', behavior: 'Entry is serialized by the monitor; condition queues coordinate when state changes.', color: '#f472b6' },
  condition: { label: 'Condition variable', short: 'COND', detail: 'Wait / signal with mutex', behavior: 'A waiter atomically releases the mutex and sleeps until another process signals the condition.', color: '#facc15' },
  rwlock: { label: 'Read-write lock', short: 'RW LOCK', detail: 'Readers share · writer exclusive', behavior: 'Readers can overlap, but a writer waits for all readers and blocks new readers while queued.', color: '#34d399' },
}

export const baseProcesses: Process[] = [
  { id: 'P1', name: 'Indexer', color: colors[0], state: 'READY', progress: 0, criticalAccesses: 2, completedAccesses: 0, blockedTicks: 0 },
  { id: 'P2', name: 'Telemetry', color: colors[1], state: 'READY', progress: 0, criticalAccesses: 2, completedAccesses: 0, blockedTicks: 0 },
  { id: 'P3', name: 'Worker', color: colors[2], state: 'READY', progress: 0, criticalAccesses: 1, completedAccesses: 0, blockedTicks: 0 },
  { id: 'P4', name: 'Logger', color: colors[3], state: 'READY', progress: 0, criticalAccesses: 1, completedAccesses: 0, blockedTicks: 0 },
]

export const initialSim = (mechanism: Mechanism = 'mutex'): SimState => ({
  tick: 0, running: false, mechanism, processes: structuredClone(baseProcesses), owner: null, waiting: [], availablePermits: mechanism === 'counting' ? 2 : 1,
  maxPermits: mechanism === 'counting' ? 2 : 1, sharedValue: 0, lastValue: 0, lastWriter: null, events: [], cpuCycles: 0, contentions: 0, completed: 0,
})

const eventText = (state: SimState, actor: string, kind: EventKind, message: string, tone?: SimEvent['tone']): SimEvent => ({ id: state.events.length + 1, tick: state.tick, actor, kind, message, tone })

export function stepSimulation(input: SimState): SimState {
  const state: SimState = structuredClone(input)
  state.tick += 1
  const active = state.processes.find(p => p.state === 'CRITICAL')
  const running = state.processes.find(p => p.state === 'RUNNING')
  const candidate = state.processes.find(p => (p.state === 'READY' || p.state === 'RUNNING') && p.progress < 100 && !state.waiting.includes(p.id))

  if (active) {
    active.progress = Math.min(100, active.progress + 25)
    active.state = active.progress >= 100 ? 'DONE' : 'CRITICAL'
    if (active.progress >= 100) {
      active.completedAccesses += 1
      state.sharedValue += 1
      state.lastValue = state.sharedValue - 1
      state.lastWriter = active.id
      state.owner = null
      if (state.mechanism === 'counting') state.availablePermits = Math.min(state.maxPermits, state.availablePermits + 1)
      state.events.unshift(eventText(state, active.id, 'write', `${active.id} wrote ${state.sharedValue} to shared counter and released the ${mechanismMeta[state.mechanism].short.toLowerCase()}.`, 'green'))
      const next = state.waiting.shift()
      if (next) {
        const wake = state.processes.find(p => p.id === next)
        if (wake) wake.state = 'READY'
        state.events.unshift(eventText(state, next, 'wake', `${next} was removed from the waiting queue and is READY.`, 'blue'))
      }
    }
  } else if (running) {
    running.state = 'RUNNING'
    if (running.progress < 25) {
      running.progress += 10
      state.events.unshift(eventText(state, running.id, 'read', `${running.id} read shared counter = ${state.sharedValue}.`, 'blue'))
    } else {
      const protectedMode = state.mechanism !== 'none'
      const permitsAvailable = state.mechanism === 'counting' ? state.availablePermits > 0 : state.owner === null
      if (protectedMode && !permitsAvailable) {
        running.state = state.mechanism === 'spinlock' ? 'RUNNING' : 'BLOCKED'
        if (state.mechanism === 'spinlock') state.cpuCycles += 1
        if (!state.waiting.includes(running.id)) state.waiting.push(running.id)
        state.contentions += 1
        state.events.unshift(eventText(state, running.id, 'block', state.mechanism === 'spinlock' ? `${running.id} is spinning; lock is owned by ${state.owner ?? 'another worker'}.` : `${running.id} attempted entry while ${state.owner ?? 'all permits'} was unavailable and became BLOCKED.`, 'amber'))
      } else {
        running.state = 'CRITICAL'
        state.owner = state.mechanism === 'counting' ? (state.owner ?? running.id) : running.id
        if (state.mechanism === 'counting') state.availablePermits -= 1
        state.events.unshift(eventText(state, running.id, 'acquire', `${running.id} acquired the ${mechanismMeta[state.mechanism].short.toLowerCase()} and entered the critical section.`, 'green'))
      }
    }
  } else if (candidate) {
    candidate.state = 'RUNNING'
    state.events.unshift(eventText(state, candidate.id, 'run', `${candidate.id} dispatched from READY queue.`, 'blue'))
  }

  state.processes.forEach(p => { if (p.state === 'BLOCKED') p.blockedTicks += 1 })
  state.completed = state.processes.filter(p => p.state === 'DONE').length
  if (state.completed === state.processes.length) state.running = false
  return state
}

export function setMechanism(state: SimState, mechanism: Mechanism): SimState {
  return { ...initialSim(mechanism), processes: structuredClone(state.processes.map(p => ({ ...p, state: 'READY' as ProcessState, progress: 0, completedAccesses: 0, blockedTicks: 0 }))) }
}

export function replayTo(state: SimState, tick: number): SimState {
  let next = initialSim(state.mechanism)
  next.running = false
  for (let i = 0; i < tick; i++) next = stepSimulation(next)
  return next
}

export type RaceStep = { id: string; label: string; op: 'read' | 'increment' | 'write'; value: number; process: string }
export const raceSteps: RaceStep[] = [
  { id: 'p1r', label: 'P1 reads counter', op: 'read', value: 0, process: 'P1' },
  { id: 'p2r', label: 'P2 reads counter', op: 'read', value: 0, process: 'P2' },
  { id: 'p1i', label: 'P1 increments local copy', op: 'increment', value: 1, process: 'P1' },
  { id: 'p2i', label: 'P2 increments local copy', op: 'increment', value: 1, process: 'P2' },
  { id: 'p1w', label: 'P1 writes counter', op: 'write', value: 1, process: 'P1' },
  { id: 'p2w', label: 'P2 writes counter', op: 'write', value: 1, process: 'P2' },
]

export type ProducerConsumer = { buffer: number[]; capacity: number; produced: number; consumed: number; producerWaiting: boolean; consumerWaiting: boolean; log: string[] }
export const initialBuffer = (capacity = 5): ProducerConsumer => ({ buffer: [], capacity, produced: 0, consumed: 0, producerWaiting: false, consumerWaiting: false, log: ['Buffer initialized empty.'] })
export function bufferStep(input: ProducerConsumer, action: 'produce' | 'consume'): ProducerConsumer {
  const s = structuredClone(input)
  if (action === 'produce') {
    if (s.buffer.length >= s.capacity) { s.producerWaiting = true; s.log.unshift('Producer blocked: empty semaphore is 0; buffer is full.'); return s }
    s.producerWaiting = false; s.buffer.push(s.produced + 1); s.produced += 1; s.log.unshift(`Producer inserted item ${s.produced}; full = ${s.buffer.length}.`)
  } else {
    if (s.buffer.length === 0) { s.consumerWaiting = true; s.log.unshift('Consumer blocked: full semaphore is 0; buffer is empty.'); return s }
    const item = s.buffer.shift(); s.consumerWaiting = false; s.consumed += 1; s.log.unshift(`Consumer removed item ${item}; empty = ${s.capacity - s.buffer.length}.`)
  }
  return s
}

export type Philosopher = { id: number; state: 'thinking' | 'hungry' | 'eating' | 'waiting'; left: boolean; right: boolean }
export type DiningState = { philosophers: Philosopher[]; strategy: 'naive' | 'ordered' | 'waiter'; forkOwner: (number | null)[]; deadlocked: boolean; log: string[] }
export const initialDining = (): DiningState => ({ philosophers: Array.from({ length: 5 }, (_, id) => ({ id, state: 'thinking', left: false, right: false })), strategy: 'naive', forkOwner: Array(5).fill(null), deadlocked: false, log: ['Five philosophers are thinking.'] })
export function diningStep(input: DiningState): DiningState {
  const s = structuredClone(input)
  const hungry = s.philosophers.find(p => p.state === 'thinking')
  if (hungry) { hungry.state = 'hungry'; s.log.unshift(`Philosopher ${hungry.id + 1} is hungry and requests forks.`); return s }
  for (const p of s.philosophers) {
    if (p.state === 'hungry') {
      const left = p.id, right = (p.id + 1) % 5
      const order = s.strategy === 'ordered' && left > right ? [right, left] : [left, right]
      if (s.strategy === 'naive' && !p.left) {
        if (s.forkOwner[left] === null) { s.forkOwner[left] = p.id; p.left = true; p.state = 'waiting'; s.log.unshift(`Philosopher ${p.id + 1} picked up fork ${left + 1} and waits for fork ${right + 1}.`); return s }
        p.state = 'waiting'
        continue
      }
      const canAcquire = s.strategy === 'waiter' ? s.forkOwner.filter(x => x !== null).length < 4 : order.every(f => s.forkOwner[f] === null)
      if (canAcquire) { s.forkOwner[order[0]] = p.id; if (s.strategy !== 'waiter' || s.forkOwner[order[1]] === null) s.forkOwner[order[1]] = p.id; p.left = true; p.right = true; p.state = 'eating'; s.log.unshift(`Philosopher ${p.id + 1} acquired forks ${left + 1} and ${right + 1}.`); return s }
      p.state = 'waiting'
    }
  }
  if (s.philosophers.every(p => p.state === 'waiting')) { s.deadlocked = s.strategy === 'naive'; s.log.unshift(s.deadlocked ? 'Deadlock detected: every philosopher holds one fork and waits for the next.' : 'No progress this tick; strategy prevents circular wait.') }
  return s
}

export type DeadlockState = { p1: 'R1' | null; p2: 'R2' | null; wait1: 'R2' | null; wait2: 'R1' | null; resolved: boolean }
export const initialDeadlock: DeadlockState = { p1: 'R1', p2: 'R2', wait1: 'R2', wait2: 'R1', resolved: false }


