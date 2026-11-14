export type Algorithm = 'FIFO' | 'LRU' | 'Optimal' | 'LFU' | 'MFU' | 'Second Chance'

export type StepSnapshot = {
  index: number
  reference: number
  hit: boolean
  fault: boolean
  replacedPage: number | null
  frames: Array<number | null>
  pageTable: Record<number, number>
  referenceBits: number[]
  dirtyBits: boolean[]
  frequencies: Record<number, number>
  explanation: string
  pointer: number
  pageFaults: number
  pageHits: number
  replacements: number
}

export type SimulationResult = {
  snapshots: StepSnapshot[]
  final: StepSnapshot | null
  pageFaults: number
  pageHits: number
  replacements: number
  faultsByStep: Array<{ step: number; faults: number; hits: number; occupancy: number }>
  frequencies: Array<{ page: string; accesses: number }>
}


