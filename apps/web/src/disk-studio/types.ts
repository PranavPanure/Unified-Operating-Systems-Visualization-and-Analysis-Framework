export type AlgorithmKey = 'FCFS' | 'SSTF' | 'SCAN' | 'C-SCAN' | 'LOOK' | 'C-LOOK'
export type Direction = 'up' | 'down'
export type MovementType = 'request' | 'boundary' | 'wrap'

export interface DiskConfig {
  min: number
  max: number
  head: number
  direction: Direction
  rpm: number
  seekCost: number
  requestSize: number
  transferRate: number
}

export interface RequestItem {
  id: number
  cylinder: number
}

export interface Movement {
  from: number
  to: number
  distance: number
  type: MovementType
  requestId?: number
  direction: Direction | null
}

export interface ScheduleResult {
  algorithm: AlgorithmKey
  initialHead: number
  sequence: number[]
  movements: Movement[]
  requests: RequestItem[]
}

export interface Metrics {
  totalMovement: number
  averageSeek: number
  maxSeek: number
  minSeek: number
  reversals: number
  boundaryTraversals: number
  wraps: number
  requestsServiced: number
  requestsRemaining: number
}


