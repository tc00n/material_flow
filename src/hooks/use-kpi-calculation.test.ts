import { describe, it, expect } from 'vitest'

/**
 * PROJ-8: Kennzahlen-Berechnung — Unit Tests
 *
 * Tests the KPI calculation logic that powers useKpiCalculation.
 * The hook wraps this logic in useMemo; we test the math directly
 * by replicating the formula (same approach as spaghetti-overlay.test.ts).
 */

// ── Replicated calculation logic (mirrors use-kpi-calculation.ts) ──────────────

const CELL_SIZE = 60

interface MockNode {
  id: string
  position: { x: number; y: number }
  data: { widthUnits: number; heightUnits: number }
}

interface MockFlow {
  id: string
  from_node_id: string
  to_node_id: string
  transport_intensity: number
  frequency: number
  from_label: string
  to_label: string
}

interface KpiResult {
  totalDistance: number
  totalCost: number
  totalTransports: number
  top3Flows: Array<{
    id: string
    fromLabel: string
    toLabel: string
    intensity: number
    distanceM: number
  }>
}

function computeKpi(
  nodes: MockNode[],
  flows: MockFlow[],
  costPerMeter: number,
  metersPerCell: number
): KpiResult {
  if (flows.length === 0) {
    return { totalDistance: 0, totalCost: 0, totalTransports: 0, top3Flows: [] }
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  let totalDistance = 0
  let totalTransports = 0

  const flowsWithDistance = flows.map((f) => {
    const fromNode = nodeMap.get(f.from_node_id)
    const toNode = nodeMap.get(f.to_node_id)

    if (!fromNode || !toNode) {
      return { flow: f, distanceM: 0 }
    }

    const fromCX = fromNode.position.x / CELL_SIZE + fromNode.data.widthUnits / 2
    const fromCY = fromNode.position.y / CELL_SIZE + fromNode.data.heightUnits / 2
    const toCX = toNode.position.x / CELL_SIZE + toNode.data.widthUnits / 2
    const toCY = toNode.position.y / CELL_SIZE + toNode.data.heightUnits / 2

    const dx = toCX - fromCX
    const dy = toCY - fromCY
    const distCells = Math.sqrt(dx * dx + dy * dy)
    const distanceM = distCells * metersPerCell

    return { flow: f, distanceM }
  })

  flowsWithDistance.forEach(({ flow, distanceM }) => {
    totalDistance += flow.transport_intensity * distanceM
    totalTransports += flow.frequency
  })

  const top3Flows = [...flowsWithDistance]
    .sort((a, b) => b.flow.transport_intensity - a.flow.transport_intensity)
    .slice(0, 3)
    .map(({ flow, distanceM }) => ({
      id: flow.id,
      fromLabel: flow.from_label,
      toLabel: flow.to_label,
      intensity: flow.transport_intensity,
      distanceM,
    }))

  return {
    totalDistance,
    totalCost: totalDistance * costPerMeter,
    totalTransports,
    top3Flows,
  }
}

// ── Test fixtures ──────────────────────────────────────────────────────────────

function makeNode(id: string, gridX: number, gridY: number, w = 2, h = 2): MockNode {
  return {
    id,
    position: { x: gridX * CELL_SIZE, y: gridY * CELL_SIZE },
    data: { widthUnits: w, heightUnits: h },
  }
}

function makeFlow(
  id: string,
  from: string,
  to: string,
  intensity: number,
  frequency: number,
  fromLabel = 'A',
  toLabel = 'B'
): MockFlow {
  return { id, from_node_id: from, to_node_id: to, transport_intensity: intensity, frequency, from_label: fromLabel, to_label: toLabel }
}

// ── Empty state ────────────────────────────────────────────────────────────────

describe('computeKpi — empty state', () => {
  it('returns all zeros and empty top3 when no flows', () => {
    const result = computeKpi([], [], 0.5, 1.0)
    expect(result.totalDistance).toBe(0)
    expect(result.totalCost).toBe(0)
    expect(result.totalTransports).toBe(0)
    expect(result.top3Flows).toHaveLength(0)
  })

  it('returns all zeros when flows array is empty, even with nodes present', () => {
    const nodes = [makeNode('n1', 0, 0), makeNode('n2', 5, 0)]
    const result = computeKpi(nodes, [], 0.5, 1.0)
    expect(result.totalDistance).toBe(0)
    expect(result.totalCost).toBe(0)
    expect(result.totalTransports).toBe(0)
  })
})

// ── Distance calculation ───────────────────────────────────────────────────────

describe('computeKpi — euclidean distance', () => {
  it('computes correct distance for horizontal neighbours (1 cell apart, 1m/cell)', () => {
    // node A at grid (0,0) with 2×2 → centre at (1, 1)
    // node B at grid (3,0) with 2×2 → centre at (4, 1)
    // dx = 3, dy = 0 → dist = 3 cells × 1m = 3m
    const nodes = [makeNode('a', 0, 0, 2, 2), makeNode('b', 3, 0, 2, 2)]
    const flow = makeFlow('f1', 'a', 'b', 1, 1)
    const result = computeKpi(nodes, [flow], 0, 1.0)
    expect(result.totalDistance).toBeCloseTo(3)
  })

  it('computes correct distance for diagonal neighbours (3-4-5 triangle)', () => {
    // node A centre at (0,0) grid, node B centre at (3,4) grid → dist = 5 cells
    // A: pos (−1,−1)*CELL_SIZE, widthUnits=2, heightUnits=2 → centre (0,0)
    // B: pos (2,3)*CELL_SIZE, widthUnits=2, heightUnits=2 → centre (3,4)
    const a = makeNode('a', -1, -1, 2, 2)
    const b = makeNode('b', 2, 3, 2, 2)
    const flow = makeFlow('f1', 'a', 'b', 1, 1)
    const result = computeKpi([a, b], [flow], 0, 1.0)
    expect(result.totalDistance).toBeCloseTo(5)
  })

  it('distance scales linearly with metersPerCell', () => {
    const nodes = [makeNode('a', 0, 0, 2, 2), makeNode('b', 3, 0, 2, 2)]
    const flow = makeFlow('f1', 'a', 'b', 1, 1)
    const result1m = computeKpi(nodes, [flow], 0, 1.0)
    const result2m = computeKpi(nodes, [flow], 0, 2.0)
    expect(result2m.totalDistance).toBeCloseTo(result1m.totalDistance * 2)
  })
})

// ── Edge case: overlapping nodes ───────────────────────────────────────────────

describe('computeKpi — overlapping nodes (distance = 0)', () => {
  it('distance is 0 when from and to node are at the same position', () => {
    const nodes = [makeNode('a', 0, 0, 2, 2), makeNode('b', 0, 0, 2, 2)]
    const flow = makeFlow('f1', 'a', 'b', 100, 10)
    const result = computeKpi(nodes, [flow], 0.5, 1.0)
    expect(result.totalDistance).toBe(0)
    expect(result.totalCost).toBe(0)
    // No crash — totalTransports still counts frequency
    expect(result.totalTransports).toBe(10)
  })

  it('does not crash and returns distanceM=0 for same-position nodes', () => {
    const nodes = [makeNode('x', 5, 5, 3, 3), makeNode('y', 5, 5, 3, 3)]
    const flow = makeFlow('f1', 'x', 'y', 50, 5)
    expect(() => computeKpi(nodes, [flow], 0.5, 1.0)).not.toThrow()
  })
})

// ── Edge case: missing nodes ───────────────────────────────────────────────────

describe('computeKpi — missing node references', () => {
  it('treats a flow with unknown from_node_id as distanceM = 0, no crash', () => {
    const nodes = [makeNode('b', 3, 0, 2, 2)]
    const flow = makeFlow('f1', 'unknown', 'b', 10, 5)
    const result = computeKpi(nodes, [flow], 0.5, 1.0)
    expect(result.totalDistance).toBe(0)
    expect(result.totalTransports).toBe(5)
  })
})

// ── totalDistance ──────────────────────────────────────────────────────────────

describe('computeKpi — totalDistance', () => {
  it('totalDistance = intensity × distance for a single flow', () => {
    // 3 cells apart × 1m/cell × intensity 10 = 30m
    const nodes = [makeNode('a', 0, 0, 2, 2), makeNode('b', 3, 0, 2, 2)]
    const flow = makeFlow('f1', 'a', 'b', 10, 1)
    const result = computeKpi(nodes, [flow], 0, 1.0)
    expect(result.totalDistance).toBeCloseTo(30)
  })

  it('totalDistance sums across multiple flows', () => {
    const nodes = [makeNode('a', 0, 0, 2, 2), makeNode('b', 3, 0, 2, 2), makeNode('c', 0, 3, 2, 2)]
    const f1 = makeFlow('f1', 'a', 'b', 10, 1)  // 3m × 10 = 30
    const f2 = makeFlow('f2', 'a', 'c', 5, 1)   // 3m × 5 = 15 (dy=3)
    const result = computeKpi(nodes, [f1, f2], 0, 1.0)
    expect(result.totalDistance).toBeCloseTo(45)
  })
})

// ── totalCost ──────────────────────────────────────────────────────────────────

describe('computeKpi — totalCost', () => {
  it('totalCost = totalDistance × costPerMeter', () => {
    const nodes = [makeNode('a', 0, 0, 2, 2), makeNode('b', 3, 0, 2, 2)]
    const flow = makeFlow('f1', 'a', 'b', 10, 1)  // totalDistance = 30
    const result = computeKpi(nodes, [flow], 0.5, 1.0)
    expect(result.totalCost).toBeCloseTo(15)  // 30 × 0.5
  })

  it('totalCost is 0 when costPerMeter is 0 (no error)', () => {
    const nodes = [makeNode('a', 0, 0, 2, 2), makeNode('b', 3, 0, 2, 2)]
    const flow = makeFlow('f1', 'a', 'b', 10, 5)
    const result = computeKpi(nodes, [flow], 0, 1.0)
    expect(result.totalCost).toBe(0)
    expect(result.totalTransports).toBe(5)
  })
})

// ── totalTransports ────────────────────────────────────────────────────────────

describe('computeKpi — totalTransports', () => {
  it('sums frequency across all flows', () => {
    const nodes = [makeNode('a', 0, 0), makeNode('b', 5, 0)]
    const flows = [
      makeFlow('f1', 'a', 'b', 10, 20),
      makeFlow('f2', 'b', 'a', 5, 30),
    ]
    const result = computeKpi(nodes, flows, 0.5, 1.0)
    expect(result.totalTransports).toBe(50)
  })
})

// ── top3Flows ──────────────────────────────────────────────────────────────────

describe('computeKpi — top3Flows', () => {
  it('returns at most 3 flows sorted by transport_intensity descending', () => {
    const nodes = [makeNode('a', 0, 0), makeNode('b', 5, 0)]
    const flows = [
      makeFlow('f1', 'a', 'b', 10, 1, 'Low', 'B'),
      makeFlow('f2', 'a', 'b', 50, 1, 'High', 'B'),
      makeFlow('f3', 'a', 'b', 30, 1, 'Mid', 'B'),
      makeFlow('f4', 'a', 'b', 80, 1, 'VeryHigh', 'B'),
    ]
    const result = computeKpi(nodes, flows, 0, 1.0)
    expect(result.top3Flows).toHaveLength(3)
    expect(result.top3Flows[0].intensity).toBe(80)
    expect(result.top3Flows[1].intensity).toBe(50)
    expect(result.top3Flows[2].intensity).toBe(30)
    // f1 (intensity=10) excluded
    expect(result.top3Flows.find((f) => f.intensity === 10)).toBeUndefined()
  })

  it('returns all flows when there are fewer than 3', () => {
    const nodes = [makeNode('a', 0, 0), makeNode('b', 5, 0)]
    const flows = [
      makeFlow('f1', 'a', 'b', 10, 1),
      makeFlow('f2', 'a', 'b', 50, 1),
    ]
    const result = computeKpi(nodes, flows, 0, 1.0)
    expect(result.top3Flows).toHaveLength(2)
  })

  it('top3 flows include correct fromLabel and toLabel', () => {
    const nodes = [makeNode('a', 0, 0), makeNode('b', 5, 0)]
    const flow = makeFlow('f1', 'a', 'b', 100, 1, 'Werkzeugmaschine', 'Montage')
    const result = computeKpi(nodes, [flow], 0, 1.0)
    expect(result.top3Flows[0].fromLabel).toBe('Werkzeugmaschine')
    expect(result.top3Flows[0].toLabel).toBe('Montage')
  })
})
