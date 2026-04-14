import { describe, it, expect } from 'vitest'
import { getLineColor, getLineWidth } from './spaghetti-overlay'

/**
 * PROJ-7: Materialfluss-Visualisierung — Unit Tests
 *
 * Tests the pure utility functions that drive color and stroke-width
 * of spaghetti diagram lines. These functions contain no side effects
 * and are fully isolated from React and Supabase.
 */

// ── getLineColor ──────────────────────────────────────────────────────────────

describe('getLineColor', () => {
  it('returns green when maxIntensity is 0 (no flows)', () => {
    expect(getLineColor(0, 0)).toBe('#22c55e')
  })

  it('returns green for intensity below 33% of max', () => {
    // 10 / 100 = 10% → green
    expect(getLineColor(10, 100)).toBe('#22c55e')
  })

  it('returns green for intensity exactly at 32% of max (boundary before orange)', () => {
    expect(getLineColor(32, 100)).toBe('#22c55e')
  })

  it('returns orange for intensity at exactly 33% of max (lower orange boundary)', () => {
    expect(getLineColor(33, 100)).toBe('#f97316')
  })

  it('returns orange for intensity at 50% of max (mid range)', () => {
    expect(getLineColor(50, 100)).toBe('#f97316')
  })

  it('returns orange for intensity just below 66% of max', () => {
    expect(getLineColor(65, 100)).toBe('#f97316')
  })

  it('returns red for intensity at exactly 66% of max (lower red boundary)', () => {
    expect(getLineColor(66, 100)).toBe('#ef4444')
  })

  it('returns red for intensity at 100% of max', () => {
    expect(getLineColor(100, 100)).toBe('#ef4444')
  })

  it('returns red for intensity greater than max (defensive: pct > 1)', () => {
    expect(getLineColor(150, 100)).toBe('#ef4444')
  })

  it('uses correct color hex values per spec: green=#22c55e, orange=#f97316, red=#ef4444', () => {
    expect(getLineColor(10, 100)).toBe('#22c55e')
    expect(getLineColor(50, 100)).toBe('#f97316')
    expect(getLineColor(80, 100)).toBe('#ef4444')
  })

  // KNOWN BUG (Medium): When all flows have the same intensity, pct = 1.0 → red.
  // Spec edge case says: "Alle Linien haben gleiche Dicke und Farbe (grün)".
  // Document the current (incorrect) behavior so a fix can be verified later.
  it('BUG: all-same-intensity flows show as RED (pct=1.0) instead of GREEN per spec', () => {
    const intensity = 200
    const maxIntensity = 200 // all flows have same intensity
    // Current behavior: pct = 1.0 → red (violates spec edge case)
    expect(getLineColor(intensity, maxIntensity)).toBe('#ef4444')
    // Expected behavior per spec: '#22c55e' (green) — not implemented yet
  })
})

// ── getLineWidth ──────────────────────────────────────────────────────────────

describe('getLineWidth', () => {
  it('returns 2 (minimum) when maxIntensity is 0', () => {
    expect(getLineWidth(0, 0)).toBe(2)
  })

  it('returns minimum width (2px) for intensity at 0% of max', () => {
    expect(getLineWidth(0, 100)).toBe(2)
  })

  it('returns maximum width (12px) for intensity at 100% of max', () => {
    // 2 + 1.0 * 10 = 12
    expect(getLineWidth(100, 100)).toBe(12)
  })

  it('returns 7px for intensity at 50% of max (midpoint)', () => {
    // 2 + 0.5 * 10 = 7
    expect(getLineWidth(50, 100)).toBe(7)
  })

  it('scales linearly between 2px and 12px', () => {
    const max = 1000
    for (const intensity of [0, 250, 500, 750, 1000]) {
      const pct = intensity / max
      const expected = 2 + pct * 10
      expect(getLineWidth(intensity, max)).toBeCloseTo(expected)
    }
  })

  it('min width is 2px per spec', () => {
    expect(getLineWidth(0, 100)).toBeGreaterThanOrEqual(2)
  })

  it('max width is 12px per spec', () => {
    expect(getLineWidth(100, 100)).toBeLessThanOrEqual(12)
  })
})

// ── Parallel offset logic (replicated inline) ──────────────────────────────────

/**
 * The parallel offset for multiple flows between the same node pair is
 * computed inline in SpaghettiOverlay. We test the formula independently.
 */
function computeOffset(
  groupIndex: number,
  groupCount: number,
  perpX: number,
  perpY: number,
  STEP = 6
): { offsetX: number; offsetY: number } {
  const offsetAmount = (groupIndex - (groupCount - 1) / 2) * STEP
  return {
    offsetX: perpX * offsetAmount,
    offsetY: perpY * offsetAmount,
  }
}

describe('parallel offset formula', () => {
  it('single flow in group has zero offset', () => {
    const { offsetX, offsetY } = computeOffset(0, 1, 1, 0)
    expect(offsetX).toBe(0)
    expect(offsetY).toBe(0)
  })

  it('two flows in group have symmetric ±3px offsets', () => {
    const first = computeOffset(0, 2, 1, 0)
    const second = computeOffset(1, 2, 1, 0)
    // groupIndex 0: (0 - 0.5) * 6 = -3; groupIndex 1: (1 - 0.5) * 6 = +3
    expect(first.offsetX).toBeCloseTo(-3)
    expect(second.offsetX).toBeCloseTo(3)
    expect(first.offsetX + second.offsetX).toBeCloseTo(0) // symmetric
  })

  it('three flows are centered: -6, 0, +6', () => {
    const offsets = [0, 1, 2].map((i) => computeOffset(i, 3, 1, 0).offsetX)
    expect(offsets[0]).toBeCloseTo(-6)
    expect(offsets[1]).toBeCloseTo(0)
    expect(offsets[2]).toBeCloseTo(6)
  })

  it('offset direction follows perpendicular vector', () => {
    // Perpendicular vector pointing down (perpY = 1, perpX = 0)
    const { offsetX, offsetY } = computeOffset(0, 2, 0, 1)
    expect(offsetX).toBeCloseTo(0)
    expect(offsetY).toBeCloseTo(-3)
  })
})
