import { describe, it, expect } from 'vitest'

/**
 * PROJ-6: Materialfluss-Definition — Unit Tests
 *
 * Tests pure validation logic mirrored from material-flows.ts and
 * flow-form-dialog.tsx. Server actions require Supabase and cannot be
 * executed without a live connection; the logic is tested in isolation.
 */

// ── Transport intensity calculation ──────────────────────────────────────────

function computeIntensity(quantity: number, frequency: number): number {
  return quantity * frequency
}

describe('computeIntensity', () => {
  it('multiplies quantity by frequency', () => {
    expect(computeIntensity(50, 8)).toBe(400)
  })

  it('returns 0 when quantity is 0', () => {
    expect(computeIntensity(0, 10)).toBe(0)
  })

  it('handles decimal values', () => {
    expect(computeIntensity(2.5, 4)).toBeCloseTo(10)
  })

  it('handles large values without overflow', () => {
    expect(computeIntensity(1_000_000, 365)).toBe(365_000_000)
  })
})

// ── Self-flow validation ──────────────────────────────────────────────────────

function isSelfFlow(fromNodeId: string, toNodeId: string): boolean {
  return fromNodeId === toNodeId
}

describe('isSelfFlow', () => {
  it('returns true when from and to are identical', () => {
    const id = 'node-abc'
    expect(isSelfFlow(id, id)).toBe(true)
  })

  it('returns false when from and to differ', () => {
    expect(isSelfFlow('node-a', 'node-b')).toBe(false)
  })

  it('returns false for empty strings that differ', () => {
    expect(isSelfFlow('', 'node-b')).toBe(false)
  })
})

// ── Duplicate flow detection (from FlowFormDialog) ────────────────────────────

type FlowEntry = { id: string; from_node_id: string; to_node_id: string }

function isDuplicateFlow(
  from: string,
  to: string,
  existingFlows: FlowEntry[],
  currentEditId?: string
): boolean {
  return existingFlows.some(
    (f) => f.from_node_id === from && f.to_node_id === to && f.id !== currentEditId
  )
}

describe('isDuplicateFlow', () => {
  const flows: FlowEntry[] = [
    { id: 'f1', from_node_id: 'A', to_node_id: 'B' },
    { id: 'f2', from_node_id: 'B', to_node_id: 'C' },
  ]

  it('detects an exact duplicate (same from+to)', () => {
    expect(isDuplicateFlow('A', 'B', flows)).toBe(true)
  })

  it('returns false for a new non-duplicate flow', () => {
    expect(isDuplicateFlow('A', 'C', flows)).toBe(false)
  })

  it('returns false for the reverse direction (bidirectional flows are allowed)', () => {
    expect(isDuplicateFlow('B', 'A', flows)).toBe(false)
  })

  it('excludes the flow being edited from the duplicate check', () => {
    // Editing f1 (A→B) with the same values should not flag itself as duplicate
    expect(isDuplicateFlow('A', 'B', flows, 'f1')).toBe(false)
  })

  it('still detects a duplicate when editing a different flow', () => {
    // Editing f2 but trying to set it to A→B (which already exists as f1)
    expect(isDuplicateFlow('A', 'B', flows, 'f2')).toBe(true)
  })

  it('returns false when no existing flows', () => {
    expect(isDuplicateFlow('A', 'B', [])).toBe(false)
  })
})

// ── Form validation rules ─────────────────────────────────────────────────────

function validateFlowForm(values: {
  from_node_id: string
  to_node_id: string
  quantity: string
  frequency: string
}): string | null {
  if (!values.from_node_id) return 'Bitte "Von"-Station auswählen'
  if (!values.to_node_id) return 'Bitte "Nach"-Station auswählen'
  if (values.from_node_id === values.to_node_id) return 'Von und Nach dürfen nicht identisch sein'
  const qty = parseFloat(values.quantity)
  if (!values.quantity || isNaN(qty) || qty <= 0) return 'Menge muss eine Zahl größer als 0 sein'
  const freq = parseFloat(values.frequency)
  if (!values.frequency || isNaN(freq) || freq <= 0) return 'Transporte/Tag muss eine Zahl größer als 0 sein'
  return null
}

describe('validateFlowForm', () => {
  const valid = { from_node_id: 'A', to_node_id: 'B', quantity: '50', frequency: '8' }

  it('returns null for a fully valid form', () => {
    expect(validateFlowForm(valid)).toBeNull()
  })

  it('errors when Von is empty', () => {
    expect(validateFlowForm({ ...valid, from_node_id: '' })).toMatch(/Von.*Station/)
  })

  it('errors when Nach is empty', () => {
    expect(validateFlowForm({ ...valid, to_node_id: '' })).toMatch(/Nach.*Station/)
  })

  it('errors when Von equals Nach (self-flow)', () => {
    expect(validateFlowForm({ ...valid, to_node_id: 'A' })).toMatch(/identisch/)
  })

  it('errors when quantity is zero', () => {
    expect(validateFlowForm({ ...valid, quantity: '0' })).toMatch(/Menge/)
  })

  it('errors when quantity is negative', () => {
    expect(validateFlowForm({ ...valid, quantity: '-5' })).toMatch(/Menge/)
  })

  it('errors when quantity is non-numeric', () => {
    expect(validateFlowForm({ ...valid, quantity: 'abc' })).toMatch(/Menge/)
  })

  it('errors when frequency is zero', () => {
    expect(validateFlowForm({ ...valid, frequency: '0' })).toMatch(/Transporte/)
  })

  it('errors when frequency is negative', () => {
    expect(validateFlowForm({ ...valid, frequency: '-1' })).toMatch(/Transporte/)
  })

  it('accepts decimal quantity and frequency', () => {
    expect(validateFlowForm({ ...valid, quantity: '0.5', frequency: '2.5' })).toBeNull()
  })
})

// ── nachOptions filter (Nach dropdown excludes current Von) ──────────────────

type Station = { id: string; label: string }

function getNachOptions(stations: Station[], currentFromId: string): Station[] {
  return stations.filter((s) => s.id !== currentFromId)
}

describe('getNachOptions', () => {
  const stations: Station[] = [
    { id: 'A', label: 'Station A' },
    { id: 'B', label: 'Station B' },
    { id: 'C', label: 'Station C' },
  ]

  it('excludes the Von station from Nach options', () => {
    const options = getNachOptions(stations, 'A')
    expect(options.map((s) => s.id)).toEqual(['B', 'C'])
  })

  it('returns all stations when Von is empty', () => {
    const options = getNachOptions(stations, '')
    expect(options).toHaveLength(3)
  })

  it('returns empty array when only one station and it is selected as Von', () => {
    const single = [{ id: 'A', label: 'Station A' }]
    const options = getNachOptions(single, 'A')
    expect(options).toHaveLength(0)
  })
})
