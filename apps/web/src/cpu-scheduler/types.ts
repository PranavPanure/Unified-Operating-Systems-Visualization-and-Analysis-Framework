export type AlgorithmId =
  | 'fcfs'
  | 'sjf'
  | 'srtf'
  | 'rr'
  | 'priority'
  | 'priority-preemptive'
  | 'ljf'
  | 'lrtf'
  | 'hrrn'

export type PriorityDirection = 'lower' | 'higher'

export type SegmentKind = 'process' | 'idle' | 'context'

export interface ProcessInput {
  id: string
  arrival: number
  burst: number
  priority: number
  color: string
}

export interface Segment {
  id: string
  start: number
  end: number
  kind: SegmentKind
  color?: string
}

export interface ProcessMetrics extends ProcessInput {
  completion: number
  turnaround: number
  waiting: number
  response: number
  firstStart: number
}

export interface DecisionLog {
  time: number
  title: string
  detail: string
  processId?: string
}

export interface ScheduleResult {
  segments: Segment[]
  metrics: ProcessMetrics[]
  decisions: DecisionLog[]
  totalTime: number
  busyTime: number
  utilization: number
  throughput: number
}


