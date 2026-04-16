'use client'

import { useCallback, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Upload, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react'
import { parseFlowsFromXlsx, ParsedFlowRow, ParseError } from '@/lib/excel-flows'
import type { Station } from '@/components/canvas/flow-form-dialog'

type ImportMode = 'append' | 'replace'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  stations: Station[]
  onConfirm: (rows: ParsedFlowRow[], mode: ImportMode) => Promise<void>
}

type Step = 'upload' | 'preview'

export function ImportFlowsDialog({ open, onOpenChange, stations, onConfirm }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('upload')
  const [dragging, setDragging] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)

  const [validRows, setValidRows] = useState<ParsedFlowRow[]>([])
  const [errors, setErrors] = useState<ParseError[]>([])
  const [mode, setMode] = useState<ImportMode>('append')
  const [fileError, setFileError] = useState<string | null>(null)

  function handleClose() {
    if (importing) return
    onOpenChange(false)
    // Reset after close animation
    setTimeout(reset, 200)
  }

  function reset() {
    setStep('upload')
    setValidRows([])
    setErrors([])
    setMode('append')
    setFileError(null)
    setParsing(false)
    setImporting(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function processFile(file: File) {
    setFileError(null)

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setFileError('Nur .xlsx-Dateien werden unterstützt.')
      return
    }

    if (stations.length === 0) {
      setFileError('Keine Stationen auf dem Canvas — bitte zuerst Stationen hinzufügen.')
      return
    }

    setParsing(true)
    try {
      const result = await parseFlowsFromXlsx(file, stations)

      // If only fatal errors (e.g. bad headers or empty file), show as file error
      if (result.valid.length === 0 && result.errors.length === 1 && result.errors[0].row <= 1) {
        setFileError(result.errors[0].message)
        setParsing(false)
        return
      }

      if (result.valid.length === 0 && result.errors.length > 0) {
        setValidRows([])
        setErrors(result.errors)
        setStep('preview')
        setParsing(false)
        return
      }

      setValidRows(result.valid)
      setErrors(result.errors)
      setStep('preview')
    } catch {
      setFileError('Fehler beim Lesen der Datei. Bitte überprüfe das Format.')
    } finally {
      setParsing(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stations])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragging(false)
  }, [])

  async function handleConfirm() {
    if (validRows.length === 0) return
    setImporting(true)
    try {
      await onConfirm(validRows, mode)
      onOpenChange(false)
      setTimeout(reset, 200)
    } finally {
      setImporting(false)
    }
  }

  const previewRows = validRows.slice(0, 5)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Materialflüsse importieren</DialogTitle>
          <DialogDescription>
            {step === 'upload'
              ? 'Lade eine .xlsx-Datei mit Materialflüssen hoch.'
              : `${validRows.length} gültige Zeile${validRows.length !== 1 ? 'n' : ''} erkannt${errors.length > 0 ? `, ${errors.length} Fehler` : ''}.`}
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4 py-2">
            {/* Drop zone */}
            <div
              className={[
                'border-2 border-dashed rounded-lg p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors',
                dragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/60 hover:bg-muted/40',
              ].join(' ')}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              role="button"
              aria-label="Datei hochladen"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
            >
              <div className="rounded-full bg-muted p-3">
                <Upload className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">
                  {parsing ? 'Datei wird gelesen…' : 'Datei hier ablegen oder klicken'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Nur .xlsx-Dateien</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="sr-only"
                onChange={handleFileChange}
              />
            </div>

            {fileError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{fileError}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4 py-2">
            {/* Summary */}
            <div className="flex gap-2 flex-wrap">
              {validRows.length > 0 && (
                <Badge variant="secondary" className="gap-1 font-normal">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  {validRows.length} gültig
                </Badge>
              )}
              {errors.length > 0 && (
                <Badge variant="secondary" className="gap-1 font-normal">
                  <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                  {errors.length} Fehler
                </Badge>
              )}
            </div>

            {/* Preview table */}
            {validRows.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">
                  Vorschau{validRows.length > 5 ? ` (erste 5 von ${validRows.length} Zeilen)` : ''}
                </p>
                <div className="rounded border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs py-2">Von → Nach</TableHead>
                        <TableHead className="text-xs py-2 text-right">Menge</TableHead>
                        <TableHead className="text-xs py-2 text-right">Freq.</TableHead>
                        <TableHead className="text-xs py-2">Material</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewRows.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="py-1.5 text-xs">
                            <span className="flex items-center gap-1">
                              <span className="truncate max-w-[80px]">{row.from_label}</span>
                              <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                              <span className="truncate max-w-[80px]">{row.to_label}</span>
                            </span>
                          </TableCell>
                          <TableCell className="py-1.5 text-xs text-right tabular-nums">
                            {row.quantity.toLocaleString('de-DE')}
                          </TableCell>
                          <TableCell className="py-1.5 text-xs text-right tabular-nums">
                            {row.frequency.toLocaleString('de-DE')}
                          </TableCell>
                          <TableCell className="py-1.5 text-xs text-muted-foreground">
                            {row.material_name ?? '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Error list */}
            {errors.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Fehlerhafte Zeilen (werden übersprungen)</p>
                <ScrollArea className="max-h-28 rounded border p-2">
                  <ul className="space-y-1">
                    {errors.map((err, i) => (
                      <li key={i} className="text-xs text-destructive flex gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span>{err.message}</span>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>
            )}

            {/* Mode selection — only shown if there are valid rows */}
            {validRows.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium">Importmodus</p>
                <RadioGroup
                  value={mode}
                  onValueChange={(v) => setMode(v as ImportMode)}
                  className="space-y-1"
                >
                  <div className="flex items-start gap-2">
                    <RadioGroupItem value="append" id="mode-append" className="mt-0.5" />
                    <Label htmlFor="mode-append" className="text-sm font-normal cursor-pointer">
                      <span className="font-medium">Hinzufügen</span>
                      <span className="text-muted-foreground ml-1">— neue Flüsse zu bestehenden hinzufügen</span>
                    </Label>
                  </div>
                  <div className="flex items-start gap-2">
                    <RadioGroupItem value="replace" id="mode-replace" className="mt-0.5" />
                    <Label htmlFor="mode-replace" className="text-sm font-normal cursor-pointer">
                      <span className="font-medium">Ersetzen</span>
                      <span className="text-muted-foreground ml-1">— alle bestehenden Flüsse löschen und ersetzen</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === 'preview' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setStep('upload'); setFileError(null) }}
              disabled={importing}
            >
              Zurück
            </Button>
          )}
          <Button variant="outline" onClick={handleClose} disabled={importing}>
            Abbrechen
          </Button>
          {step === 'preview' && validRows.length > 0 && (
            <Button onClick={handleConfirm} disabled={importing}>
              {importing
                ? 'Importiere…'
                : `Importieren (${validRows.length} Fluss${validRows.length !== 1 ? 'se' : ''})`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
