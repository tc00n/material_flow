'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, TrendingUp, Route, Euro, BarChart3, Zap } from 'lucide-react'
import { Node } from '@xyflow/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MaterialFlowWithLabels } from '@/app/actions/material-flows'
import { CanvasLayout, updateLayoutSettings } from '@/app/actions/canvas'
import { useKpiCalculation } from '@/hooks/use-kpi-calculation'

type Props = {
  nodes: Node[]
  flows: MaterialFlowWithLabels[]
  layout: CanvasLayout
  onSettingsChange: (cost_per_meter: number, meters_per_cell: number) => void
  onOptimize: () => void
  canOptimize: boolean
  isOptimizing: boolean
}

export function KpiPanel({ nodes, flows, layout, onSettingsChange, onOptimize, canOptimize, isOptimizing }: Props) {
  const [open, setOpen] = useState(true)
  const [costPerMeter, setCostPerMeter] = useState(layout.cost_per_meter)
  const [metersPerCell, setMetersPerCell] = useState(layout.meters_per_cell)
  const [isSaving, setIsSaving] = useState(false)

  const kpi = useKpiCalculation(nodes, flows, costPerMeter, metersPerCell)

  async function handleSettingBlur() {
    setIsSaving(true)
    await updateLayoutSettings({
      layoutId: layout.id,
      cost_per_meter: costPerMeter,
      meters_per_cell: metersPerCell,
    })
    setIsSaving(false)
    onSettingsChange(costPerMeter, metersPerCell)
  }

  const hasFlows = flows.length > 0

  return (
    <div className="flex h-full">
      {/* Collapse toggle strip */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center w-5 bg-muted/40 border-l border-border hover:bg-muted/70 transition-colors flex-shrink-0"
        aria-label={open ? 'KPI-Panel einklappen' : 'KPI-Panel ausklappen'}
      >
        {open ? (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>

      <Collapsible open={open} className="flex">
        <CollapsibleContent className="w-64 border-l border-border bg-background overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Kennzahlen</span>
              {isSaving && (
                <span className="ml-auto text-[10px] text-muted-foreground">speichern…</span>
              )}
            </div>

            {!hasFlows ? (
              <div className="rounded-md bg-muted/50 border border-border px-3 py-4 text-center">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Keine Daten — bitte Materialflüsse definieren
                </p>
              </div>
            ) : (
              <>
                {/* KPI Cards */}
                <div className="space-y-2">
                  <KpiCard
                    icon={<Route className="h-3.5 w-3.5" />}
                    label="Gesamtdistanz"
                    value={kpi.totalDistance.toLocaleString('de-DE', { maximumFractionDigits: 1 })}
                    unit="m/Tag"
                  />
                  <KpiCard
                    icon={<Euro className="h-3.5 w-3.5" />}
                    label="Transportkosten"
                    value={kpi.totalCost.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    unit="€/Tag"
                  />
                  <KpiCard
                    icon={<TrendingUp className="h-3.5 w-3.5" />}
                    label="Transporte"
                    value={kpi.totalTransports.toLocaleString('de-DE')}
                    unit="/Tag"
                  />
                </div>

                <Separator />

                {/* Top 3 Flows */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Top 3 Flüsse nach Intensität</p>
                  <div className="space-y-1.5">
                    {kpi.top3Flows.map((f, i) => (
                      <div key={f.id} className="rounded-md bg-muted/40 px-2.5 py-2 text-xs">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Badge variant="outline" className="h-4 w-4 flex items-center justify-center p-0 text-[9px]">
                            {i + 1}
                          </Badge>
                          <span className="truncate">{f.fromLabel} → {f.toLabel}</span>
                        </div>
                        <div className="mt-0.5 text-muted-foreground flex gap-2">
                          <span>Intensität: {f.intensity.toLocaleString('de-DE')}</span>
                          <span>·</span>
                          <span>{f.distanceM.toLocaleString('de-DE', { maximumFractionDigits: 1 })} m</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Settings */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Einstellungen</p>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Kostensatz (€/m)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={costPerMeter}
                    onChange={(e) => setCostPerMeter(parseFloat(e.target.value) || 0)}
                    onBlur={handleSettingBlur}
                    className="h-7 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Meter pro Zelle (m)</Label>
                  <Input
                    type="number"
                    min={0.01}
                    step={0.1}
                    value={metersPerCell}
                    onChange={(e) => setMetersPerCell(parseFloat(e.target.value) || 1)}
                    onBlur={handleSettingBlur}
                    className="h-7 text-xs"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Optimize button */}
            <Button
              className="w-full gap-2"
              size="sm"
              onClick={onOptimize}
              disabled={!canOptimize || isOptimizing}
              title={
                !hasFlows
                  ? 'Bitte zuerst Materialflüsse definieren'
                  : nodes.length < 2
                  ? 'Mindestens 2 Stationen erforderlich'
                  : undefined
              }
            >
              <Zap className="h-3.5 w-3.5" />
              {isOptimizing ? 'Optimierung läuft…' : 'Layout optimieren'}
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

function KpiCard({
  icon,
  label,
  value,
  unit,
}: {
  icon: React.ReactNode
  label: string
  value: string
  unit: string
}) {
  return (
    <Card className="py-0">
      <CardHeader className="px-3 pt-2.5 pb-0">
        <CardTitle className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          {icon}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-2.5 pt-1">
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold tabular-nums leading-none">{value}</span>
          <span className="text-[11px] text-muted-foreground">{unit}</span>
        </div>
      </CardContent>
    </Card>
  )
}
