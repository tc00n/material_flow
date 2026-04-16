'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ChevronRight, ZoomIn, ZoomOut, Check, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error'
export type CanvasTab = 'canvas' | 'materialfluss' | 'vergleich'

type Props = {
  projectId: string
  projectName: string
  saveStatus: SaveStatus
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  activeTab: CanvasTab
  onTabChange: (tab: CanvasTab) => void
}

const SAVE_STATUS_CONFIG: Record<
  SaveStatus,
  { label: string; icon: React.ReactNode; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  saved: {
    label: 'Gespeichert',
    icon: <Check className="h-3 w-3" />,
    variant: 'secondary',
  },
  saving: {
    label: 'Speichern...',
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
    variant: 'secondary',
  },
  unsaved: {
    label: 'Nicht gespeichert',
    icon: null,
    variant: 'outline',
  },
  error: {
    label: 'Fehler',
    icon: <AlertCircle className="h-3 w-3" />,
    variant: 'destructive',
  },
}

export function CanvasHeader({ projectId, projectName, saveStatus, zoom, onZoomIn, onZoomOut, activeTab, onTabChange }: Props) {
  const status = SAVE_STATUS_CONFIG[saveStatus]

  return (
    <header className="h-12 border-b border-border bg-background/95 backdrop-blur flex items-center justify-between px-4 shrink-0 z-10">
      {/* Left: logo + breadcrumb */}
      <div className="flex items-center gap-3">
        <Link href="/">
          <Image src="/logo.svg" alt="NEONEX" width={80} height={14} style={{ height: 'auto' }} priority />
        </Link>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Projekte
        </Link>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium truncate max-w-[200px]">{projectName}</span>
      </div>

      {/* Center: tab toggle */}
      <div className="flex items-center gap-1 border border-border rounded-md p-0.5">
        <Button
          variant={activeTab === 'canvas' ? 'secondary' : 'ghost'}
          size="sm"
          className="h-7 px-3 text-xs rounded-sm"
          onClick={() => onTabChange('canvas')}
        >
          Layout
        </Button>
        <Button
          variant={activeTab === 'materialfluss' ? 'secondary' : 'ghost'}
          size="sm"
          className="h-7 px-3 text-xs rounded-sm"
          onClick={() => onTabChange('materialfluss')}
        >
          Materialfluss
        </Button>
        <Button
          variant={activeTab === 'vergleich' ? 'secondary' : 'ghost'}
          size="sm"
          className="h-7 px-3 text-xs rounded-sm"
          onClick={() => onTabChange('vergleich')}
        >
          Vergleich
        </Button>
      </div>

      {/* Right: save status + zoom controls (canvas-only) */}
      <div className="flex items-center gap-3">
        {/* Save status badge */}
        <Badge variant={status.variant} className="gap-1 text-xs font-normal">
          {status.icon}
          {status.label}
        </Badge>

        {/* Zoom controls — only relevant on canvas tab */}
        {activeTab === 'canvas' && (
          <div className="flex items-center gap-1 border border-border rounded-md">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-r-none"
              onClick={onZoomOut}
              aria-label="Herauszoomen"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs font-mono w-12 text-center tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-l-none"
              onClick={onZoomIn}
              aria-label="Hineinzoomen"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </header>
  )
}
