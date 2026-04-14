'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { MaterialFlowWithLabels } from '@/app/actions/material-flows'

export type Station = {
  id: string
  label: string
}

type FormValues = {
  from_node_id: string
  to_node_id: string
  quantity: string
  frequency: string
  material_name: string
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  stations: Station[]
  layoutId: string
  editFlow?: MaterialFlowWithLabels | null
  existingFlows: MaterialFlowWithLabels[]
  onSave: (values: {
    from_node_id: string
    to_node_id: string
    quantity: number
    frequency: number
    material_name: string | null
  }) => Promise<{ success: boolean; error?: string }>
}

const EMPTY_FORM: FormValues = {
  from_node_id: '',
  to_node_id: '',
  quantity: '',
  frequency: '',
  material_name: '',
}

export function FlowFormDialog({ open, onOpenChange, stations, editFlow, existingFlows, onSave }: Props) {
  const [values, setValues] = useState<FormValues>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const [duplicateWarning, setDuplicateWarning] = useState(false)
  const [loading, setLoading] = useState(false)

  const isEdit = !!editFlow

  // Populate form when editing
  useEffect(() => {
    if (open && editFlow) {
      setValues({
        from_node_id: editFlow.from_node_id,
        to_node_id: editFlow.to_node_id,
        quantity: String(editFlow.quantity),
        frequency: String(editFlow.frequency),
        material_name: editFlow.material_name ?? '',
      })
    } else if (open && !editFlow) {
      setValues(EMPTY_FORM)
    }
    setError(null)
    setDuplicateWarning(false)
  }, [open, editFlow])

  // Compute transport intensity preview
  const qty = parseFloat(values.quantity)
  const freq = parseFloat(values.frequency)
  const intensity = !isNaN(qty) && !isNaN(freq) && qty > 0 && freq > 0 ? qty * freq : null

  // Check for duplicate (same from+to, different id)
  useEffect(() => {
    if (!values.from_node_id || !values.to_node_id) {
      setDuplicateWarning(false)
      return
    }
    const isDup = existingFlows.some(
      (f) =>
        f.from_node_id === values.from_node_id &&
        f.to_node_id === values.to_node_id &&
        f.id !== editFlow?.id
    )
    setDuplicateWarning(isDup)
  }, [values.from_node_id, values.to_node_id, existingFlows, editFlow])

  // Filter Nach options: exclude current Von selection
  const nachOptions = stations.filter((s) => s.id !== values.from_node_id)

  function set(field: keyof FormValues, val: string) {
    setValues((prev) => {
      const updated = { ...prev, [field]: val }
      // Reset Nach if Von changes to avoid self-flow
      if (field === 'from_node_id' && val === prev.to_node_id) {
        updated.to_node_id = ''
      }
      return updated
    })
    setError(null)
  }

  async function handleSubmit() {
    // Validate
    if (!values.from_node_id) { setError('Bitte "Von"-Station auswählen'); return }
    if (!values.to_node_id) { setError('Bitte "Nach"-Station auswählen'); return }
    if (values.from_node_id === values.to_node_id) { setError('Von und Nach dürfen nicht identisch sein'); return }
    if (!values.quantity || isNaN(parseFloat(values.quantity)) || parseFloat(values.quantity) <= 0) {
      setError('Menge muss eine Zahl größer als 0 sein')
      return
    }
    if (!values.frequency || isNaN(parseFloat(values.frequency)) || parseFloat(values.frequency) <= 0) {
      setError('Transporte/Tag muss eine Zahl größer als 0 sein')
      return
    }

    setLoading(true)
    setError(null)

    const result = await onSave({
      from_node_id: values.from_node_id,
      to_node_id: values.to_node_id,
      quantity: parseFloat(values.quantity),
      frequency: parseFloat(values.frequency),
      material_name: values.material_name.trim() || null,
    })

    setLoading(false)

    if (!result.success) {
      setError(result.error ?? 'Unbekannter Fehler')
    } else {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Fluss bearbeiten' : 'Neuen Fluss hinzufügen'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Von */}
          <div className="space-y-1.5">
            <Label htmlFor="from">Von <span className="text-destructive">*</span></Label>
            <Select value={values.from_node_id} onValueChange={(v) => set('from_node_id', v)}>
              <SelectTrigger id="from">
                <SelectValue placeholder="Station auswählen…" />
              </SelectTrigger>
              <SelectContent>
                {stations.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Nach */}
          <div className="space-y-1.5">
            <Label htmlFor="to">Nach <span className="text-destructive">*</span></Label>
            <Select
              value={values.to_node_id}
              onValueChange={(v) => set('to_node_id', v)}
              disabled={!values.from_node_id}
            >
              <SelectTrigger id="to">
                <SelectValue placeholder={values.from_node_id ? 'Station auswählen…' : 'Erst "Von" wählen'} />
              </SelectTrigger>
              <SelectContent>
                {nachOptions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Duplicate warning (non-blocking) */}
          {duplicateWarning && (
            <Alert variant="default" className="border-amber-300 bg-amber-50 text-amber-800">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm">
                Dieser Fluss (Von → Nach) existiert bereits. Bidirektionale Flüsse mit verschiedenen Materialien sind erlaubt.
              </AlertDescription>
            </Alert>
          )}

          {/* Menge + Frequenz side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="qty">Menge/Transport (Einh.) <span className="text-destructive">*</span></Label>
              <Input
                id="qty"
                type="number"
                min="0.01"
                step="any"
                placeholder="z.B. 50"
                value={values.quantity}
                onChange={(e) => set('quantity', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="freq">Transporte/Tag <span className="text-destructive">*</span></Label>
              <Input
                id="freq"
                type="number"
                min="0.01"
                step="any"
                placeholder="z.B. 8"
                value={values.frequency}
                onChange={(e) => set('frequency', e.target.value)}
              />
            </div>
          </div>

          {/* Intensity preview */}
          {intensity !== null && (
            <p className="text-sm text-muted-foreground">
              Transportintensität:{' '}
              <span className="font-medium text-foreground">
                {intensity.toLocaleString('de-DE')} Einh./Tag
              </span>
            </p>
          )}

          {/* Material name (optional) */}
          <div className="space-y-1.5">
            <Label htmlFor="mat">Material-Bezeichnung <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              id="mat"
              type="text"
              placeholder="z.B. Rohteile, Fertigteile…"
              value={values.material_name}
              onChange={(e) => set('material_name', e.target.value)}
            />
          </div>

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Abbrechen
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Speichern…' : isEdit ? 'Aktualisieren' : 'Hinzufügen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
