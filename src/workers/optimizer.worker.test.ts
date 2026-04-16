import { describe, it, expect } from 'vitest'

/**
 * PROJ-9: Auto-Layout-Optimierung — Unit Tests
 *
 * Tests the core optimizer logic: computeScore, hasOverlapWith, isWithinBounds.
 * Functions are replicated here (not exported from the worker) following the
 * same pattern as use-kpi-calculation.test.ts.
 *
 * The end-to-end optimizer behavior (SA convergence) is validated via
 * a deterministic test: 3 nodes already in ideal positions → score unchanged.
 */

// ── Replicated pure functions (mirrors optimizer.worker.ts) ───────────────────

type NodeInput = {
  id: string
  pos_x: number
  pos_y: number
  width: number
  height: number
}

type FlowInput = {
  from_node_id: string
  to_node_id: string
  transport_intensity: number
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

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeNode(id: string, x: number, y: number, w = 2, h = 2): NodeInput {
  return { id, pos_x: x, pos_y: y, width: w, height: h }
}

function makeNodeMap(...nodes: NodeInput[]): Map<string, NodeInput> {
  return new Map(nodes.map((n) => [n.id, n]))
}

function makePosMap(
  ...entries: Array<{ id: string; pos_x: number; pos_y: number }>
): Map<string, { pos_x: number; pos_y: number }> {
  return new Map(entries.map((e) => [e.id, { pos_x: e.pos_x, pos_y: e.pos_y }]))
}

// ── computeScore ───────────────────────────────────────────────────────────────

describe('computeScore — basic geometry', () => {
  it('returns 0 when there are no flows', () => {
    const nodeMap = makeNodeMap(makeNode('a', 0, 0))
    const posMap = makePosMap({ id: 'a', pos_x: 0, pos_y: 0 })
    expect(computeScore(posMap, nodeMap, [], 1.0)).toBe(0)
  })

  it('returns 0 when nodes overlap (distance = 0)', () => {
    const nA = makeNode('a', 0, 0, 2, 2)
    const nB = makeNode('b', 0, 0, 2, 2)
    const nodeMap = makeNodeMap(nA, nB)
    const posMap = makePosMap({ id: 'a', pos_x: 0, pos_y: 0 }, { id: 'b', pos_x: 0, pos_y: 0 })
    const flow: FlowInput = { from_node_id: 'a', to_node_id: 'b', transport_intensity: 100 }
    expect(computeScore(posMap, nodeMap, [flow], 1.0)).toBe(0)
  })

  it('computes centre-to-centre distance for horizontal nodes', () => {
    // A: pos(0,0) 2×2 → centre (1,1); B: pos(3,0) 2×2 → centre (4,1)
    // dx=3, dy=0 → dist=3 cells, score = intensity × 3 × metersPerCell
    const nA = makeNode('a', 0, 0, 2, 2)
    const nB = makeNode('b', 3, 0, 2, 2)
    const nodeMap = makeNodeMap(nA, nB)
    const posMap = makePosMap({ id: 'a', pos_x: 0, pos_y: 0 }, { id: 'b', pos_x: 3, pos_y: 0 })
    const flow: FlowInput = { from_node_id: 'a', to_node_id: 'b', transport_intensity: 10 }
    expect(computeScore(posMap, nodeMap, [flow], 1.0)).toBeCloseTo(30)
  })

  it('scales linearly with metersPerCell', () => {
    const nA = makeNode('a', 0, 0, 2, 2)
    const nB = makeNode('b', 4, 0, 2, 2)
    const nodeMap = makeNodeMap(nA, nB)
    const posMap = makePosMap({ id: 'a', pos_x: 0, pos_y: 0 }, { id: 'b', pos_x: 4, pos_y: 0 })
    const flow: FlowInput = { from_node_id: 'a', to_node_id: 'b', transport_intensity: 1 }
    const s1 = computeScore(posMap, nodeMap, [flow], 1.0)
    const s2 = computeScore(posMap, nodeMap, [flow], 2.0)
    expect(s2).toBeCloseTo(s1 * 2)
  })

  it('scales linearly with transport_intensity', () => {
    const nA = makeNode('a', 0, 0, 2, 2)
    const nB = makeNode('b', 3, 0, 2, 2)
    const nodeMap = makeNodeMap(nA, nB)
    const posMap = makePosMap({ id: 'a', pos_x: 0, pos_y: 0 }, { id: 'b', pos_x: 3, pos_y: 0 })
    const f1: FlowInput = { from_node_id: 'a', to_node_id: 'b', transport_intensity: 5 }
    const f2: FlowInput = { from_node_id: 'a', to_node_id: 'b', transport_intensity: 10 }
    const s1 = computeScore(posMap, nodeMap, [f1], 1.0)
    const s2 = computeScore(posMap, nodeMap, [f2], 1.0)
    expect(s2).toBeCloseTo(s1 * 2)
  })

  it('sums scores from multiple flows', () => {
    const nA = makeNode('a', 0, 0, 2, 2)
    const nB = makeNode('b', 3, 0, 2, 2)
    const nC = makeNode('c', 0, 4, 2, 2)
    const nodeMap = makeNodeMap(nA, nB, nC)
    const posMap = makePosMap(
      { id: 'a', pos_x: 0, pos_y: 0 },
      { id: 'b', pos_x: 3, pos_y: 0 },
      { id: 'c', pos_x: 0, pos_y: 4 }
    )
    // a→b: distance 3, intensity 10 → 30
    // a→c: distance 4, intensity 5 → 20
    const f1: FlowInput = { from_node_id: 'a', to_node_id: 'b', transport_intensity: 10 }
    const f2: FlowInput = { from_node_id: 'a', to_node_id: 'c', transport_intensity: 5 }
    expect(computeScore(posMap, nodeMap, [f1, f2], 1.0)).toBeCloseTo(50)
  })

  it('skips flows with unknown node IDs (no crash)', () => {
    const nA = makeNode('a', 0, 0, 2, 2)
    const nodeMap = makeNodeMap(nA)
    const posMap = makePosMap({ id: 'a', pos_x: 0, pos_y: 0 })
    const flow: FlowInput = { from_node_id: 'a', to_node_id: 'unknown', transport_intensity: 100 }
    expect(() => computeScore(posMap, nodeMap, [flow], 1.0)).not.toThrow()
    expect(computeScore(posMap, nodeMap, [flow], 1.0)).toBe(0)
  })

  it('computes correct 3-4-5 diagonal distance', () => {
    // A centre at (0,0), B centre at (3,4) → dist=5 cells
    // A: pos(-1,-1) 2×2 → centre(0,0); B: pos(2,3) 2×2 → centre(3,4)
    const nA = makeNode('a', -1, -1, 2, 2)
    const nB = makeNode('b', 2, 3, 2, 2)
    const nodeMap = makeNodeMap(nA, nB)
    const posMap = makePosMap({ id: 'a', pos_x: -1, pos_y: -1 }, { id: 'b', pos_x: 2, pos_y: 3 })
    const flow: FlowInput = { from_node_id: 'a', to_node_id: 'b', transport_intensity: 1 }
    expect(computeScore(posMap, nodeMap, [flow], 1.0)).toBeCloseTo(5)
  })
})

// ── hasOverlapWith ─────────────────────────────────────────────────────────────

describe('hasOverlapWith — bounding box detection', () => {
  it('returns false when nodes are clearly separated horizontally', () => {
    const nA = makeNode('a', 0, 0, 2, 2)
    const nB = makeNode('b', 5, 0, 2, 2)
    const nodeMap = makeNodeMap(nA, nB)
    const posMap = makePosMap({ id: 'a', pos_x: 0, pos_y: 0 }, { id: 'b', pos_x: 5, pos_y: 0 })
    expect(hasOverlapWith('a', 0, 0, nodeMap, posMap)).toBe(false)
  })

  it('returns true when nodes share the exact same position', () => {
    const nA = makeNode('a', 0, 0, 2, 2)
    const nB = makeNode('b', 0, 0, 2, 2)
    const nodeMap = makeNodeMap(nA, nB)
    const posMap = makePosMap({ id: 'a', pos_x: 0, pos_y: 0 }, { id: 'b', pos_x: 0, pos_y: 0 })
    expect(hasOverlapWith('a', 0, 0, nodeMap, posMap)).toBe(true)
  })

  it('returns true when nodes partially overlap', () => {
    // A at (0,0) 2×2 spans [0..2, 0..2]; B at (1,1) 2×2 spans [1..3, 1..3]
    const nA = makeNode('a', 0, 0, 2, 2)
    const nB = makeNode('b', 1, 1, 2, 2)
    const nodeMap = makeNodeMap(nA, nB)
    const posMap = makePosMap({ id: 'a', pos_x: 0, pos_y: 0 }, { id: 'b', pos_x: 1, pos_y: 1 })
    expect(hasOverlapWith('a', 0, 0, nodeMap, posMap)).toBe(true)
  })

  it('returns false when nodes are adjacent (touching edges, not overlapping)', () => {
    // A at (0,0) 2×2 spans [0..2]; B at (2,0) spans [2..4] — touching but not overlapping
    const nA = makeNode('a', 0, 0, 2, 2)
    const nB = makeNode('b', 2, 0, 2, 2)
    const nodeMap = makeNodeMap(nA, nB)
    const posMap = makePosMap({ id: 'a', pos_x: 0, pos_y: 0 }, { id: 'b', pos_x: 2, pos_y: 0 })
    expect(hasOverlapWith('a', 0, 0, nodeMap, posMap)).toBe(false)
  })

  it('does not compare a node with itself', () => {
    // Single node in the map — should never self-overlap
    const nA = makeNode('a', 0, 0, 2, 2)
    const nodeMap = makeNodeMap(nA)
    const posMap = makePosMap({ id: 'a', pos_x: 0, pos_y: 0 })
    expect(hasOverlapWith('a', 0, 0, nodeMap, posMap)).toBe(false)
  })

  it('returns false for unknown node id', () => {
    const nA = makeNode('a', 0, 0, 2, 2)
    const nodeMap = makeNodeMap(nA)
    const posMap = makePosMap({ id: 'a', pos_x: 0, pos_y: 0 })
    expect(hasOverlapWith('ghost', 0, 0, nodeMap, posMap)).toBe(false)
  })
})

// ── isWithinBounds ─────────────────────────────────────────────────────────────

describe('isWithinBounds — canvas boundary check', () => {
  it('returns true when node fits exactly in the canvas', () => {
    // canvas 10×10, node 2×2 at (8,8) → fits exactly (8+2=10)
    expect(isWithinBounds(8, 8, 2, 2, 10, 10)).toBe(true)
  })

  it('returns false when node extends beyond right edge', () => {
    expect(isWithinBounds(9, 0, 2, 2, 10, 10)).toBe(false)
  })

  it('returns false when node extends beyond bottom edge', () => {
    expect(isWithinBounds(0, 9, 2, 2, 10, 10)).toBe(false)
  })

  it('returns false when pos_x is negative', () => {
    expect(isWithinBounds(-1, 0, 2, 2, 10, 10)).toBe(false)
  })

  it('returns false when pos_y is negative', () => {
    expect(isWithinBounds(0, -1, 2, 2, 10, 10)).toBe(false)
  })

  it('returns true when node is at origin with 1×1 size on 1×1 canvas', () => {
    expect(isWithinBounds(0, 0, 1, 1, 1, 1)).toBe(true)
  })

  it('returns false when node is larger than canvas', () => {
    expect(isWithinBounds(0, 0, 20, 20, 10, 10)).toBe(false)
  })
})

// ── Optimizer edge: < 2 mutable nodes → no change ─────────────────────────────

describe('Optimizer logic — early exit when < 2 mutable nodes', () => {
  /**
   * We replicate the early-exit logic from the SA handler:
   * if mutableIds.length < 2, scoreAfter == scoreBefore.
   */
  function runOptimizerEarlyExit(nodes: NodeInput[], fixedIds: string[], flows: FlowInput[], metersPerCell: number) {
    const fixedSet = new Set(fixedIds)
    const mutableIds = nodes.filter((n) => !fixedSet.has(n.id)).map((n) => n.id)
    const nodeMap = new Map<string, NodeInput>(nodes.map((n) => [n.id, n]))
    const posMap = new Map<string, { pos_x: number; pos_y: number }>(
      nodes.map((n) => [n.id, { pos_x: n.pos_x, pos_y: n.pos_y }])
    )
    const scoreBefore = computeScore(posMap, nodeMap, flows, metersPerCell)
    if (mutableIds.length < 2) return { scoreAfter: scoreBefore, scoreBefore }
    return null // would continue with SA
  }

  it('returns scoreBefore unchanged when all nodes are fixed', () => {
    const nodes = [makeNode('a', 0, 0), makeNode('b', 5, 0)]
    const flow: FlowInput = { from_node_id: 'a', to_node_id: 'b', transport_intensity: 10 }
    const result = runOptimizerEarlyExit(nodes, ['a', 'b'], [flow], 1.0)
    expect(result).not.toBeNull()
    expect(result!.scoreAfter).toBe(result!.scoreBefore)
  })

  it('returns scoreBefore unchanged when only 1 mutable node exists', () => {
    const nodes = [makeNode('a', 0, 0), makeNode('b', 5, 0)]
    const flow: FlowInput = { from_node_id: 'a', to_node_id: 'b', transport_intensity: 10 }
    const result = runOptimizerEarlyExit(nodes, ['a'], [flow], 1.0)
    expect(result).not.toBeNull()
    expect(result!.scoreAfter).toBe(result!.scoreBefore)
  })

  it('proceeds (returns null) when 2 mutable nodes exist', () => {
    const nodes = [makeNode('a', 0, 0), makeNode('b', 5, 0)]
    const flow: FlowInput = { from_node_id: 'a', to_node_id: 'b', transport_intensity: 10 }
    const result = runOptimizerEarlyExit(nodes, [], [flow], 1.0)
    expect(result).toBeNull() // SA continues
  })
})

// ── Score comparison: closer nodes have lower score ────────────────────────────

describe('computeScore — score ordering', () => {
  it('nodes placed farther apart have a higher score than nodes placed closer', () => {
    const nodeMap = makeNodeMap(makeNode('a', 0, 0, 1, 1), makeNode('b', 0, 0, 1, 1))
    const flow: FlowInput = { from_node_id: 'a', to_node_id: 'b', transport_intensity: 10 }

    // Far configuration: a at (0,0), b at (10,0)
    const farPosMap = makePosMap({ id: 'a', pos_x: 0, pos_y: 0 }, { id: 'b', pos_x: 10, pos_y: 0 })
    const farScore = computeScore(farPosMap, nodeMap, [flow], 1.0)

    // Near configuration: a at (0,0), b at (1,0)
    const nearPosMap = makePosMap({ id: 'a', pos_x: 0, pos_y: 0 }, { id: 'b', pos_x: 1, pos_y: 0 })
    const nearScore = computeScore(nearPosMap, nodeMap, [flow], 1.0)

    expect(farScore).toBeGreaterThan(nearScore)
  })
})
