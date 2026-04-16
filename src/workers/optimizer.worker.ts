/// <reference lib="webworker" />
// Simulated Annealing optimizer for material flow layout.
// Self-contained — no imports from the project.

type NodeInput = {
  id: string
  pos_x: number  // grid cells (integer)
  pos_y: number  // grid cells (integer)
  width: number  // grid cells
  height: number // grid cells
}

type FlowInput = {
  from_node_id: string
  to_node_id: string
  transport_intensity: number // quantity × frequency combined metric
}

type OptimizerInput = {
  nodes: NodeInput[]
  fixedIds: string[]
  flows: FlowInput[]
  canvasWidth: number  // grid cells
  canvasHeight: number // grid cells
  metersPerCell: number
}

type OptimizerOutput = {
  positions: Record<string, { pos_x: number; pos_y: number }>
  scoreBefore: number
  scoreAfter: number
}

function computeScore(
  posMap: Map<string, { pos_x: number; pos_y: number }>,
  nodeMap: Map<string, NodeInput>,
  flows: FlowInput[],
  metersPerCell: number
): number {
  let score = 0
  for (const flow of flows) {
    const posA = posMap.get(flow.from_node_id)
    const posB = posMap.get(flow.to_node_id)
    const nodeA = nodeMap.get(flow.from_node_id)
    const nodeB = nodeMap.get(flow.to_node_id)
    if (!posA || !posB || !nodeA || !nodeB) continue
    const cx1 = posA.pos_x + nodeA.width / 2
    const cy1 = posA.pos_y + nodeA.height / 2
    const cx2 = posB.pos_x + nodeB.width / 2
    const cy2 = posB.pos_y + nodeB.height / 2
    const dx = cx2 - cx1
    const dy = cy2 - cy1
    const distMeters = Math.sqrt(dx * dx + dy * dy) * metersPerCell
    score += flow.transport_intensity * distMeters
  }
  return score
}

function hasOverlapWith(
  id: string,
  pos_x: number,
  pos_y: number,
  nodeMap: Map<string, NodeInput>,
  posMap: Map<string, { pos_x: number; pos_y: number }>
): boolean {
  const node = nodeMap.get(id)
  if (!node) return false
  const ax1 = pos_x
  const ay1 = pos_y
  const ax2 = ax1 + node.width
  const ay2 = ay1 + node.height

  for (const [otherId, otherPos] of posMap) {
    if (otherId === id) continue
    const other = nodeMap.get(otherId)
    if (!other) continue
    const bx1 = otherPos.pos_x
    const by1 = otherPos.pos_y
    const bx2 = bx1 + other.width
    const by2 = by1 + other.height
    if (ax1 < bx2 && ax2 > bx1 && ay1 < by2 && ay2 > by1) return true
  }
  return false
}

function isWithinBounds(
  pos_x: number,
  pos_y: number,
  width: number,
  height: number,
  canvasWidth: number,
  canvasHeight: number
): boolean {
  return (
    pos_x >= 0 &&
    pos_y >= 0 &&
    pos_x + width <= canvasWidth &&
    pos_y + height <= canvasHeight
  )
}

self.onmessage = (e: MessageEvent<OptimizerInput>) => {
  const { nodes, fixedIds, flows, canvasWidth, canvasHeight, metersPerCell } = e.data

  const fixedSet = new Set(fixedIds)
  const mutableIds = nodes.filter((n) => !fixedSet.has(n.id)).map((n) => n.id)

  const nodeMap = new Map<string, NodeInput>(nodes.map((n) => [n.id, n]))
  const posMap = new Map<string, { pos_x: number; pos_y: number }>(
    nodes.map((n) => [n.id, { pos_x: n.pos_x, pos_y: n.pos_y }])
  )

  const scoreBefore = computeScore(posMap, nodeMap, flows, metersPerCell)

  // Nothing to optimize
  if (mutableIds.length < 2) {
    const positions: Record<string, { pos_x: number; pos_y: number }> = {}
    for (const [id, pos] of posMap) positions[id] = { ...pos }
    const result: OptimizerOutput = { positions, scoreBefore, scoreAfter: scoreBefore }
    self.postMessage(result)
    return
  }

  let currentScore = scoreBefore
  let bestScore = scoreBefore
  const bestPosMap = new Map<string, { pos_x: number; pos_y: number }>(
    Array.from(posMap.entries()).map(([id, pos]) => [id, { ...pos }])
  )

  // Temperature schedule: start at ~30% of initial score, cool to near-zero
  let T = scoreBefore > 0 ? scoreBefore * 0.3 : 1000
  const maxIterations = 20000
  const coolingRate = Math.pow(0.001, 1 / maxIterations)

  for (let iter = 0; iter < maxIterations; iter++) {
    const rand = Math.random()
    const doSwap = rand < 0.5 && mutableIds.length >= 2
    const doRelocate = !doSwap && rand < 0.7  // 20% relocate, 30% nudge

    if (doRelocate) {
      // Pick one random mutable node and place it at a completely random free position
      const idA = mutableIds[Math.floor(Math.random() * mutableIds.length)]
      const nodeA = nodeMap.get(idA)!
      const oldPos = { ...posMap.get(idA)! }

      const newX = Math.floor(Math.random() * (canvasWidth - nodeA.width))
      const newY = Math.floor(Math.random() * (canvasHeight - nodeA.height))

      posMap.set(idA, { pos_x: newX, pos_y: newY })

      if (hasOverlapWith(idA, newX, newY, nodeMap, posMap)) {
        posMap.set(idA, oldPos)
        T *= coolingRate
        continue
      }

      const newScore = computeScore(posMap, nodeMap, flows, metersPerCell)
      const delta = newScore - currentScore

      if (delta < 0 || Math.random() < Math.exp(-delta / T)) {
        currentScore = newScore
        if (currentScore < bestScore) {
          bestScore = currentScore
          for (const [id, pos] of posMap) bestPosMap.set(id, { ...pos })
        }
      } else {
        posMap.set(idA, oldPos)
      }
    } else if (doSwap) {
      // Pick two distinct random mutable nodes and swap their positions
      const i = Math.floor(Math.random() * mutableIds.length)
      let j = Math.floor(Math.random() * (mutableIds.length - 1))
      if (j >= i) j++
      const idA = mutableIds[i]
      const idB = mutableIds[j]
      const posA = posMap.get(idA)!
      const posB = posMap.get(idB)!
      const nodeA = nodeMap.get(idA)!
      const nodeB = nodeMap.get(idB)!

      // Bounds check with swapped positions
      if (
        !isWithinBounds(posB.pos_x, posB.pos_y, nodeA.width, nodeA.height, canvasWidth, canvasHeight) ||
        !isWithinBounds(posA.pos_x, posA.pos_y, nodeB.width, nodeB.height, canvasWidth, canvasHeight)
      ) {
        T *= coolingRate
        continue
      }

      const oldAPos = { ...posA }
      const oldBPos = { ...posB }

      // Apply swap
      posMap.set(idA, { pos_x: oldBPos.pos_x, pos_y: oldBPos.pos_y })
      posMap.set(idB, { pos_x: oldAPos.pos_x, pos_y: oldAPos.pos_y })

      // Overlap check
      if (
        hasOverlapWith(idA, oldBPos.pos_x, oldBPos.pos_y, nodeMap, posMap) ||
        hasOverlapWith(idB, oldAPos.pos_x, oldAPos.pos_y, nodeMap, posMap)
      ) {
        posMap.set(idA, oldAPos)
        posMap.set(idB, oldBPos)
        T *= coolingRate
        continue
      }

      const newScore = computeScore(posMap, nodeMap, flows, metersPerCell)
      const delta = newScore - currentScore

      if (delta < 0 || Math.random() < Math.exp(-delta / T)) {
        currentScore = newScore
        if (currentScore < bestScore) {
          bestScore = currentScore
          for (const [id, pos] of posMap) bestPosMap.set(id, { ...pos })
        }
      } else {
        posMap.set(idA, oldAPos)
        posMap.set(idB, oldBPos)
      }
    } else {
      // Nudge one random mutable node by ±1..±5 cells
      const idA = mutableIds[Math.floor(Math.random() * mutableIds.length)]
      const posA = posMap.get(idA)!
      const nodeA = nodeMap.get(idA)!

      const maxNudge = 15
      const dx = Math.floor(Math.random() * (2 * maxNudge + 1)) - maxNudge
      const dy = Math.floor(Math.random() * (2 * maxNudge + 1)) - maxNudge
      if (dx === 0 && dy === 0) {
        T *= coolingRate
        continue
      }

      const newX = posA.pos_x + dx
      const newY = posA.pos_y + dy

      if (!isWithinBounds(newX, newY, nodeA.width, nodeA.height, canvasWidth, canvasHeight)) {
        T *= coolingRate
        continue
      }

      const oldPos = { ...posA }
      posMap.set(idA, { pos_x: newX, pos_y: newY })

      if (hasOverlapWith(idA, newX, newY, nodeMap, posMap)) {
        posMap.set(idA, oldPos)
        T *= coolingRate
        continue
      }

      const newScore = computeScore(posMap, nodeMap, flows, metersPerCell)
      const delta = newScore - currentScore

      if (delta < 0 || Math.random() < Math.exp(-delta / T)) {
        currentScore = newScore
        if (currentScore < bestScore) {
          bestScore = currentScore
          for (const [id, pos] of posMap) bestPosMap.set(id, { ...pos })
        }
      } else {
        posMap.set(idA, oldPos)
      }
    }

    T *= coolingRate
  }

  const positions: Record<string, { pos_x: number; pos_y: number }> = {}
  for (const [id, pos] of bestPosMap) positions[id] = { ...pos }

  const result: OptimizerOutput = { positions, scoreBefore, scoreAfter: bestScore }
  self.postMessage(result)
}

export {}
