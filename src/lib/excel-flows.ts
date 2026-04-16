/**
 * Excel import/export utilities for material flows (PROJ-13)
 * All operations run fully client-side via SheetJS (xlsx).
 */

import * as XLSX from 'xlsx'
import type { MaterialFlowWithLabels } from '@/app/actions/material-flows'
import type { Station } from '@/components/canvas/flow-form-dialog'

// ── Column headers (fixed) ──────────────────────────────────────────────────

const HEADERS = ['Von', 'Nach', 'Menge pro Transport', 'Transporte pro Tag', 'Material']

// ── Export ──────────────────────────────────────────────────────────────────

export function exportFlowsToXlsx(
  flows: MaterialFlowWithLabels[],
  projectName: string
): void {
  const rows = flows.map((f) => ({
    Von: f.from_label,
    Nach: f.to_label,
    'Menge pro Transport': f.quantity,
    'Transporte pro Tag': f.frequency,
    Material: f.material_name ?? '',
  }))

  const ws = XLSX.utils.json_to_sheet(rows, { header: HEADERS })
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Materialflüsse')

  const date = new Date().toISOString().slice(0, 10)
  const safeName = projectName.replace(/[^a-zA-Z0-9äöüÄÖÜß_-]/g, '-')
  const filename = `materialfluss-${safeName}-${date}.xlsx`

  XLSX.writeFile(wb, filename)
}

// ── Template Download ────────────────────────────────────────────────────────

export function downloadTemplate(): void {
  const ws = XLSX.utils.aoa_to_sheet([HEADERS])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Materialflüsse')
  XLSX.writeFile(wb, 'materialfluss-vorlage.xlsx')
}

// ── Import ───────────────────────────────────────────────────────────────────

export type ParsedFlowRow = {
  from_label: string
  to_label: string
  quantity: number
  frequency: number
  material_name: string | null
}

export type ParseError = {
  row: number
  message: string
}

export type ParseResult = {
  valid: ParsedFlowRow[]
  errors: ParseError[]
}

/**
 * Parses an .xlsx file and validates rows against known station labels.
 * Returns valid rows and a list of per-row errors.
 */
export async function parseFlowsFromXlsx(
  file: File,
  stations: Station[]
): Promise<ParseResult> {
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })

  const sheetName = wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]

  // Get raw rows as arrays of values (first row = headers)
  const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

  if (raw.length < 1) {
    return { valid: [], errors: [{ row: 0, message: 'Keine Daten in der Datei gefunden' }] }
  }

  // Validate headers (case-insensitive)
  const headerRow = (raw[0] as unknown[]).map((h) => String(h).trim().toLowerCase())
  const expectedHeaders = HEADERS.map((h) => h.toLowerCase())
  const missingHeaders = expectedHeaders.slice(0, 4).filter((h) => !headerRow.includes(h))

  if (missingHeaders.length > 0) {
    return {
      valid: [],
      errors: [{
        row: 1,
        message: `Falsche Spaltenüberschriften. Erwartet: ${HEADERS.slice(0, 4).join(', ')}`,
      }],
    }
  }

  // Map column indices from header row
  const idx = {
    von: headerRow.indexOf('von'),
    nach: headerRow.indexOf('nach'),
    menge: headerRow.indexOf('menge pro transport'),
    freq: headerRow.indexOf('transporte pro tag'),
    material: headerRow.indexOf('material'),
  }

  const dataRows = raw.slice(1)

  if (dataRows.length === 0) {
    return { valid: [], errors: [{ row: 0, message: 'Keine Daten in der Datei gefunden' }] }
  }

  const stationNames = new Set(stations.map((s) => s.label.trim().toLowerCase()))
  const valid: ParsedFlowRow[] = []
  const errors: ParseError[] = []

  dataRows.forEach((row, i) => {
    const rowNum = i + 2 // 1-indexed, +1 for header row
    const cells = row as unknown[]

    const vonRaw = String(cells[idx.von] ?? '').trim()
    const nachRaw = String(cells[idx.nach] ?? '').trim()
    const mengeRaw = cells[idx.menge]
    const freqRaw = cells[idx.freq]
    const materialRaw = idx.material >= 0 ? String(cells[idx.material] ?? '').trim() : ''

    // Skip completely empty rows
    if (!vonRaw && !nachRaw && !mengeRaw && !freqRaw) return

    if (!vonRaw) {
      errors.push({ row: rowNum, message: `Zeile ${rowNum}: 'Von' ist leer` })
      return
    }
    if (!nachRaw) {
      errors.push({ row: rowNum, message: `Zeile ${rowNum}: 'Nach' ist leer` })
      return
    }
    if (!stationNames.has(vonRaw.toLowerCase())) {
      errors.push({ row: rowNum, message: `Zeile ${rowNum}: Station '${vonRaw}' nicht gefunden` })
      return
    }
    if (!stationNames.has(nachRaw.toLowerCase())) {
      errors.push({ row: rowNum, message: `Zeile ${rowNum}: Station '${nachRaw}' nicht gefunden` })
      return
    }

    const menge = typeof mengeRaw === 'number' ? mengeRaw : Number(mengeRaw)
    const freq = typeof freqRaw === 'number' ? freqRaw : Number(freqRaw)

    if (!Number.isFinite(menge) || menge <= 0) {
      errors.push({ row: rowNum, message: `Zeile ${rowNum}: 'Menge pro Transport' muss eine Zahl > 0 sein` })
      return
    }
    if (!Number.isFinite(freq) || freq <= 0) {
      errors.push({ row: rowNum, message: `Zeile ${rowNum}: 'Transporte pro Tag' muss eine Zahl > 0 sein` })
      return
    }

    // Resolve station labels back to exact casing from stations list
    const fromStation = stations.find((s) => s.label.trim().toLowerCase() === vonRaw.toLowerCase())!
    const toStation = stations.find((s) => s.label.trim().toLowerCase() === nachRaw.toLowerCase())!

    valid.push({
      from_label: fromStation.label,
      to_label: toStation.label,
      quantity: menge,
      frequency: freq,
      material_name: materialRaw || null,
    })
  })

  return { valid, errors }
}
