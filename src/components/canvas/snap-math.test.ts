/**
 * PROJ-14: Grid-Snap auf 0,5 m — Unit tests for snap position math
 *
 * These tests verify the two core formulas used in canvas-client.tsx:
 *   1. snapToGrid(px)  — maps raw pixel position to nearest SNAP_SIZE multiple
 *   2. pxToMeters(px)  — maps snapped pixel position to a 0.5m-aligned meter value
 *
 * Constants (mirrored from canvas-client.tsx):
 *   CELL_SIZE = 60  (1 m = 60 px)
 *   SNAP_SIZE = 30  (0.5 m = 30 px)
 */
import { describe, it, expect } from 'vitest'

const CELL_SIZE = 60
const SNAP_SIZE = CELL_SIZE / 2 // 30

/** Snap a raw pixel coordinate to the nearest SNAP_SIZE grid line */
function snapToGrid(px: number): number {
  return Math.round(px / SNAP_SIZE) * SNAP_SIZE
}

/** Convert a (already-snapped) pixel coordinate to a meter value with 0.5m precision */
function pxToMeters(px: number): number {
  return Math.round(px / SNAP_SIZE) * 0.5
}

// ---------------------------------------------------------------------------
// snapToGrid: maps raw pixels to nearest 30px boundary
// ---------------------------------------------------------------------------
describe('snapToGrid', () => {
  it('snaps 0 px → 0 px', () => {
    expect(snapToGrid(0)).toBe(0)
  })

  it('snaps 29 px → 30 px (rounds up at midpoint)', () => {
    expect(snapToGrid(29)).toBe(30)
  })

  it('snaps 30 px → 30 px (exact boundary)', () => {
    expect(snapToGrid(30)).toBe(30)
  })

  it('snaps 44 px → 30 px (below midpoint rounds down)', () => {
    expect(snapToGrid(44)).toBe(30)
  })

  it('snaps 45 px → 60 px (at midpoint rounds up)', () => {
    expect(snapToGrid(45)).toBe(60)
  })

  it('snaps 60 px → 60 px (1 m = 60 px, exact)', () => {
    expect(snapToGrid(60)).toBe(60)
  })

  it('snaps 90 px → 90 px (1.5 m exact)', () => {
    expect(snapToGrid(90)).toBe(90)
  })

  it('snaps 120 px → 120 px (2 m exact)', () => {
    expect(snapToGrid(120)).toBe(120)
  })

  it('snaps 210 px → 210 px (3.5 m exact)', () => {
    expect(snapToGrid(210)).toBe(210)
  })
})

// ---------------------------------------------------------------------------
// pxToMeters: converts snapped pixels to 0.5m-aligned meter values
// ---------------------------------------------------------------------------
describe('pxToMeters', () => {
  it('0 px → 0.0 m', () => {
    expect(pxToMeters(0)).toBe(0.0)
  })

  it('30 px → 0.5 m', () => {
    expect(pxToMeters(30)).toBe(0.5)
  })

  it('60 px → 1.0 m', () => {
    expect(pxToMeters(60)).toBe(1.0)
  })

  it('90 px → 1.5 m', () => {
    expect(pxToMeters(90)).toBe(1.5)
  })

  it('120 px → 2.0 m', () => {
    expect(pxToMeters(120)).toBe(2.0)
  })

  it('150 px → 2.5 m', () => {
    expect(pxToMeters(150)).toBe(2.5)
  })

  it('180 px → 3.0 m', () => {
    expect(pxToMeters(180)).toBe(3.0)
  })

  it('210 px → 3.5 m', () => {
    expect(pxToMeters(210)).toBe(3.5)
  })

  // Existing integer-meter positions remain valid (no drift)
  it('integer meter pos_x=3 (180 px) stays 3.0 m — no drift', () => {
    expect(pxToMeters(3 * CELL_SIZE)).toBe(3.0)
  })

  it('integer meter pos_x=5 (300 px) stays 5.0 m — no drift', () => {
    expect(pxToMeters(5 * CELL_SIZE)).toBe(5.0)
  })

  it('integer meter pos_x=10 (600 px) stays 10.0 m — no drift', () => {
    expect(pxToMeters(10 * CELL_SIZE)).toBe(10.0)
  })
})

// ---------------------------------------------------------------------------
// Round-trip: snapToGrid → pxToMeters always produces 0.5 m steps
// ---------------------------------------------------------------------------
describe('round-trip: snap then convert', () => {
  const testCases: Array<{ rawPx: number; expectedM: number }> = [
    { rawPx: 1, expectedM: 0.0 },   // rounds down to 0
    { rawPx: 14, expectedM: 0.0 },  // rounds down to 0
    { rawPx: 15, expectedM: 0.5 },  // rounds up to 30px
    { rawPx: 44, expectedM: 0.5 },  // rounds down to 30px
    { rawPx: 45, expectedM: 1.0 },  // rounds up to 60px
    { rawPx: 75, expectedM: 1.5 },  // rounds up to 90px
    { rawPx: 100, expectedM: 1.5 }, // rounds down to 90px (100→90)
    { rawPx: 105, expectedM: 2.0 }, // rounds to 120px (exactly at midpoint 105 rounds up)
  ]

  testCases.forEach(({ rawPx, expectedM }) => {
    it(`raw ${rawPx} px → snapped → ${expectedM} m`, () => {
      expect(pxToMeters(snapToGrid(rawPx))).toBe(expectedM)
    })
  })

  it('result is always a multiple of 0.5', () => {
    for (let px = 0; px <= 600; px++) {
      const meters = pxToMeters(snapToGrid(px))
      expect(meters * 2).toBe(Math.round(meters * 2))
    }
  })
})
