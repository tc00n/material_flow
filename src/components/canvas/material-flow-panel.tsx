'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Pencil, Trash2, ArrowRight, Inbox, Download, Upload, FileSpreadsheet } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  getMaterialFlows,
  createMaterialFlow,
  updateMaterialFlow,
  deleteMaterialFlow,
  MaterialFlowWithLabels,
} from '@/app/actions/material-flows'
import { FlowFormDialog, Station } from '@/components/canvas/flow-form-dialog'
import { ImportFlowsDialog } from '@/components/canvas/import-flows-dialog'
import {
  exportFlowsToXlsx,
  downloadTemplate,
  ParsedFlowRow,
} from '@/lib/excel-flows'

type Props = {
  layoutId: string
  stations: Station[]
  projectName: string
}

export function MaterialFlowPanel({ layoutId, stations, projectName }: Props) {
  const { toast } = useToast()

  const [flows, setFlows] = useState<MaterialFlowWithLabels[]>([])
  const [loading, setLoading] = useState(true)

  const [addOpen, setAddOpen] = useState(false)
  const [editFlow, setEditFlow] = useState<MaterialFlowWithLabels | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MaterialFlowWithLabels | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const data = await getMaterialFlows(layoutId)
    setFlows(data)
    setLoading(false)
  }, [layoutId])

  useEffect(() => {
    load()
  }, [load])

  async function handleCreate(values: {
    from_node_id: string
    to_node_id: string
    quantity: number
    frequency: number
    material_name: string | null
  }) {
    const result = await createMaterialFlow({
      canvas_layout_id: layoutId,
      ...values,
    })
    if (result.success) {
      toast({ title: 'Fluss hinzugefügt' })
      load()
    }
    return result
  }

  async function handleUpdate(values: {
    from_node_id: string
    to_node_id: string
    quantity: number
    frequency: number
    material_name: string | null
  }) {
    if (!editFlow) return { success: false }
    const result = await updateMaterialFlow({ id: editFlow.id, ...values })
    if (result.success) {
      toast({ title: 'Fluss aktualisiert' })
      load()
    }
    return result
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const result = await deleteMaterialFlow(deleteTarget.id)
    setDeleting(false)
    setDeleteTarget(null)
    if (result.success) {
      toast({ title: 'Fluss gelöscht' })
      load()
    } else {
      toast({ title: 'Fehler beim Löschen', description: result.error, variant: 'destructive' })
    }
  }

  function handleExport() {
    if (flows.length === 0) {
      toast({ title: 'Keine Flüsse zum Exportieren', variant: 'destructive' })
      return
    }
    exportFlowsToXlsx(flows, projectName)
    toast({ title: 'Export gestartet' })
  }

  async function handleImportConfirm(
    rows: ParsedFlowRow[],
    mode: 'append' | 'replace'
  ) {
    if (mode === 'replace') {
      // Delete all existing flows first
      for (const flow of flows) {
        await deleteMaterialFlow(flow.id)
      }
    }

    let created = 0
    for (const row of rows) {
      const fromStation = stations.find((s) => s.label === row.from_label)
      const toStation = stations.find((s) => s.label === row.to_label)
      if (!fromStation || !toStation) continue

      const result = await createMaterialFlow({
        canvas_layout_id: layoutId,
        from_node_id: fromStation.id,
        to_node_id: toStation.id,
        quantity: row.quantity,
        frequency: row.frequency,
        material_name: row.material_name,
      })
      if (result.success) created++
    }

    toast({
      title: `${created} Fluss${created !== 1 ? 'se' : ''} importiert`,
      description: mode === 'replace' ? 'Bestehende Flüsse wurden ersetzt.' : undefined,
    })
    load()
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Panel header */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0 gap-2">
        <div className="shrink-0">
          <h2 className="text-sm font-semibold">Materialflüsse</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Transportbeziehungen zwischen Stationen
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs"
            onClick={downloadTemplate}
            title="Leere Vorlage herunterladen"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />
            Vorlage
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs"
            onClick={handleExport}
            disabled={flows.length === 0 || loading}
            title="Flüsse als Excel exportieren"
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            Export
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => setImportOpen(true)}
            title="Flüsse aus Excel importieren"
          >
            <Upload className="h-3.5 w-3.5 mr-1" />
            Import
          </Button>
          <Button
            size="sm"
            onClick={() => setAddOpen(true)}
            disabled={stations.length < 2}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Neuen Fluss
          </Button>
        </div>
      </div>

      {/* No stations hint */}
      {stations.length < 2 && !loading && (
        <div className="px-6 py-3 bg-amber-50 border-b border-amber-200">
          <p className="text-xs text-amber-700">
            Mindestens 2 Stationen im Canvas erforderlich, um Flüsse zu definieren.
          </p>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full rounded" />
            ))}
          </div>
        ) : flows.length === 0 ? (
          <EmptyState canAddFlow={stations.length >= 2} onAdd={() => setAddOpen(true)} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Von → Nach</TableHead>
                <TableHead className="text-right">Menge/Transport</TableHead>
                <TableHead className="text-right">Freq./Tag</TableHead>
                <TableHead className="text-right">Intensität</TableHead>
                <TableHead>Material</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {flows.map((flow) => (
                <TableRow key={flow.id}>
                  <TableCell className="font-medium">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate max-w-[120px]">{flow.from_label}</span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate max-w-[120px]">{flow.to_label}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {flow.quantity.toLocaleString('de-DE')}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {flow.frequency.toLocaleString('de-DE')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary" className="tabular-nums font-normal">
                      {flow.transport_intensity.toLocaleString('de-DE')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {flow.material_name ?? '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label="Bearbeiten"
                        onClick={() => setEditFlow(flow)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        aria-label="Löschen"
                        onClick={() => setDeleteTarget(flow)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add Dialog */}
      <FlowFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        stations={stations}
        layoutId={layoutId}
        editFlow={null}
        existingFlows={flows}
        onSave={handleCreate}
      />

      {/* Edit Dialog */}
      <FlowFormDialog
        open={!!editFlow}
        onOpenChange={(open) => { if (!open) setEditFlow(null) }}
        stations={stations}
        layoutId={layoutId}
        editFlow={editFlow}
        existingFlows={flows}
        onSave={handleUpdate}
      />

      {/* Import Dialog */}
      <ImportFlowsDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        stations={stations}
        onConfirm={handleImportConfirm}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fluss löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  Der Fluss{' '}
                  <strong>{deleteTarget.from_label} → {deleteTarget.to_label}</strong>{' '}
                  {deleteTarget.material_name ? `(${deleteTarget.material_name}) ` : ''}
                  wird unwiderruflich gelöscht.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Löschen…' : 'Löschen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function EmptyState({ canAddFlow, onAdd }: { canAddFlow: boolean; onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6 py-16">
      <div className="rounded-full bg-muted p-3">
        <Inbox className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">Keine Flüsse definiert</p>
        <p className="text-xs text-muted-foreground max-w-xs">
          {canAddFlow
            ? 'Füge den ersten Materialfluss zwischen zwei Stationen hinzu.'
            : 'Bitte zunächst Stationen im Canvas-Tab anlegen, bevor Materialflüsse definiert werden können.'}
        </p>
      </div>
      {canAddFlow && (
        <Button size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1.5" />
          Ersten Fluss anlegen
        </Button>
      )}
    </div>
  )
}
