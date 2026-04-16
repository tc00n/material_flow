'use client'

import { useState } from 'react'
import { Node } from '@xyflow/react'
import { Zap } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MachineNodeData } from '@/components/canvas/machine-node'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  nodes: Node[]
  onConfirm: (fixedIds: string[]) => void
}

export function FixedObjectsDialog({ open, onOpenChange, nodes, onConfirm }: Props) {
  const [fixedIds, setFixedIds] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setFixedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleStart() {
    onConfirm(Array.from(fixedIds))
    setFixedIds(new Set())
  }

  function handleCancel() {
    setFixedIds(new Set())
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleCancel() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Layout optimieren
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Wähle Objekte, die <strong>nicht</strong> verschoben werden sollen
            (z.B. Wareneingang, Außenlager an der Wand).
          </p>

          <ScrollArea className="h-56 rounded-md border">
            <div className="p-3 space-y-1">
              {nodes.map((node) => {
                const data = node.data as MachineNodeData
                return (
                  <div key={node.id} className="flex items-center gap-3 py-1.5">
                    <Checkbox
                      id={`fix-${node.id}`}
                      checked={fixedIds.has(node.id)}
                      onCheckedChange={() => toggle(node.id)}
                    />
                    <Label
                      htmlFor={`fix-${node.id}`}
                      className="text-sm cursor-pointer flex-1 leading-none"
                    >
                      {data.label}
                    </Label>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {data.widthUnits}×{data.heightUnits}
                    </span>
                  </div>
                )
              })}
            </div>
          </ScrollArea>

          {fixedIds.size > 0 && (
            <p className="text-xs text-muted-foreground">
              {fixedIds.size} Objekt{fixedIds.size !== 1 ? 'e' : ''} fixiert
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Abbrechen
          </Button>
          <Button onClick={handleStart}>
            Optimierung starten
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
