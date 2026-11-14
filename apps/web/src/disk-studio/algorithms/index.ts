import { AlgorithmKey, Direction, DiskConfig, Movement, RequestItem, ScheduleResult } from '../types'

type Pending = RequestItem & { order: number }

const signDirection = (from: number, to: number): Direction | null =>
  to === from ? null : to > from ? 'up' : 'down'

const move = (from: number, to: number, type: Movement['type'], requestId?: number): Movement => ({
  from, to, distance: Math.abs(to - from), type, requestId, direction: signDirection(from, to),
})

const requestMove = (from: number, item: RequestItem) => move(from, item.cylinder, 'request', item.id)

function finish(algorithm: AlgorithmKey, head: number, requests: RequestItem[], movements: Movement[]): ScheduleResult {
  return { algorithm, initialHead: head, movements, requests, sequence: [head, ...movements.map((movement) => movement.to)] }
}

function fcfs(config: DiskConfig, requests: RequestItem[]) {
  let current = config.head
  const movements = requests.map((item) => {
    const result = requestMove(current, item)
    current = item.cylinder
    return result
  })
  return finish('FCFS', config.head, requests, movements)
}

function sstf(config: DiskConfig, requests: RequestItem[]) {
  let current = config.head
  let pending: Pending[] = requests.map((item, order) => ({ ...item, order }))
  const movements: Movement[] = []
  while (pending.length) {
    pending.sort((a, b) => Math.abs(a.cylinder - current) - Math.abs(b.cylinder - current) || a.order - b.order)
    const next = pending.shift()!
    movements.push(requestMove(current, next))
    current = next.cylinder
  }
  return finish('SSTF', config.head, requests, movements)
}

const splitRequests = (head: number, requests: RequestItem[]) => ({
  same: requests.filter((request) => request.cylinder === head),
  higher: requests.filter((request) => request.cylinder > head).sort((a, b) => a.cylinder - b.cylinder || a.id - b.id),
  lower: requests.filter((request) => request.cylinder < head).sort((a, b) => b.cylinder - a.cylinder || a.id - b.id),
})

function directionalScan(config: DiskConfig, requests: RequestItem[], algorithm: 'SCAN' | 'LOOK' | 'C-SCAN' | 'C-LOOK') {
  let current = config.head
  const { same, higher, lower } = splitRequests(current, requests)
  const movements: Movement[] = []
  same.forEach((item) => { movements.push(requestMove(current, item)) })
  const up = config.direction === 'up'
  const primary = up ? higher : lower
  const secondary = up ? lower : higher
  const secondaryOrdered = up ? lower : higher
  const circularSecondary = up ? [...lower].reverse() : [...higher].reverse()

  const service = (items: RequestItem[]) => items.forEach((item) => {
    movements.push(requestMove(current, item))
    current = item.cylinder
  })

  service(primary)
  if (secondary.length) {
    if (algorithm === 'SCAN' || algorithm === 'C-SCAN') {
      const boundary = up ? config.max : config.min
      if (current !== boundary) { movements.push(move(current, boundary, 'boundary')); current = boundary }
      if (algorithm === 'C-SCAN') {
        const wrapTo = up ? config.min : config.max
        movements.push(move(current, wrapTo, 'wrap'))
        current = wrapTo
        service(circularSecondary)
      } else {
        service(secondaryOrdered)
      }
    } else if (algorithm === 'C-LOOK') {
      const wrapTo = circularSecondary[0].cylinder
      movements.push(move(current, wrapTo, 'wrap'))
      current = wrapTo
      service(circularSecondary)
    } else {
      service(secondaryOrdered)
    }
  }
  return finish(algorithm, config.head, requests, movements)
}

export function schedule(algorithm: AlgorithmKey, config: DiskConfig, requests: RequestItem[]): ScheduleResult {
  if (!requests.length) return finish(algorithm, config.head, requests, [])
  if (algorithm === 'FCFS') return fcfs(config, requests)
  if (algorithm === 'SSTF') return sstf(config, requests)
  return directionalScan(config, requests, algorithm)
}

export const algorithms: AlgorithmKey[] = ['FCFS', 'SSTF', 'SCAN', 'C-SCAN', 'LOOK', 'C-LOOK']

export const algorithmMeta: Record<AlgorithmKey, { label: string; accent: string; description: string; complexity: string; pros: string; cons: string; starvation: string }> = {
  FCFS: { label: 'First Come First Serve', accent: '#8b5cf6', description: 'Services requests in their arrival order, making it the simplest and fairest baseline.', complexity: 'O(n)', pros: 'Fair, predictable, easy to implement', cons: 'High average seek time', starvation: 'No starvation' },
  SSTF: { label: 'Shortest Seek Time First', accent: '#22d3ee', description: 'Chooses the pending request closest to the current head position.', complexity: 'O(n²)', pros: 'Usually low average seek distance', cons: 'Far requests may wait', starvation: 'Possible starvation' },
  SCAN: { label: 'Elevator / SCAN', accent: '#38bdf8', description: 'Sweeps toward a physical boundary, then reverses and services the other side.', complexity: 'O(n log n)', pros: 'Good fairness and throughput', cons: 'Boundary travel can be wasteful', starvation: 'Very unlikely' },
  'C-SCAN': { label: 'Circular SCAN', accent: '#fbbf24', description: 'Sweeps in one direction, wraps to the opposite boundary, and continues the same way.', complexity: 'O(n log n)', pros: 'More uniform waiting time', cons: 'Wraparound adds movement', starvation: 'Very unlikely' },
  LOOK: { label: 'LOOK', accent: '#fb7185', description: 'Like SCAN, but reverses at the final request instead of visiting the boundary.', complexity: 'O(n log n)', pros: 'Avoids unnecessary boundary movement', cons: 'Wait times depend on direction', starvation: 'Very unlikely' },
  'C-LOOK': { label: 'Circular LOOK', accent: '#34d399', description: 'Services one direction, then jumps to the farthest request on the other side.', complexity: 'O(n log n)', pros: 'Uniform service with less travel', cons: 'Wrap jump can be costly', starvation: 'Very unlikely' },
}


