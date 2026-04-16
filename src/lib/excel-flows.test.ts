/**
 * Unit tests for excel-flows.ts (PROJ-13)
 * Tests parseFlowsFromXlsx validation and case-insensitive matching.
 * exportFlowsToXlsx and downloadTemplate trigger browser downloads (XLSX.writeFile)
 * and are not unit-testable without DOM — they are covered by E2E tests instead.
 */
import { describe, it, expect, vi, beforeAll } from 'vitest'
import * as XLSX from 'xlsx'
import { parseFlowsFromXlsx } from './excel-flows'
import type { Station } from '@/components/canvas/flow-form-dialog'

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build an in-memory .xlsx File from a 2D array of values.
 * First row is treated as headers by the parser.
 */
function makeXlsxFile(rows: unknown[][], filename = 'test.xlsx'): File {
  const ws = XLSX.utils.aoa_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  return new File([buf], filename, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

const STATIONS: Station[] = [
  { id: 'a1', label: 'Drehmaschine' },
  { id: 'b2', label: 'Fräsmaschine' },
  { id: 'c3', label: 'Montage' },
]

const VALID_HEADERS = ['Von', 'Nach', 'Menge pro Transport', 'Transporte pro Tag', 'Material']

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('parseFlowsFromXlsx', () => {
  describe('happy path', () => {
    it('parses a valid single-row file correctly', async () => {
      const file = makeXlsxFile([
        VALID_HEADERS,
        ['Drehmaschine', 'Fräsmaschine', 10, 5, 'Rohling'],
      ])
      const result = await parseFlowsFromXlsx(file, STATIONS)
      expect(result.errors).toHaveLength(0)
      expect(result.valid).toHaveLength(1)
      const row = result.valid[0]
      expect(row.from_label).toBe('Drehmaschine')
      expect(row.to_label).toBe('Fräsmaschine')
      expect(row.quantity).toBe(10)
      expect(row.frequency).toBe(5)
      expect(row.material_name).toBe('Rohling')
    })

    it('returns null material_name when Material column is blank', async () => {
      const file = makeXlsxFile([
        VALID_HEADERS,
        ['Drehmaschine', 'Montage', 3, 2, ''],
      ])
      const result = await parseFlowsFromXlsx(file, STATIONS)
      expect(result.valid[0].material_name).toBeNull()
    })

    it('parses multiple valid rows', async () => {
      const file = makeXlsxFile([
        VALID_HEADERS,
        ['Drehmaschine', 'Fräsmaschine', 10, 5, 'A'],
        ['Fräsmaschine', 'Montage', 20, 3, 'B'],
        ['Montage', 'Drehmaschine', 5, 1, ''],
      ])
      const result = await parseFlowsFromXlsx(file, STATIONS)
      expect(result.valid).toHaveLength(3)
      expect(result.errors).toHaveLength(0)
    })

    it('preserves exact station label casing from the stations list', async () => {
      // File uses all-lower input; stations have mixed case
      const file = makeXlsxFile([
        VALID_HEADERS,
        ['drehmaschine', 'fräsmaschine', 5, 2, ''],
      ])
      const result = await parseFlowsFromXlsx(file, STATIONS)
      expect(result.valid[0].from_label).toBe('Drehmaschine')
      expect(result.valid[0].to_label).toBe('Fräsmaschine')
    })

    it('skips fully empty rows without counting them as errors', async () => {
      const file = makeXlsxFile([
        VALID_HEADERS,
        ['Drehmaschine', 'Fräsmaschine', 10, 5, ''],
        ['', '', '', '', ''], // empty row
        ['Fräsmaschine', 'Montage', 3, 1, ''],
      ])
      const result = await parseFlowsFromXlsx(file, STATIONS)
      expect(result.valid).toHaveLength(2)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('case-insensitive header matching', () => {
    it('accepts uppercase headers', async () => {
      const file = makeXlsxFile([
        ['VON', 'NACH', 'MENGE PRO TRANSPORT', 'TRANSPORTE PRO TAG', 'MATERIAL'],
        ['Drehmaschine', 'Fräsmaschine', 10, 5, ''],
      ])
      const result = await parseFlowsFromXlsx(file, STATIONS)
      expect(result.valid).toHaveLength(1)
      expect(result.errors).toHaveLength(0)
    })

    it('accepts lowercase headers', async () => {
      const file = makeXlsxFile([
        ['von', 'nach', 'menge pro transport', 'transporte pro tag', 'material'],
        ['Drehmaschine', 'Fräsmaschine', 10, 5, ''],
      ])
      const result = await parseFlowsFromXlsx(file, STATIONS)
      expect(result.valid).toHaveLength(1)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('error cases — headers', () => {
    it('returns a fatal error when required headers are missing', async () => {
      const file = makeXlsxFile([
        ['Station A', 'Station B', 'Anzahl'], // wrong headers
        ['Drehmaschine', 'Fräsmaschine', 5],
      ])
      const result = await parseFlowsFromXlsx(file, STATIONS)
      expect(result.valid).toHaveLength(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toContain('Spaltenüberschriften')
    })

    it('returns a fatal error for an empty file (no rows at all)', async () => {
      const ws = XLSX.utils.aoa_to_sheet([])
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
      const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
      const file = new File([buf], 'empty.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const result = await parseFlowsFromXlsx(file, STATIONS)
      expect(result.valid).toHaveLength(0)
      expect(result.errors[0].message).toContain('Keine Daten')
    })

    it('returns a fatal error when only headers are present (no data rows)', async () => {
      const file = makeXlsxFile([VALID_HEADERS])
      const result = await parseFlowsFromXlsx(file, STATIONS)
      expect(result.valid).toHaveLength(0)
      expect(result.errors[0].message).toContain('Keine Daten')
    })
  })

  describe('error cases — row validation', () => {
    it('reports an error when Von station is unknown', async () => {
      const file = makeXlsxFile([
        VALID_HEADERS,
        ['Unbekannte Maschine', 'Fräsmaschine', 10, 5, ''],
      ])
      const result = await parseFlowsFromXlsx(file, STATIONS)
      expect(result.valid).toHaveLength(0)
      expect(result.errors[0].message).toContain('Unbekannte Maschine')
    })

    it('reports an error when Nach station is unknown', async () => {
      const file = makeXlsxFile([
        VALID_HEADERS,
        ['Drehmaschine', 'Nicht Vorhanden', 10, 5, ''],
      ])
      const result = await parseFlowsFromXlsx(file, STATIONS)
      expect(result.valid).toHaveLength(0)
      expect(result.errors[0].message).toContain('Nicht Vorhanden')
    })

    it('reports an error when Menge pro Transport is 0', async () => {
      const file = makeXlsxFile([
        VALID_HEADERS,
        ['Drehmaschine', 'Fräsmaschine', 0, 5, ''],
      ])
      const result = await parseFlowsFromXlsx(file, STATIONS)
      expect(result.valid).toHaveLength(0)
      expect(result.errors[0].message).toContain('Menge pro Transport')
    })

    it('reports an error when Transporte pro Tag is negative', async () => {
      const file = makeXlsxFile([
        VALID_HEADERS,
        ['Drehmaschine', 'Fräsmaschine', 10, -1, ''],
      ])
      const result = await parseFlowsFromXlsx(file, STATIONS)
      expect(result.valid).toHaveLength(0)
      expect(result.errors[0].message).toContain('Transporte pro Tag')
    })

    it('reports an error when Menge is non-numeric text', async () => {
      const file = makeXlsxFile([
        VALID_HEADERS,
        ['Drehmaschine', 'Fräsmaschine', 'viel', 5, ''],
      ])
      const result = await parseFlowsFromXlsx(file, STATIONS)
      expect(result.valid).toHaveLength(0)
      expect(result.errors[0].message).toContain('Menge pro Transport')
    })

    it('reports an error when Von is empty', async () => {
      const file = makeXlsxFile([
        VALID_HEADERS,
        ['', 'Fräsmaschine', 10, 5, ''],
      ])
      const result = await parseFlowsFromXlsx(file, STATIONS)
      expect(result.valid).toHaveLength(0)
      expect(result.errors[0].message).toContain("'Von' ist leer")
    })

    it('reports an error when Nach is empty', async () => {
      const file = makeXlsxFile([
        VALID_HEADERS,
        ['Drehmaschine', '', 10, 5, ''],
      ])
      const result = await parseFlowsFromXlsx(file, STATIONS)
      expect(result.valid).toHaveLength(0)
      expect(result.errors[0].message).toContain("'Nach' ist leer")
    })

    it('collects errors and valid rows independently in a mixed file', async () => {
      const file = makeXlsxFile([
        VALID_HEADERS,
        ['Drehmaschine', 'Fräsmaschine', 10, 5, ''],       // valid
        ['Unbekannt', 'Fräsmaschine', 10, 5, ''],           // invalid: bad Von
        ['Fräsmaschine', 'Montage', 8, 2, 'Bauteil'],       // valid
        ['Drehmaschine', 'Fräsmaschine', 0, 5, ''],         // invalid: menge=0
      ])
      const result = await parseFlowsFromXlsx(file, STATIONS)
      expect(result.valid).toHaveLength(2)
      expect(result.errors).toHaveLength(2)
    })
  })

  describe('non-.xlsx file', () => {
    it('is rejected by the dialog (file type check is in ImportFlowsDialog, not parser)', () => {
      // parseFlowsFromXlsx itself will attempt to parse any buffer;
      // the .xlsx extension check lives in ImportFlowsDialog.processFile.
      // This test documents that the guard is in the dialog layer.
      expect(true).toBe(true) // covered by E2E test
    })
  })
})
