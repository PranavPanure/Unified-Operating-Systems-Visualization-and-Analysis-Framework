import { describe, expect, it } from 'vitest';
import { bankers, diningPhilosophers, diskCscan, diskFcfs, diskLook, diskSstf, fcfs, fifoPages, lruPages, optimalPages, priorityScheduling, producerConsumer, readersWriters, roundRobin, sjf, srtf } from './simulators';

describe('scheduling simulators', () => {
  const workload = [{ id: 'P1', arrival: 0, burst: 5 }, { id: 'P2', arrival: 1, burst: 2 }, { id: 'P3', arrival: 2, burst: 1 }];
  it('calculates FCFS order and averages', () => { const output = fcfs(workload); expect(output.blocks.map((block) => block.id)).toEqual(['P1', 'P2', 'P3']); expect(output.metrics.find((item) => item.id === 'P3')?.waiting).toBe(5); expect(output.averages.waiting).toBe(3); });
  it('selects the shortest ready job for non-preemptive SJF', () => { const output = sjf(workload); expect(output.blocks.map((block) => block.id)).toEqual(['P1', 'P3', 'P2']); });
  it('creates multiple time slices for Round Robin', () => { const output = roundRobin(workload, 2); expect(output.blocks.filter((block) => block.id === 'P1').length).toBeGreaterThan(1); });
  it('preempts when a shorter remaining job arrives', () => { const output = srtf([{ id: 'P1', arrival: 0, burst: 8 }, { id: 'P2', arrival: 1, burst: 2 }]); expect(output.blocks.slice(0, 2).map((block) => block.id)).toEqual(['P1', 'P2']); expect(output.blocks.at(-1)?.id).toBe('P1'); });
  it('supports non-preemptive and preemptive priority policies', () => { const workloadWithPriority = [{ id: 'P1', arrival: 0, burst: 5, priority: 2 }, { id: 'P2', arrival: 1, burst: 2, priority: 1 }]; expect(priorityScheduling(workloadWithPriority).blocks.map((block) => block.id)).toEqual(['P1', 'P2']); const preemptive = priorityScheduling(workloadWithPriority, true); expect(preemptive.blocks.slice(0, 2).map((block) => block.id)).toEqual(['P1', 'P2']); expect(preemptive.blocks.at(-1)?.id).toBe('P1'); });
});

describe('memory, safety, and disk simulators', () => {
  it('counts FIFO page faults', () => { expect(fifoPages([1, 2, 3, 1, 4], 3).faults).toBe(4); });
  it('supports LRU and Optimal page replacement', () => { expect(lruPages([1, 2, 3, 1, 4], 3).faults).toBe(4); expect(optimalPages([1, 2, 3, 1, 4], 3).faults).toBe(4); });
  it('finds a Banker safe sequence', () => { const output = bankers([3, 3, 2], [[1, 0, 0], [0, 1, 0], [1, 1, 1]], [[1, 1, 1], [1, 2, 1], [2, 2, 2]]); expect(output.safe).toBe(true); expect(output.sequence).toEqual([0, 1, 2]); });
  it('calculates FCFS disk movement', () => { expect(diskFcfs(50, [70, 30]).movement).toBe(60); });
  it('supports SSTF and directional disk policies', () => { expect(diskSstf(50, [70, 30]).path).toEqual([50, 30, 70]); expect(diskLook(50, [70, 30]).path).toEqual([50, 70, 30]); expect(diskCscan(50, [70, 30]).path).toEqual([50, 70, 199, 0, 30]); });
  it('models producer-consumer blocking', () => { const output = producerConsumer(1, ['consume', 'produce', 'produce', 'consume']); expect(output[0].blocked).toBe(true); expect(output[2].blocked).toBe(true); expect(output[3].item).toBe(1); });
  it('models readers-writers exclusion', () => { const output = readersWriters(['read-start', 'write-start', 'read-end', 'write-start', 'write-end']); expect(output[1].blocked).toBe(true); expect(output[3].writerActive).toBe(true); });
  it('exposes dining philosophers fork contention', () => { const output = diningPhilosophers([{ philosopher: 0, action: 'take-left' }, { philosopher: 1, action: 'take-left' }, { philosopher: 0, action: 'take-right' }]); expect(output[2].blocked).toBe(true); });
});
