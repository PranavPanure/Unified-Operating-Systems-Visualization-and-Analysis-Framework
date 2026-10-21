export type ProcessInput = { id: string; arrival: number; burst: number; priority?: number };
export type TimelineBlock = { id: string; start: number; end: number };
export type ScheduleResult = { blocks: TimelineBlock[]; metrics: { id: string; completion: number; turnaround: number; waiting: number; response: number }[]; averages: { waiting: number; turnaround: number; response: number } };

function result(workload: ProcessInput[], blocks: TimelineBlock[]): ScheduleResult {
  const metrics = workload.map((process) => {
    const first = blocks.find((block) => block.id === process.id);
    const last = [...blocks].reverse().find((block) => block.id === process.id);
    const completion = last?.end ?? 0;
    const turnaround = completion - process.arrival;
    const waiting = turnaround - process.burst;
    return { id: process.id, completion, turnaround, waiting, response: (first?.start ?? process.arrival) - process.arrival };
  });
  const average = (key: 'waiting' | 'turnaround' | 'response') => Number((metrics.reduce((sum, item) => sum + item[key], 0) / Math.max(metrics.length, 1)).toFixed(2));
  return { blocks, metrics, averages: { waiting: average('waiting'), turnaround: average('turnaround'), response: average('response') } };
}

export function fcfs(workload: ProcessInput[]): ScheduleResult {
  const blocks: TimelineBlock[] = [];
  let time = 0;
  [...workload].sort((a, b) => a.arrival - b.arrival).forEach((process) => {
    if (time < process.arrival) { blocks.push({ id: 'IDLE', start: time, end: process.arrival }); time = process.arrival; }
    blocks.push({ id: process.id, start: time, end: time + process.burst }); time += process.burst;
  });
  return result(workload, blocks);
}

export function sjf(workload: ProcessInput[]): ScheduleResult {
  const remaining = [...workload]; const blocks: TimelineBlock[] = []; let time = 0;
  while (remaining.length) {
    const ready = remaining.filter((item) => item.arrival <= time).sort((a, b) => a.burst - b.burst || a.arrival - b.arrival);
    if (!ready.length) { const next = Math.min(...remaining.map((item) => item.arrival)); blocks.push({ id: 'IDLE', start: time, end: next }); time = next; continue; }
    const process = ready[0]; remaining.splice(remaining.indexOf(process), 1); blocks.push({ id: process.id, start: time, end: time + process.burst }); time += process.burst;
  }
  return result(workload, blocks);
}

function chooseShortest(ready: Array<ProcessInput & { left: number }>) {
  return [...ready].sort((a, b) => a.left - b.left || a.arrival - b.arrival || a.id.localeCompare(b.id))[0];
}

export function srtf(workload: ProcessInput[]): ScheduleResult {
  const remaining = workload.map((item) => ({ ...item, left: item.burst })); const blocks: TimelineBlock[] = []; let time = 0;
  while (remaining.some((item) => item.left > 0)) {
    const ready = remaining.filter((item) => item.left > 0 && item.arrival <= time);
    if (!ready.length) { const next = Math.min(...remaining.filter((item) => item.left > 0).map((item) => item.arrival)); blocks.push({ id: 'IDLE', start: time, end: next }); time = next; continue; }
    const process = chooseShortest(ready); blocks.push({ id: process.id, start: time, end: time + 1 }); process.left -= 1; time += 1;
  }
  return result(workload, blocks);
}

export function priorityScheduling(workload: ProcessInput[], preemptive = false): ScheduleResult {
  const normalized = workload.map((item) => ({ ...item, priority: item.priority ?? 1, left: item.burst })); const blocks: TimelineBlock[] = []; let time = 0;
  while (normalized.some((item) => item.left > 0)) {
    const ready = normalized.filter((item) => item.left > 0 && item.arrival <= time).sort((a, b) => (a.priority ?? 1) - (b.priority ?? 1) || a.arrival - b.arrival || a.id.localeCompare(b.id));
    if (!ready.length) { const next = Math.min(...normalized.filter((item) => item.left > 0).map((item) => item.arrival)); blocks.push({ id: 'IDLE', start: time, end: next }); time = next; continue; }
    const process = ready[0]; const duration = preemptive ? 1 : process.left; blocks.push({ id: process.id, start: time, end: time + duration }); process.left -= duration; time += duration;
  }
  return result(workload, blocks);
}

export function roundRobin(workload: ProcessInput[], quantum = 2): ScheduleResult {
  const remaining = workload.map((item) => ({ ...item, left: item.burst })); const blocks: TimelineBlock[] = []; let time = 0; let queue: typeof remaining = [];
  const addArrivals = () => remaining.filter((item) => item.left > 0 && item.arrival <= time && !queue.includes(item)).sort((a, b) => a.arrival - b.arrival).forEach((item) => queue.push(item));
  while (remaining.some((item) => item.left > 0)) {
    addArrivals();
    if (!queue.length) { const next = Math.min(...remaining.filter((item) => item.left > 0).map((item) => item.arrival)); blocks.push({ id: 'IDLE', start: time, end: next }); time = next; continue; }
    const process = queue.shift()!; const duration = Math.min(quantum, process.left); blocks.push({ id: process.id, start: time, end: time + duration }); process.left -= duration; time += duration; addArrivals(); if (process.left > 0) queue.push(process);
  }
  return result(workload, blocks);
}

export function fifoPages(pages: number[], frames: number) { const memory: number[] = []; const rows: { page: number; frames: number[]; fault: boolean }[] = []; let pointer = 0; pages.forEach((page) => { const hit = memory.includes(page); if (!hit) { if (memory.length < frames) memory.push(page); else { memory[pointer] = page; pointer = (pointer + 1) % frames; } } rows.push({ page, frames: [...memory], fault: !hit }); }); return { rows, faults: rows.filter((row) => row.fault).length }; }

export function lruPages(pages: number[], frames: number) { const memory: number[] = []; const rows: { page: number; frames: number[]; fault: boolean }[] = []; pages.forEach((page, index) => { const hit = memory.includes(page); if (!hit) { if (memory.length < frames) memory.push(page); else { const leastRecent = memory.map((value) => ({ value, index: pages.slice(0, index).lastIndexOf(value) })).sort((a, b) => a.index - b.index)[0].value; memory[memory.indexOf(leastRecent)] = page; } } else { memory.splice(memory.indexOf(page), 1); memory.push(page); } rows.push({ page, frames: [...memory], fault: !hit }); }); return { rows, faults: rows.filter((row) => row.fault).length }; }

export function optimalPages(pages: number[], frames: number) { const memory: number[] = []; const rows: { page: number; frames: number[]; fault: boolean }[] = []; pages.forEach((page, index) => { const hit = memory.includes(page); if (!hit) { if (memory.length < frames) memory.push(page); else { const victim = memory.map((value) => ({ value, next: pages.slice(index + 1).indexOf(value) })).sort((a, b) => (b.next === -1 ? Infinity : b.next) - (a.next === -1 ? Infinity : a.next))[0].value; memory[memory.indexOf(victim)] = page; } } rows.push({ page, frames: [...memory], fault: !hit }); }); return { rows, faults: rows.filter((row) => row.fault).length }; }

export function bankers(available: number[], allocation: number[][], maximum: number[][]) { const need = maximum.map((row, i) => row.map((value, j) => value - allocation[i][j])); const work = [...available]; const finish = allocation.map(() => false); const sequence: number[] = []; let changed = true; while (changed) { changed = false; need.forEach((row, i) => { if (!finish[i] && row.every((value, j) => value <= work[j])) { work.splice(0, work.length, ...work.map((value, j) => value + allocation[i][j])); finish[i] = true; sequence.push(i); changed = true; } }); } return { safe: finish.every(Boolean), sequence, need }; }

export type DiskResult = { path: number[]; movement: number };
function diskResult(path: number[]): DiskResult { return { path, movement: path.slice(1).reduce((sum, track, i) => sum + Math.abs(track - path[i]), 0) }; }
export function diskFcfs(start: number, requests: number[]) { return diskResult([start, ...requests]); }
export function diskSstf(start: number, requests: number[]) { const pending = [...requests]; const path = [start]; let current = start; while (pending.length) { const closest = pending.sort((a, b) => Math.abs(a - current) - Math.abs(b - current) || a - b).shift()!; path.push(closest); current = closest; } return diskResult(path); }
function directionalDisk(start: number, requests: number[], direction: 'right' | 'left', look: boolean, circular: boolean, maxTrack = 199) { const lower = requests.filter((request) => request < start).sort((a, b) => a - b); const upper = requests.filter((request) => request >= start).sort((a, b) => a - b); const path = [start]; if (direction === 'right') { path.push(...upper); if (!look && (path.at(-1) ?? start) !== maxTrack) path.push(maxTrack); if (circular) { if (lower.length) path.push(0, ...lower); } else path.push(...lower.reverse()); } else { path.push(...lower.reverse()); if (!look && (path.at(-1) ?? start) !== 0) path.push(0); if (circular) { if (upper.length) path.push(maxTrack, ...upper); } else path.push(...upper); } return diskResult(path); }
export function diskScan(start: number, requests: number[], direction: 'right' | 'left' = 'right') { return directionalDisk(start, requests, direction, false, false); }
export function diskCscan(start: number, requests: number[], direction: 'right' | 'left' = 'right') { return directionalDisk(start, requests, direction, false, true); }
export function diskLook(start: number, requests: number[], direction: 'right' | 'left' = 'right') { return directionalDisk(start, requests, direction, true, false); }
export function diskClook(start: number, requests: number[], direction: 'right' | 'left' = 'right') { return directionalDisk(start, requests, direction, true, true); }

export type SynchronizationStep = { action: 'produce' | 'consume'; item: number | null; buffer: number[]; blocked: boolean; message: string };
export function producerConsumer(capacity: number, operations: Array<'produce' | 'consume'>): SynchronizationStep[] { const buffer: number[] = []; let nextItem = 1; return operations.map((action) => { if (action === 'produce') { if (buffer.length >= capacity) return { action, item: null, buffer: [...buffer], blocked: true, message: 'Producer blocked: the bounded buffer is full.' }; const item = nextItem++; buffer.push(item); return { action, item, buffer: [...buffer], blocked: false, message: `Produced item ${item}.` }; } if (!buffer.length) return { action, item: null, buffer: [], blocked: true, message: 'Consumer blocked: the buffer is empty.' }; const item = buffer.shift()!; return { action, item, buffer: [...buffer], blocked: false, message: `Consumed item ${item}.` }; }); }

export type ReadersWritersAction = 'read-start' | 'read-end' | 'write-start' | 'write-end';
export type ReadersWritersStep = { action: ReadersWritersAction; activeReaders: number; writerActive: boolean; blocked: boolean; message: string };
export function readersWriters(operations: ReadersWritersAction[]): ReadersWritersStep[] {
  let activeReaders = 0;
  let writerActive = false;
  return operations.map((action) => {
    let blocked = false;
    let message = '';
    if (action === 'read-start') {
      if (writerActive) { blocked = true; message = 'Reader blocked: a writer owns the shared resource.'; }
      else { activeReaders += 1; message = `Reader entered. ${activeReaders} reader${activeReaders === 1 ? '' : 's'} active.`; }
    } else if (action === 'read-end') {
      if (activeReaders === 0) { blocked = true; message = 'Reader release blocked: no reader is active.'; }
      else { activeReaders -= 1; message = `Reader left. ${activeReaders} reader${activeReaders === 1 ? '' : 's'} remain.`; }
    } else if (action === 'write-start') {
      if (writerActive || activeReaders > 0) { blocked = true; message = 'Writer blocked: the shared resource is already in use.'; }
      else { writerActive = true; message = 'Writer entered with exclusive access.'; }
    } else if (!writerActive) { blocked = true; message = 'Writer release blocked: no writer is active.'; }
    else { writerActive = false; message = 'Writer left; the resource is available again.'; }
    return { action, activeReaders, writerActive, blocked, message };
  });
}

export type PhilosopherAction = 'take-left' | 'take-right' | 'release';
export type PhilosopherStep = { philosopher: number; action: PhilosopherAction; forks: Array<number | null>; eating: number[]; blocked: boolean; message: string };
export function diningPhilosophers(operations: Array<{ philosopher: number; action: PhilosopherAction }>): PhilosopherStep[] {
  const forks: Array<number | null> = Array.from({ length: 5 }, () => null);
  const snapshot = () => forks.map((owner) => owner);
  return operations.map(({ philosopher, action }) => {
    const left = philosopher;
    const right = (philosopher + 1) % 5;
    let blocked = false;
    let message = '';
    if (action === 'release') {
      if (forks[left] === philosopher) forks[left] = null;
      if (forks[right] === philosopher) forks[right] = null;
      message = `Philosopher ${philosopher + 1} released its forks.`;
    } else {
      const fork = action === 'take-left' ? left : right;
      if (forks[fork] !== null && forks[fork] !== philosopher) {
        blocked = true;
        message = `Philosopher ${philosopher + 1} blocked: fork ${fork + 1} is held by philosopher ${(forks[fork] ?? 0) + 1}.`;
      } else {
        forks[fork] = philosopher;
        message = `Philosopher ${philosopher + 1} picked up fork ${fork + 1}.`;
      }
    }
    const eating = forks.map((owner, fork) => owner !== null && owner === forks[(fork + 4) % 5] ? owner : null).filter((owner, index, owners): owner is number => owner !== null && owners.indexOf(owner) === index);
    return { philosopher, action, forks: snapshot(), eating, blocked, message };
  });
}
