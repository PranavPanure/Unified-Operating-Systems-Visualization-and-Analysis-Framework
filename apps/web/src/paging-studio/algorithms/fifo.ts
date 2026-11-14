export function chooseFifoVictim(loadTimes: number[], frames: Array<number | null>): number {
  const free = frames.findIndex((frame) => frame === null)
  if (free !== -1) return free
  return loadTimes.indexOf(Math.min(...loadTimes))
}


