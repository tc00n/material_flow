'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CanvasObjectType } from '@/app/actions/canvas'
import {
  MachineType,
  MachineTypeInput,
  createMachineType,
  updateMachineType,
  deleteMachineType,
} from '@/app/actions/machine-types'
import { MachineTypeDialog } from '@/components/canvas/machine-type-dialog'

export type SidebarItem = {
  id: string
  label: string
  type: CanvasObjectType
  widthUnits: number
  heightUnits: number
  color?: string
  machine_type_id?: string
}

// ── Machine type draggable item (with edit/delete) ────────────────────────
type MachineTypeItemProps = {
  type: MachineType
  onEdit: (type: MachineType) => void
  onDelete: (type: MachineType) => void
}

function MachineTypeItem({ type, onEdit, onDelete }: MachineTypeItemProps) {
  const [isDragging, setIsDragging] = useState(false)
  const color = type.color

  const sidebarItem: SidebarItem = {
    id: type.id,
    label: type.name,
    type: 'machine',
    widthUnits: type.width_m,
    heightUnits: type.height_m,
    color: type.color,
    machine_type_id: type.id,
  }

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData('application/machineData', JSON.stringify(sidebarItem))
    e.dataTransfer.effectAllowed = 'copy'
    setIsDragging(true)
  }

  return (
    <div
      className="group flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-grab active:cursor-grabbing select-none"
      draggable
      onDragStart={handleDragStart}
      onDragEnd={() => setIsDragging(false)}
      style={{
        backgroundColor: isDragging ? `${color}18` : 'transparent',
        border: `1px solid ${isDragging ? color : 'transparent'}`,
        opacity: isDragging ? 0.5 : 1,
        transition: 'background-color 0.1s, border-color 0.1s',
      }}
      onMouseEnter={(e) => {
        if (!isDragging) {
          e.currentTarget.style.backgroundColor = `${color}10`
          e.currentTarget.style.borderColor = `${color}40`
        }
      }}
      onMouseLeave={(e) => {
        if (!isDragging) {
          e.currentTarget.style.backgroundColor = 'transparent'
          e.currentTarget.style.borderColor = 'transparent'
        }
      }}
    >
      {/* Color swatch */}
      <div
        className="w-3 h-3 rounded-sm shrink-0"
        style={{ backgroundColor: color, border: `1px solid ${color}60` }}
      />

      {/* Label + size */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate" style={{ color }}>
          {type.name}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {type.width_m}×{type.height_m} m
        </p>
      </div>

      {/* Edit/Delete buttons (visible on hover) */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          title="Bearbeiten"
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation()
            onEdit(type)
          }}
        >
          <Pencil size={10} />
        </button>
        <button
          type="button"
          title="Löschen"
          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(type)
          }}
        >
          <Trash2 size={10} />
        </button>
      </div>
    </div>
  )
}

// ── MachineSidebar ────────────────────────────────────────────────────────

type MachineSidebarProps = {
  projectId: string
  initialMachineTypes: MachineType[]
  onTypeCreated: (type: MachineType) => void
  onTypeUpdated: (type: MachineType) => void
  onTypeDeleted: (typeId: string) => void
}

export function MachineSidebar({
  projectId,
  initialMachineTypes,
  onTypeCreated,
  onTypeUpdated,
  onTypeDeleted,
}: MachineSidebarProps) {
  const [machineTypes, setMachineTypes] = useState<MachineType[]>(initialMachineTypes)
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<MachineType | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const showSearch = machineTypes.length > 30
  const filteredTypes = showSearch && search.trim()
    ? machineTypes.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
    : machineTypes

  async function handleCreate(input: MachineTypeInput): Promise<string | null> {
    const result = await createMachineType(projectId, input)
    if (!result.success) return result.error
    const sorted = [...machineTypes, result.data].sort((a, b) => a.name.localeCompare(b.name))
    setMachineTypes(sorted)
    onTypeCreated(result.data)
    return null
  }

  async function handleUpdate(input: MachineTypeInput): Promise<string | null> {
    if (!editTarget) return 'Kein Typ ausgewählt'
    const result = await updateMachineType(editTarget.id, input)
    if (!result.success) return result.error
    const sorted = machineTypes
      .map((t) => (t.id === editTarget.id ? result.data : t))
      .sort((a, b) => a.name.localeCompare(b.name))
    setMachineTypes(sorted)
    onTypeUpdated(result.data)
    return null
  }

  async function handleDelete(type: MachineType) {
    setDeleteError(null)
    const result = await deleteMachineType(type.id)
    if (!result.success) {
      setDeleteError(result.error)
      return
    }
    setMachineTypes((prev) => prev.filter((t) => t.id !== type.id))
    onTypeDeleted(type.id)
  }

  return (
    <>
      <aside className="w-52 shrink-0 border-r border-border bg-background flex flex-col overflow-hidden">
        <div className="px-3 py-2.5 border-b border-border">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Elemente
          </h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">Auf Canvas ziehen</p>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          {/* Toolbar */}
          <div className="px-2 py-2 shrink-0 space-y-1">
            <Button
              size="sm"
              variant="outline"
              className="w-full h-7 text-[11px] gap-1"
              onClick={() => setCreateOpen(true)}
            >
              <Plus size={11} />
              Neuer Typ
            </Button>

            {showSearch && (
              <div className="relative">
                <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Suchen…"
                  className="h-7 pl-6 text-xs"
                />
              </div>
            )}

            {deleteError && (
              <p className="text-[10px] text-destructive leading-tight px-1">{deleteError}</p>
            )}
          </div>

          {/* Type list */}
          <div className="flex-1 overflow-y-auto px-1.5 space-y-0.5 pb-2">
            {filteredTypes.length === 0 && (
              <p className="text-[10px] text-muted-foreground px-2 pt-2">
                {machineTypes.length === 0
                  ? 'Noch keine Typen. Erstelle deinen ersten Typ.'
                  : 'Keine Treffer.'}
              </p>
            )}
            {filteredTypes.map((type) => (
              <MachineTypeItem
                key={type.id}
                type={type}
                onEdit={(t) => {
                  setDeleteError(null)
                  setEditTarget(t)
                }}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      </aside>

      {/* Create dialog */}
      <MachineTypeDialog
        open={createOpen}
        mode="create"
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
      />

      {/* Edit dialog */}
      {editTarget && (
        <MachineTypeDialog
          key={editTarget.id}
          open={!!editTarget}
          mode="edit"
          initial={editTarget}
          onClose={() => setEditTarget(null)}
          onSubmit={handleUpdate}
        />
      )}
    </>
  )
}
