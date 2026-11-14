export function chooseOptimalVictim(
  frames: Array<number | null>,
  references: number[],
  currentIndex: number,
  loadTimes: number[],
): number {
  const free = frames.findIndex((frame) => frame === null)
  if (free !== -1) return free
  let bestFrame = 0
  let farthest = -1
  frames.forEach((page, frameIndex) => {
    const next = references.indexOf(page as number, currentIndex + 1)
    const nextIndex = next === -1 ? Number.POSITIVE_INFINITY : next
    if (nextIndex > farthest || (nextIndex === farthest && loadTimes[frameIndex] < loadTimes[bestFrame])) {
      farthest = nextIndex
      bestFrame = frameIndex
    }
  })
  return bestFrame
}


