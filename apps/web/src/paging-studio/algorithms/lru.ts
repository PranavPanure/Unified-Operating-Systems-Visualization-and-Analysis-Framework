export function chooseLruVictim(lastUsed: number[], loadTimes: number[], frames: Array<number | null>): number {
  const free = frames.findIndex((frame) => frame === null)
  if (free !== -1) return free
  return lastUsed.reduce((best, value, index) => {
    if (value < lastUsed[best]) return index
    if (value === lastUsed[best] && loadTimes[index] < loadTimes[best]) return index
    return best
  }, 0)
}


