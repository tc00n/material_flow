'use client'

import { useState, useEffect } from 'react'
import { Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import type { MachineNodeData } from '@/components/canvas/machine-node'

type Props = {
  nodeId: string
  data: MachineNodeData
  onClose: () => void
  onDelete: (id: string) => void
  onLabelChange: (id: string, label: string) => void
}

const TYPE_LABELS = {
  machine: 'Maschine',
  source: 'Quelle',
  sink: 'Senke',
}

export function PropertiesPanel({ nodeId, data, onClose, onDelete, onLabelChange }: Props) {
  const [label, setLabel] = useState(data.label)

  // Sync when a different node gets selected
  useEffect(() => {
    setLabel(data.label)
  }, [nodeId, data.label])

  function handleLabelBlur() {
    const trimmed = label.trim()
    if (trimmed && trimmed !== data.label) {
      onLabelChange(nodeId, trimmed)
    } else {
      setLabel(data.label)
    }
  }

  function handleLabelKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.currentTarget.blur()
    }
    if (e.key === 'Escape') {
      setLabel(data.label)
      e.currentTarget.blur()
    }
  }

  return (
    <aside className="w-56 shrink-0 border-l border-border bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <div>
          <h2 className="text-xs font-semibold">Eigenschaften</h2>
          <p className="text-[10px] text-muted-foreground">{TYPE_LABELS[data.objectType]}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onClose}
          aria-label="Panel schließen"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Properties */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Label */}
        <div className="space-y-1.5">
          <Label htmlFor="prop-label" className="text-xs">
            Name
          </Label>
          <Input
            id="prop-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={handleLabelBlur}
            onKeyDown={handleLabelKeyDown}
            className="h-7 text-xs"
          />
        </div>

        {/* Dimensions */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Abmessungen</Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Breite</p>
              <div className="h-7 px-2 rounded-md border border-border bg-muted flex items-center text-xs">
                {data.widthUnits} m
              </div>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Tiefe</p>
              <div className="h-7 px-2 rounded-md border border-border bg-muted flex items-center text-xs">
                {data.heightUnits} m
              </div>
            </div>
          </div>
        </div>

        {data.hasOverlap && (
          <div className="rounded-md bg-red-50 border border-red-200 p-2">
            <p className="text-[10px] text-red-700 font-medium">Überlappung erkannt</p>
            <p className="text-[10px] text-red-600 mt-0.5">
              Dieses Element überlappt mit einem anderen. Bitte verschieben.
            </p>
          </div>
        )}
      </div>

      {/* Footer: delete */}
      <div className="p-3 border-t border-border">
        <Separator className="mb-3" />
        <Button
          variant="destructive"
          size="sm"
          className="w-full h-7 text-xs"
          onClick={() => onDelete(nodeId)}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          Element löschen
        </Button>
      </div>
    </aside>
  )
}
