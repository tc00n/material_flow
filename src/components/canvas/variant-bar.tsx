'use client'

import { useRef, useState, useTransition } from 'react'
import { Plus, MoreHorizontal, Pencil, Copy, Trash2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CanvasLayout, createVariant, deleteVariant, renameVariant } from '@/app/actions/canvas'

type Props = {
  projectId: string
  variants: CanvasLayout[]
  activeVariantId: string
  onVariantChange: (variantId: string) => void
  onVariantsUpdate: (variants: CanvasLayout[]) => void
}

export function VariantBar({ projectId, variants, activeVariantId, onVariantChange, onVariantsUpdate }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  // BUG-1 fix: guard against double-commit when Enter fires then blur fires
  const committingRef = useRef(false)

  function startRename(variant: CanvasLayout) {
    setEditingId(variant.id)
    setEditValue(variant.name)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  function commitRename(id: string) {
    if (committingRef.current) return
    committingRef.current = true
    const trimmed = editValue.trim()
    if (!trimmed) {
      setEditingId(null)
      committingRef.current = false
      return
    }
    startTransition(async () => {
      const result = await renameVariant(id, trimmed)
      if (result.success) {
        onVariantsUpdate(variants.map((v) => (v.id === id ? { ...v, name: trimmed } : v)))
      } else {
        setError(result.error ?? 'Fehler beim Umbenennen')
      }
      setEditingId(null)
      committingRef.current = false
    })
  }

  function handleAddVariant() {
    const nextNum = variants.length + 1
    // BUG-2 fix: warn (but don't block) when exceeding 5 variants
    if (variants.length >= 5) {
      setError('Mehr als 5 Varianten können die Übersichtlichkeit beeinträchtigen.')
    }
    startTransition(async () => {
      const result = await createVariant(projectId, `Variante ${nextNum}`)
      if (result.success && result.variant) {
        const updated = [...variants, result.variant]
        onVariantsUpdate(updated)
        onVariantChange(result.variant.id)
      } else {
        setError(result.error ?? 'Fehler beim Erstellen')
      }
    })
  }

  function handleDuplicate(variant: CanvasLayout) {
    startTransition(async () => {
      const result = await createVariant(projectId, `${variant.name} (Kopie)`, variant.id)
      if (result.success && result.variant) {
        const updated = [...variants, result.variant]
        onVariantsUpdate(updated)
        onVariantChange(result.variant.id)
      } else {
        setError(result.error ?? 'Fehler beim Duplizieren')
      }
    })
  }

  function handleDelete(variant: CanvasLayout) {
    startTransition(async () => {
      const result = await deleteVariant(variant.id)
      if (result.success) {
        const updated = variants.filter((v) => v.id !== variant.id)
        onVariantsUpdate(updated)
        if (activeVariantId === variant.id && updated.length > 0) {
          onVariantChange(updated[0].id)
        }
      } else {
        setError(result.error ?? 'Fehler beim Löschen')
      }
    })
  }

  return (
    <div className="flex items-center h-9 border-b border-border bg-muted/30 px-2 gap-0.5 overflow-x-auto shrink-0">
      {variants.map((variant) => {
        const isActive = variant.id === activeVariantId
        const isEditing = editingId === variant.id

        return (
          <div
            key={variant.id}
            className={`
              group relative flex items-center gap-1 px-2.5 h-7 rounded-md text-xs cursor-pointer select-none shrink-0
              transition-colors
              ${isActive
                ? 'bg-background border border-border shadow-sm font-medium'
                : 'hover:bg-muted/60 text-muted-foreground hover:text-foreground'
              }
            `}
            onClick={() => !isEditing && onVariantChange(variant.id)}
            onDoubleClick={() => startRename(variant)}
          >
            {isEditing ? (
              <input
                ref={inputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => commitRename(variant.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename(variant.id)
                  if (e.key === 'Escape') setEditingId(null)
                }}
                onClick={(e) => e.stopPropagation()}
                className="bg-transparent outline-none border-none w-28 text-xs"
                autoFocus
              />
            ) : (
              <span className="max-w-[140px] truncate">{variant.name}</span>
            )}

            {/* Context menu — show on all tabs (not while editing) */}
            {!isEditing && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="ml-0.5 rounded opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-muted p-0.5"
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Variante Optionen"
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-44">
                  <DropdownMenuItem onClick={() => startRename(variant)}>
                    <Pencil className="h-3.5 w-3.5 mr-2" />
                    Umbenennen
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDuplicate(variant)} disabled={isPending}>
                    <Copy className="h-3.5 w-3.5 mr-2" />
                    Duplizieren
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleDelete(variant)}
                    disabled={variants.length <= 1 || isPending}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    Löschen
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )
      })}

      {/* Add variant button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 ml-0.5"
        onClick={handleAddVariant}
        disabled={isPending}
        aria-label="Neue Variante"
        title="Neue Variante erstellen"
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>

      {/* Inline error */}
      {error && (
        <div className="flex items-center gap-1 ml-2 text-[11px] text-destructive">
          <AlertCircle className="h-3 w-3" />
          {error}
          <button className="underline" onClick={() => setError(null)}>OK</button>
        </div>
      )}

      {isPending && (
        <span className="ml-2 text-[11px] text-muted-foreground animate-pulse">…</span>
      )}
    </div>
  )
}
