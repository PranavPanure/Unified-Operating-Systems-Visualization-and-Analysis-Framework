export function chooseSecondChanceVictim(
  frames: Array<number | null>,
  referenceBits: number[],
  pointer: number,
): { victim: number; nextPointer: number; secondChances: number[] } {
  const free = frames.findIndex((frame) => frame === null)
  if (free !== -1) return { victim: free, nextPointer: (free + 1) % frames.length, secondChances: [] }
  let cursor = pointer
  const secondChances: number[] = []
  while (referenceBits[cursor] === 1) {
    referenceBits[cursor] = 0
    secondChances.push(cursor)
    cursor = (cursor + 1) % frames.length
  }
  return { victim: cursor, nextPointer: (cursor + 1) % frames.length, secondChances }
}


