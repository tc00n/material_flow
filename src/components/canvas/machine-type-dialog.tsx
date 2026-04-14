'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { MachineType, MachineTypeInput } from '@/app/actions/machine-types'

const PRESET_COLORS = [
  '#003C73', // navy blue
  '#0066CC', // blue
  '#00897B', // teal
  '#2E7D32', // green
  '#558B2F', // olive
  '#F57F17', // amber
  '#E65100', // deep orange
  '#C62828', // red
  '#6A1B9A', // purple
  '#4527A0', // deep purple
  '#37474F', // blue grey
  '#546E7A', // steel
]

type Props = {
  open: boolean
  mode: 'create' | 'edit'
  initial?: MachineType
  onClose: () => void
  onSubmit: (input: MachineTypeInput) => Promise<string | null>
}

export function MachineTypeDialog({ open, mode, initial, onClose, onSubmit }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [widthM, setWidthM] = useState(String(initial?.width_m ?? '2'))
  const [heightM, setHeightM] = useState(String(initial?.height_m ?? '2'))
  const [color, setColor] = useState(initial?.color ?? PRESET_COLORS[0])
  const [customHex, setCustomHex] = useState(
    PRESET_COLORS.includes(initial?.color ?? '') ? '' : (initial?.color ?? '')
  )
  const [description, setDescription] = useState(initial?.description ?? '')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Reset state when dialog opens
  function resetToInitial() {
    setName(initial?.name ?? '')
    setWidthM(String(initial?.width_m ?? '2'))
    setHeightM(String(initial?.height_m ?? '2'))
    setColor(initial?.color ?? PRESET_COLORS[0])
    setCustomHex(PRESET_COLORS.includes(initial?.color ?? '') ? '' : (initial?.color ?? ''))
    setDescription(initial?.description ?? '')
    setError(null)
  }

  function handleClose() {
    resetToInitial()
    onClose()
  }

  function validate(): string | null {
    if (!name.trim()) return 'Name ist erforderlich'
    if (name.trim().length > 100) return 'Name darf maximal 100 Zeichen haben'
    const w = parseFloat(widthM)
    const h = parseFloat(heightM)
    if (isNaN(w) || w < 0.5) return 'Breite muss mindestens 0,5 m sein'
    if (isNaN(h) || h < 0.5) return 'Tiefe muss mindestens 0,5 m sein'
    const activeColor = customHex.trim() || color
    if (!/^#[0-9A-Fa-f]{6}$/.test(activeColor)) return 'Ungültige Farbe (Hex-Format erwartet)'
    return null
  }

  async function handleSubmit() {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    setLoading(true)

    const activeColor = customHex.trim() || color
    const serverError = await onSubmit({
      name: name.trim(),
      width_m: parseFloat(widthM),
      height_m: parseFloat(heightM),
      color: activeColor,
      description: description.trim() || undefined,
    })

    setLoading(false)
    if (serverError) {
      setError(serverError)
    } else {
      handleClose()
    }
  }

  const activeColor = customHex.trim() || color

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Neuer Maschinen-/Anlagentyp' : 'Typ bearbeiten'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="type-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="type-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Drehmaschine"
              maxLength={100}
              autoFocus
            />
          </div>

          {/* Dimensions */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="type-width">
                Breite (m) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="type-width"
                type="number"
                value={widthM}
                onChange={(e) => setWidthM(e.target.value)}
                min={0.5}
                step={0.5}
                placeholder="2"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="type-height">
                Tiefe (m) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="type-height"
                type="number"
                value={heightM}
                onChange={(e) => setHeightM(e.target.value)}
                min={0.5}
                step={0.5}
                placeholder="2"
              />
            </div>
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label>
              Farbe <span className="text-destructive">*</span>
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={c}
                  className="w-7 h-7 rounded-md transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{
                    backgroundColor: c,
                    outline: color === c && !customHex.trim() ? `2px solid ${c}` : 'none',
                    outlineOffset: '2px',
                    boxShadow: color === c && !customHex.trim() ? '0 0 0 1px white inset' : 'none',
                  }}
                  onClick={() => {
                    setColor(c)
                    setCustomHex('')
                  }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-md border border-border shrink-0"
                style={{ backgroundColor: activeColor }}
              />
              <Input
                value={customHex}
                onChange={(e) => setCustomHex(e.target.value)}
                placeholder="#1a2b3c"
                className="font-mono text-xs h-8"
                maxLength={7}
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">Eigene Farbe</span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="type-description">Beschreibung (optional)</Label>
            <Textarea
              id="type-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kurze Beschreibung der Maschine/Anlage"
              className="resize-none text-sm"
              rows={2}
            />
          </div>

          {/* Preview */}
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Vorschau</Label>
            <div
              className="h-12 rounded flex items-center justify-center text-xs font-medium"
              style={{
                backgroundColor: `${activeColor}18`,
                border: `1px solid ${activeColor}`,
                color: activeColor,
              }}
            >
              {name.trim() || 'Typname'}
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Abbrechen
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Speichern…' : mode === 'create' ? 'Erstellen' : 'Speichern'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
