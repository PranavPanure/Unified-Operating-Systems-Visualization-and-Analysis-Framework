import type { AlgorithmId, DecisionLog, PriorityDirection, ProcessInput, ProcessMetrics, ScheduleResult, Segment } from '../types'

const EPS = 0.0001

const isPreemptive = (algorithm: AlgorithmId) => ['srtf', 'priority-preemptive', 'lrtf'].includes(algorithm)
const isRoundRobin = (algorithm: AlgorithmId) => algorithm === 'rr'

function addSegment(segments: Segment[], next: Segment) {
  const previous = segments[segments.length - 1]
  if (previous && previous.id === next.id && previous.kind === next.kind && Math.abs(previous.end - next.start) < EPS) {
    previous.end = next.end
  } else if (next.end > next.start) {
    segments.push(next)
  }
}

function pickCandidate(candidates: ProcessInput[], remaining: Map<string, number>, algorithm: AlgorithmId, time: number, priorityDirection: PriorityDirection) {
  const ranked = [...candidates].sort((a, b) => {
    if (algorithm === 'sjf' || algorithm === 'srtf') return (remaining.get(a.id)! - remaining.get(b.id)! || a.arrival - b.arrival || a.id.localeCompare(b.id))
    if (algorithm === 'ljf' || algorithm === 'lrtf') return (remaining.get(b.id)! - remaining.get(a.id)! || a.arrival - b.arrival || a.id.localeCompare(b.id))
    if (algorithm === 'priority' || algorithm === 'priority-preemptive') return ((priorityDirection === 'lower' ? a.priority - b.priority : b.priority - a.priority) || a.arrival - b.arrival || a.id.localeCompare(b.id))
    if (algorithm === 'hrrn') {
      const ratio = (p: ProcessInput) => (time - p.arrival + p.burst) / p.burst
      return ratio(b) - ratio(a) || a.arrival - b.arrival || a.id.localeCompare(b.id)
    }
    return a.arrival - b.arrival || a.id.localeCompare(b.id)
  })
  return ranked[0]
}

export function schedule(processes: ProcessInput[], algorithm: AlgorithmId, quantum = 2, contextSwitch = 0, priorityDirection: PriorityDirection = 'lower'): ScheduleResult {
  const safe = processes.filter((p) => p.burst > 0 && p.arrival >= 0).map((p) => ({ ...p, burst: Math.max(1, p.burst) }))
  if (!safe.length) return { segments: [], metrics: [], decisions: [], totalTime: 0, busyTime: 0, utilization: 0, throughput: 0 }

  const remaining = new Map(safe.map((p) => [p.id, p.burst]))
  const segments: Segment[] = []
  const decisions: DecisionLog[] = []
  const completed = new Set<string>()
  const firstStart = new Map<string, number>()
  const rrQueue: ProcessInput[] = []
  let queued = new Set<string>()
  let time = 0
  let lastProcess: string | undefined

  const addArrivals = (at: number) => {
    safe.filter((p) => p.arrival <= at && !completed.has(p.id) && !queued.has(p.id) && (remaining.get(p.id) ?? 0) > 0)
      .sort((a, b) => a.arrival - b.arrival || a.id.localeCompare(b.id))
      .forEach((p) => { rrQueue.push(p); queued.add(p.id) })
  }

  while (completed.size < safe.length) {
    addArrivals(time)
    const available = safe.filter((p) => p.arrival <= time && !completed.has(p.id) && (remaining.get(p.id) ?? 0) > 0)
    if (!available.length && !rrQueue.length) {
      const next = safe.filter((p) => !completed.has(p.id) && (remaining.get(p.id) ?? 0) > 0 && p.arrival > time).sort((a, b) => a.arrival - b.arrival)[0]
      if (next) {
        addSegment(segments, { id: 'IDLE', start: time, end: next.arrival, kind: 'idle' })
        decisions.push({ time, title: 'CPU is idle', detail: `No process is ready. The next arrival is ${next.id} at time ${next.arrival}.` })
        time = next.arrival
        lastProcess = undefined
        continue
      }
    }

    let current: ProcessInput | undefined
    if (isRoundRobin(algorithm)) {
      current = rrQueue.shift() ?? available[0]
      if (current) queued.delete(current.id)
    } else {
      current = pickCandidate(available, remaining, algorithm, time, priorityDirection)
    }
    if (!current) break

    if (lastProcess && lastProcess !== current.id && contextSwitch > 0) {
      addSegment(segments, { id: 'CS', start: time, end: time + contextSwitch, kind: 'context' })
      decisions.push({ time, title: 'Context switch', detail: `The CPU switches from ${lastProcess} to ${current.id}, costing ${contextSwitch} time unit${contextSwitch === 1 ? '' : 's'}.` })
      time += contextSwitch
      addArrivals(time)
    }

    const before = remaining.get(current.id)!
    const runFor = isRoundRobin(algorithm) ? Math.min(quantum, before) : isPreemptive(algorithm) ? 1 : before
    if (!firstStart.has(current.id)) firstStart.set(current.id, time)
    addSegment(segments, { id: current.id, start: time, end: time + runFor, kind: 'process', color: current.color })
    const availableAtStart = safe.filter((p) => p.arrival <= time && (remaining.get(p.id) ?? 0) > 0 && p.id !== current!.id)
    const reason = algorithm === 'fcfs' ? 'earliest arrival' : algorithm === 'hrrn' ? 'highest response ratio' : algorithm === 'rr' ? `next ready in the circular queue (quantum ${quantum})` : algorithm.includes('priority') ? `highest priority (P${current.priority})` : algorithm.includes('ljf') || algorithm.includes('lrtf') ? 'longest remaining burst' : 'shortest remaining burst'
    decisions.push({ time, title: `${current.id} selected`, detail: `${current.id} runs from ${time} to ${time + runFor} using ${reason}${availableAtStart.length ? `; ${availableAtStart.length} other process${availableAtStart.length === 1 ? '' : 'es'} ready.` : '.'}`, processId: current.id })
    time += runFor
    remaining.set(current.id, before - runFor)
    if ((remaining.get(current.id) ?? 0) <= 0) {
      completed.add(current.id)
      decisions.push({ time, title: `${current.id} completed`, detail: `${current.id} has used its full burst. Its completion time is ${time}.`, processId: current.id })
    } else if (isRoundRobin(algorithm)) {
      addArrivals(time)
      rrQueue.push(current)
      queued.add(current.id)
    }
    lastProcess = current.id
  }

  const withContext = segments

  const processMetrics: ProcessMetrics[] = safe.map((p) => {
    const own = withContext.filter((s) => s.id === p.id)
    const completion = own.length ? Math.max(...own.map((s) => s.end)) : p.arrival
    const start = own.length ? Math.min(...own.map((s) => s.start)) : p.arrival
    const turnaround = completion - p.arrival
    return { ...p, completion, turnaround, waiting: Math.max(0, turnaround - p.burst), response: Math.max(0, start - p.arrival), firstStart: start }
  })
  const totalTime = withContext.length ? Math.max(...withContext.map((s) => s.end)) : 0
  const busyTime = withContext.filter((s) => s.kind === 'process').reduce((sum, s) => sum + s.end - s.start, 0)
  return { segments: withContext, metrics: processMetrics, decisions, totalTime, busyTime, utilization: totalTime ? (busyTime / totalTime) * 100 : 0, throughput: totalTime ? safe.length / totalTime : 0 }
}

export const algorithmInfo: Record<AlgorithmId, { name: string; short: string; behavior: string; description: string; pros: string; cons: string; starvation: string; complexity: string }> = {
  fcfs: { name: 'First Come First Serve', short: 'FCFS', behavior: 'Non-preemptive', description: 'Runs jobs in the exact order they arrive, making it the easiest policy to trace.', pros: 'Simple, predictable, fair by arrival order.', cons: 'Convoy effect can make short jobs wait behind long jobs.', starvation: 'No', complexity: 'O(n log n)' },
  sjf: { name: 'Shortest Job First', short: 'SJF', behavior: 'Non-preemptive', description: 'Chooses the ready process with the smallest burst time whenever the CPU becomes free.', pros: 'Excellent average waiting time when burst estimates are accurate.', cons: 'Needs burst-time knowledge and can delay long jobs.', starvation: 'Possible', complexity: 'O(n²)' },
  srtf: { name: 'Shortest Remaining Time First', short: 'SRTF', behavior: 'Preemptive', description: 'Continuously favors the process with the least work left to do.', pros: 'Very responsive to short jobs; minimizes average waiting in many workloads.', cons: 'More context switches and possible starvation.', starvation: 'Possible', complexity: 'O(n²)' },
  rr: { name: 'Round Robin', short: 'RR', behavior: 'Preemptive', description: 'Cycles through the ready queue, giving every process a fixed time quantum.', pros: 'Responsive and fair for interactive workloads.', cons: 'Quantum choice strongly affects overhead and performance.', starvation: 'No', complexity: 'O(n)' },
  priority: { name: 'Priority Scheduling', short: 'Priority', behavior: 'Non-preemptive', description: 'Runs the ready process with the best priority value; lower numbers mean higher priority.', pros: 'Useful when tasks have clear importance levels.', cons: 'Low-priority work may wait for a long time.', starvation: 'Possible', complexity: 'O(n²)' },
  'priority-preemptive': { name: 'Priority Preemptive', short: 'Priority P', behavior: 'Preemptive', description: 'A newly arrived higher-priority process can interrupt the current process.', pros: 'Fast response for urgent work.', cons: 'Can create frequent switches and starvation.', starvation: 'Possible', complexity: 'O(n²)' },
  ljf: { name: 'Longest Job First', short: 'LJF', behavior: 'Non-preemptive', description: 'Selects the ready process with the largest burst time first.', pros: 'Can reduce fragmentation when long batches are preferred.', cons: 'Short jobs may experience high waiting time.', starvation: 'Possible', complexity: 'O(n²)' },
  lrtf: { name: 'Longest Remaining Time First', short: 'LRTF', behavior: 'Preemptive', description: 'Continuously favors the process with the greatest remaining burst time.', pros: 'Makes long-running work visible and steadily progressing.', cons: 'Poor response for short jobs; high switching overhead.', starvation: 'Possible', complexity: 'O(n²)' },
  hrrn: { name: 'Highest Response Ratio Next', short: 'HRRN', behavior: 'Non-preemptive', description: 'Balances waiting time and burst time using (waiting + burst) / burst.', pros: 'Reduces starvation while still favoring short jobs.', cons: 'Requires recalculating ratios at each scheduling point.', starvation: 'Rare', complexity: 'O(n²)' },
}

export function average(metrics: ProcessMetrics[], key: 'waiting' | 'turnaround' | 'response') {
  return metrics.length ? metrics.reduce((sum, metric) => sum + metric[key], 0) / metrics.length : 0
}


