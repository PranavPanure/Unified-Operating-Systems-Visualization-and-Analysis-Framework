import { chooseFifoVictim } from './algorithms/fifo'
import { chooseLruVictim } from './algorithms/lru'
import { chooseOptimalVictim } from './algorithms/optimal'
import { chooseLfuVictim } from './algorithms/lfu'
import { chooseSecondChanceVictim } from './algorithms/secondChance'
import type { Algorithm, SimulationResult, StepSnapshot } from './types'

export const algorithmDetails: Record<Algorithm, { description: string; best: string; tradeoff: string; complexity: string; stack: string }> = {
  FIFO: { description: 'Evicts the page that has been resident the longest.', best: 'Simple baseline with low bookkeeping.', tradeoff: 'Can evict a heavily reused page and may show Belady’s anomaly.', complexity: 'O(1) victim selection', stack: 'No' },
  LRU: { description: 'Evicts the page that has gone unused for the longest time.', best: 'Strong locality-aware default for many workloads.', tradeoff: 'Needs recency tracking; exact hardware support is costly.', complexity: 'O(F) victim selection', stack: 'Yes' },
  Optimal: { description: 'Evicts the page whose next use is farthest in the future.', best: 'The theoretical lower bound for page faults.', tradeoff: 'Requires future knowledge, so it is an offline benchmark.', complexity: 'O(F × R)', stack: 'Yes' },
  LFU: { description: 'Evicts the least frequently referenced resident page.', best: 'Workloads with stable hot and cold pages.', tradeoff: 'Old popularity can outlive a workload phase.', complexity: 'O(F) victim selection', stack: 'No' },
  MFU: { description: 'Evicts the most frequently referenced resident page.', best: 'Workloads where frequent pages are nearing completion.', tradeoff: 'Often counterintuitive for locality-heavy access streams.', complexity: 'O(F) victim selection', stack: 'No' },
  'Second Chance': { description: 'FIFO with a reference bit that protects recently used pages once.', best: 'Low-cost approximation of LRU.', tradeoff: 'May scan several frames before finding a victim.', complexity: 'Amortized O(1)', stack: 'No' },
}

export function simulatePaging(references: number[], frameCount: number, algorithm: Algorithm): SimulationResult {
  const frames: Array<number | null> = Array(frameCount).fill(null)
  const loadTimes = Array(frameCount).fill(-1)
  const lastUsed = Array(frameCount).fill(-1)
  const referenceBits = Array(frameCount).fill(0)
  const dirtyBits = Array(frameCount).fill(false)
  const frequencies: Record<number, number> = {}
  const pageTable: Record<number, number> = {}
  let pointer = 0
  let faults = 0
  let hits = 0
  let replacements = 0
  const snapshots: StepSnapshot[] = []

  references.forEach((page, index) => {
    frequencies[page] = (frequencies[page] ?? 0) + 1
    const hitFrame = frames.indexOf(page)
    const hit = hitFrame !== -1
    let victim = hitFrame
    let replacementExplanation = ''
    let secondChances: number[] = []
    let evictedPage: number | null = null

    if (hit) {
      hits += 1
      lastUsed[hitFrame] = index
      referenceBits[hitFrame] = 1
      replacementExplanation = `Page ${page} is already resident in frame ${hitFrame}; the reference bit is set.`
    } else {
      faults += 1
      if (algorithm === 'FIFO') victim = chooseFifoVictim(loadTimes, frames)
      if (algorithm === 'LRU') victim = chooseLruVictim(lastUsed, loadTimes, frames)
      if (algorithm === 'Optimal') victim = chooseOptimalVictim(frames, references, index, loadTimes)
      if (algorithm === 'LFU') victim = chooseLfuVictim(frequencies, lastUsed, loadTimes, frames)
      if (algorithm === 'MFU') victim = chooseLfuVictim(frequencies, lastUsed, loadTimes, frames, true)
      if (algorithm === 'Second Chance') {
        const result = chooseSecondChanceVictim(frames, referenceBits, pointer)
        victim = result.victim
        pointer = result.nextPointer
        secondChances = result.secondChances
      }
      const oldPage = frames[victim]
      if (oldPage !== null) {
        evictedPage = oldPage
        replacements += 1
        delete pageTable[oldPage]
      }
      frames[victim] = page
      pageTable[page] = victim
      loadTimes[victim] = index
      lastUsed[victim] = index
      referenceBits[victim] = 1
      dirtyBits[victim] = false
      if (algorithm !== 'Second Chance') pointer = (victim + 1) % frameCount
      if (algorithm === 'Optimal') {
        const future = references.indexOf(oldPage as number, index + 1)
        replacementExplanation = oldPage === null ? `Free frame ${victim} is selected for demand loading.` : `Optimal chooses frame ${victim}; page ${oldPage} is used ${future === -1 ? 'no more times' : `next at step ${future + 1}`}.`
      } else if (algorithm === 'Second Chance') {
        replacementExplanation = oldPage === null ? `Free frame ${victim} is selected by the clock hand.` : `${secondChances.length ? `Frames ${secondChances.join(', ')} receive a second chance. ` : ''}Frame ${victim} has reference bit 0, so page ${oldPage} is evicted.`
      } else {
        replacementExplanation = oldPage === null ? `Free frame ${victim} is selected for demand loading.` : `${algorithm} selects frame ${victim}; page ${oldPage} is replaced by page ${page}.`
      }
    }

    const snapshot: StepSnapshot = {
      index,
      reference: page,
      hit,
      fault: !hit,
      replacedPage: evictedPage,
      frames: [...frames],
      pageTable: { ...pageTable },
      referenceBits: [...referenceBits],
      dirtyBits: [...dirtyBits],
      frequencies: { ...frequencies },
      explanation: hit ? replacementExplanation : replacementExplanation,
      pointer,
      pageFaults: faults,
      pageHits: hits,
      replacements,
    }
    snapshots.push(snapshot)
  })

  return {
    snapshots,
    final: snapshots.length ? snapshots[snapshots.length - 1] : null,
    pageFaults: faults,
    pageHits: hits,
    replacements,
    faultsByStep: snapshots.map((snapshot) => ({ step: snapshot.index + 1, faults: snapshot.pageFaults, hits: snapshot.pageHits, occupancy: snapshot.frames.filter((frame) => frame !== null).length })),
    frequencies: Object.entries(frequencies).sort((a, b) => Number(a[0]) - Number(b[0])).map(([page, accesses]) => ({ page: `P${page}`, accesses })),
  }
}

export function parseReferences(value: string, virtualPages: number): { references: number[]; error: string | null } {
  const tokens = value.split(/[\s,]+/).map((token) => token.trim()).filter(Boolean)
  if (!tokens.length) return { references: [], error: 'Add at least one page reference.' }
  if (tokens.length > 100) return { references: [], error: 'Reference strings are limited to 100 pages.' }
  const references = tokens.map(Number)
  if (references.some((value) => !Number.isInteger(value))) return { references: [], error: 'References must be whole page numbers.' }
  if (references.some((value) => value < 0 || value >= virtualPages)) return { references: [], error: `Every page must be between 0 and ${virtualPages - 1}.` }
  return { references, error: null }
}

export function translateAddress(address: number, pageSize: number, virtualPages: number, pageTable: Partial<Record<number, number>>) {
  const virtualSpace = pageSize * virtualPages
  if (!Number.isInteger(address) || address < 0 || address >= virtualSpace) return { valid: false as const, error: `Address must be an integer from 0 to ${virtualSpace - 1}.` }
  const page = Math.floor(address / pageSize)
  const offset = address % pageSize
  const frame = pageTable[page]
  return { valid: true as const, address, page, offset, frame: frame ?? null, physical: frame === undefined ? null : frame * pageSize + offset }
}


