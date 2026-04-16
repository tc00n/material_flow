'use client'

import { useEffect, useState, useTransition } from 'react'
import { RefreshCw, TrendingDown, Route, Euro, BarChart3, Hash, GitBranch } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getVariantKpis, VariantKpi } from '@/app/actions/canvas'

type Props = {
  projectId: string
}

type KpiRow = {
  key: keyof Omit<VariantKpi, 'layoutId' | 'name'>
  label: string
  unit: string
  icon: React.ReactNode
  format: (v: number) => string
  lowerIsBetter: boolean
}

const KPI_ROWS: KpiRow[] = [
  {
    key: 'totalDistance',
    label: 'Gesamtdistanz',
    unit: 'm/Tag',
    icon: <Route className="h-3.5 w-3.5" />,
    format: (v) => v.toLocaleString('de-DE', { maximumFractionDigits: 1 }),
    lowerIsBetter: true,
  },
  {
    key: 'totalCost',
    label: 'Transportkosten',
    unit: '€/Tag',
    icon: <Euro className="h-3.5 w-3.5" />,
    format: (v) => v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    lowerIsBetter: true,
  },
  {
    key: 'totalTransports',
    label: 'Transporte',
    unit: '/Tag',
    icon: <TrendingDown className="h-3.5 w-3.5" />,
    format: (v) => v.toLocaleString('de-DE'),
    lowerIsBetter: false,
  },
  {
    key: 'objectCount',
    label: 'Stationen',
    unit: '',
    icon: <Hash className="h-3.5 w-3.5" />,
    format: (v) => v.toLocaleString('de-DE'),
    lowerIsBetter: false,
  },
  {
    key: 'flowCount',
    label: 'Materialflüsse',
    unit: '',
    icon: <GitBranch className="h-3.5 w-3.5" />,
    format: (v) => v.toLocaleString('de-DE'),
    lowerIsBetter: false,
  },
]

export function KpiComparisonPanel({ projectId }: Props) {
  const [kpis, setKpis] = useState<VariantKpi[]>([])
  const [isPending, startTransition] = useTransition()

  function load() {
    startTransition(async () => {
      const data = await getVariantKpis(projectId)
      setKpis(data)
    })
  }

  useEffect(() => {
    load()
  }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (isPending && kpis.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="space-y-3 w-full max-w-2xl px-8">
          <Skeleton className="h-8 w-48" />
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (kpis.length === 0 && !isPending) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Keine Varianten gefunden.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Varianten-Vergleich</h2>
            <span className="text-xs text-muted-foreground">({kpis.length} Varianten)</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={load}
            disabled={isPending}
          >
            <RefreshCw className={`h-3 w-3 ${isPending ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
        </div>

        {/* Comparison table */}
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground w-44">
                  Kennzahl
                </th>
                {kpis.map((k) => (
                  <th
                    key={k.layoutId}
                    className="px-4 py-2.5 text-right text-xs font-medium truncate max-w-[160px]"
                    title={k.name}
                  >
                    {k.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {KPI_ROWS.map((row, rowIdx) => {
                const values = kpis.map((k) => k[row.key])
                const best = row.lowerIsBetter ? Math.min(...values) : Math.max(...values)
                const allSame = values.every((v) => v === values[0])

                return (
                  <tr
                    key={row.key}
                    className={rowIdx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {row.icon}
                        <span className="font-medium text-foreground">{row.label}</span>
                        {row.unit && <span className="text-[10px]">({row.unit})</span>}
                      </div>
                    </td>
                    {kpis.map((k) => {
                      const val = k[row.key]
                      const isBest = !allSame && val === best
                      return (
                        <td
                          key={k.layoutId}
                          className={`px-4 py-3 text-right tabular-nums text-xs font-mono ${
                            isBest
                              ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                              : ''
                          }`}
                        >
                          <span
                            className={
                              isBest
                                ? 'inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-md'
                                : ''
                            }
                          >
                            {row.format(val)}
                            {row.unit && (
                              <span className="text-[10px] text-muted-foreground ml-1 font-sans">
                                {row.unit}
                              </span>
                            )}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-emerald-50 border border-emerald-200" />
          Bester Wert je Kennzahl
        </p>
      </div>
    </div>
  )
}
