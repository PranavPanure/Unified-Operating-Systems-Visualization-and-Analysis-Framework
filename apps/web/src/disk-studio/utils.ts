import { Metrics, Movement, ScheduleResult } from './types'

export function getMetrics(result: ScheduleResult, visibleMoves = result.movements.length): Metrics {
  const movements = result.movements.slice(0, visibleMoves)
  const requestMoves = movements.filter((movement) => movement.type === 'request')
  let reversals = 0
  let lastDirection: Movement['direction'] = null
  movements.forEach((movement) => {
    if (movement.type === 'wrap') return
    if (movement.direction && lastDirection && movement.direction !== lastDirection) reversals += 1
    if (movement.direction) lastDirection = movement.direction
  })
  const distances = requestMoves.map((movement) => movement.distance)
  const totalMovement = movements.reduce((sum, movement) => sum + movement.distance, 0)
  return {
    totalMovement,
    averageSeek: requestMoves.length ? distances.reduce((sum, value) => sum + value, 0) / requestMoves.length : 0,
    maxSeek: distances.length ? Math.max(...distances) : 0,
    minSeek: distances.length ? Math.min(...distances) : 0,
    reversals,
    boundaryTraversals: movements.filter((movement) => movement.type === 'boundary').length,
    wraps: movements.filter((movement) => movement.type === 'wrap').length,
    requestsServiced: requestMoves.length,
    requestsRemaining: result.requests.length - requestMoves.length,
  }
}

export function estimateSeekTime(totalMovement: number, seekCost: number) {
  return totalMovement * seekCost
}

export function averageRotationalLatency(rpm: number) {
  return rpm > 0 ? 30000 / rpm : 0
}

export function estimatedTransferTime(requestSize: number, rate: number) {
  return rate > 0 ? (requestSize / rate) * 1000 : 0
}

export function movementColor(type: Movement['type']) {
  return type === 'wrap' ? '#fbbf24' : type === 'boundary' ? '#fb7185' : '#60a5fa'
}


