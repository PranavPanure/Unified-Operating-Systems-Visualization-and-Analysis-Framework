export function chooseLfuVictim(
  frequencies: Record<number, number>,
  lastUsed: number[],
  loadTimes: number[],
  frames: Array<number | null>,
  mostFrequent = false,
): number {
  const free = frames.findIndex((frame) => frame === null)
  if (free !== -1) return free
  const residentFrames = frames as number[]
  return residentFrames.reduce((best, page, index) => {
    const currentFrequency = frequencies[page] ?? 0
    const bestFrequency = frequencies[residentFrames[best]] ?? 0
    const primary = mostFrequent ? currentFrequency > bestFrequency : currentFrequency < bestFrequency
    const tie = currentFrequency === bestFrequency && (lastUsed[index] < lastUsed[best] || (lastUsed[index] === lastUsed[best] && loadTimes[index] < loadTimes[best]))
    return primary || tie ? index : best
  }, 0)
}


