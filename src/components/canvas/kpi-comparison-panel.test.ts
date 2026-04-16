/**
 * Unit tests for KpiComparisonPanel best-value logic (PROJ-10)
 *
 * The comparison table highlights the best value per KPI row.
 * This module extracts and tests that selection logic in isolation.
 */

import { describe, it, expect } from 'vitest'
import type { VariantKpi } from '@/app/actions/canvas'

// ── Pure helpers mirroring the component logic ────────────────────────────────

type KpiKey = keyof Omit<VariantKpi, 'layoutId' | 'name'>

function getBestValue(values: number[], lowerIsBetter: boolean): number {
  return lowerIsBetter ? Math.min(...values) : Math.max(...values)
}

function isBest(val: number, values: number[], lowerIsBetter: boolean): boolean {
  const allSame = values.every((v) => v === values[0])
  if (allSame) return false
  return val === getBestValue(values, lowerIsBetter)
}

function getColumnValues(kpis: VariantKpi[], key: KpiKey): number[] {
  return kpis.map((k) => k[key])
}

// ── Test data helpers ─────────────────────────────────────────────────────────

function makeKpi(overrides: Partial<VariantKpi> = {}): VariantKpi {
  return {
    layoutId: crypto.randomUUID(),
    name: 'Variante',
    totalDistance: 100,
    totalCost: 10,
    totalTransports: 50,
    objectCount: 5,
    flowCount: 3,
    ...overrides,
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('KPI best-value highlighting — lowerIsBetter = true (Gesamtdistanz, Transportkosten)', () => {
  it('marks the variant with the lowest distance as best', () => {
    const kpis = [
      makeKpi({ layoutId: 'a', totalDistance: 300 }),
      makeKpi({ layoutId: 'b', totalDistance: 150 }),
      makeKpi({ layoutId: 'c', totalDistance: 200 }),
    ]
    const values = getColumnValues(kpis, 'totalDistance')
    expect(isBest(kpis[0].totalDistance, values, true)).toBe(false)
    expect(isBest(kpis[1].totalDistance, values, true)).toBe(true)
    expect(isBest(kpis[2].totalDistance, values, true)).toBe(false)
  })

  it('marks the variant with the lowest cost as best', () => {
    const kpis = [
      makeKpi({ totalCost: 50 }),
      makeKpi({ totalCost: 20 }),
    ]
    const values = getColumnValues(kpis, 'totalCost')
    expect(isBest(50, values, true)).toBe(false)
    expect(isBest(20, values, true)).toBe(true)
  })

  it('does not mark any variant as best when all values are equal', () => {
    const kpis = [
      makeKpi({ totalDistance: 100 }),
      makeKpi({ totalDistance: 100 }),
      makeKpi({ totalDistance: 100 }),
    ]
    const values = getColumnValues(kpis, 'totalDistance')
    values.forEach((v) => {
      expect(isBest(v, values, true)).toBe(false)
    })
  })

  it('handles single variant — nothing highlighted', () => {
    const kpis = [makeKpi({ totalDistance: 100 })]
    const values = getColumnValues(kpis, 'totalDistance')
    expect(isBest(100, values, true)).toBe(false)
  })

  it('handles zero values correctly — zero is best when lowerIsBetter', () => {
    const kpis = [
      makeKpi({ totalDistance: 0 }),
      makeKpi({ totalDistance: 50 }),
    ]
    const values = getColumnValues(kpis, 'totalDistance')
    expect(isBest(0, values, true)).toBe(true)
    expect(isBest(50, values, true)).toBe(false)
  })
})

describe('KPI best-value highlighting — lowerIsBetter = false (Stationen, Materialflüsse)', () => {
  it('marks the variant with the most objects as best', () => {
    const kpis = [
      makeKpi({ objectCount: 3 }),
      makeKpi({ objectCount: 10 }),
      makeKpi({ objectCount: 7 }),
    ]
    const values = getColumnValues(kpis, 'objectCount')
    expect(isBest(3, values, false)).toBe(false)
    expect(isBest(10, values, false)).toBe(true)
    expect(isBest(7, values, false)).toBe(false)
  })

  it('marks the variant with the most flows as best', () => {
    const kpis = [
      makeKpi({ flowCount: 5 }),
      makeKpi({ flowCount: 5 }),
      makeKpi({ flowCount: 12 }),
    ]
    const values = getColumnValues(kpis, 'flowCount')
    expect(isBest(5, values, false)).toBe(false)
    expect(isBest(12, values, false)).toBe(true)
  })

  it('does not highlight any row when all values are equal (lowerIsBetter=false)', () => {
    const kpis = [makeKpi({ objectCount: 5 }), makeKpi({ objectCount: 5 })]
    const values = getColumnValues(kpis, 'objectCount')
    expect(isBest(5, values, false)).toBe(false)
  })
})

describe('getColumnValues — extracts correct KPI column', () => {
  it('extracts totalDistance from all variants', () => {
    const kpis = [makeKpi({ totalDistance: 10 }), makeKpi({ totalDistance: 20 })]
    expect(getColumnValues(kpis, 'totalDistance')).toEqual([10, 20])
  })

  it('extracts totalCost from all variants', () => {
    const kpis = [makeKpi({ totalCost: 1.5 }), makeKpi({ totalCost: 3.0 })]
    expect(getColumnValues(kpis, 'totalCost')).toEqual([1.5, 3.0])
  })

  it('returns empty array for empty kpis list', () => {
    expect(getColumnValues([], 'totalDistance')).toEqual([])
  })
})

describe('getBestValue — returns correct extremum', () => {
  it('returns minimum when lowerIsBetter=true', () => {
    expect(getBestValue([100, 50, 75], true)).toBe(50)
  })

  it('returns maximum when lowerIsBetter=false', () => {
    expect(getBestValue([3, 10, 7], false)).toBe(10)
  })

  it('handles single value', () => {
    expect(getBestValue([42], true)).toBe(42)
    expect(getBestValue([42], false)).toBe(42)
  })
})
