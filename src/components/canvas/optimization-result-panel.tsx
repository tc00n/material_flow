'use client'

import { ArrowRight, CheckCircle2, TrendingDown, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

type Props = {
  scoreBefore: number
  scoreAfter: number
  onAccept: () => void
  onDiscard: () => void
}

export function OptimizationResultPanel({ scoreBefore, scoreAfter, onAccept, onDiscard }: Props) {
  const improvement = scoreBefore > 0 ? ((scoreBefore - scoreAfter) / scoreBefore) * 100 : 0
  const improved = scoreAfter < scoreBefore - 0.01

  const fmt = (n: number) =>
    n.toLocaleString('de-DE', { maximumFractionDigits: 1 })

  return (
    <div className="flex h-full">
      {/* Collapse strip (visual match with KpiPanel) */}
      <div className="w-5 bg-muted/40 border-l border-border flex-shrink-0" />

      <div className="w-64 border-l border-border bg-background overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Optimierungsergebnis</span>
          </div>

          {/* Result card */}
          <Card
            className={
              improved
                ? 'border-green-300 bg-green-50/50'
                : 'border-amber-300 bg-amber-50/50'
            }
          >
            <CardHeader className="px-3 pt-2.5 pb-0">
              <CardTitle className="text-[11px] font-medium text-muted-foreground">
                Transportdistanz
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 pt-2 space-y-2">
              <div className="flex items-center gap-1.5 text-sm flex-wrap">
                <span className="tabular-nums text-muted-foreground line-through">
                  {fmt(scoreBefore)} m/Tag
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="tabular-nums font-bold">{fmt(scoreAfter)} m/Tag</span>
              </div>

              {improved ? (
                <div className="inline-flex items-center gap-1 rounded-full bg-green-100 border border-green-200 px-2 py-0.5 text-xs font-semibold text-green-700">
                  <TrendingDown className="h-3 w-3" />
                  −{improvement.toFixed(1)} %
                </div>
              ) : (
                <p className="text-xs text-amber-700 leading-relaxed">
                  Kein besseres Layout gefunden — aktuelles Layout ist bereits gut.
                </p>
              )}
            </CardContent>
          </Card>

          <Separator />

          <p className="text-xs text-muted-foreground leading-relaxed">
            Vorschau aktiv. Übernehme das optimierte Layout oder verwirf die Änderungen.
          </p>

          {/* Accept / Discard */}
          <div className="space-y-2">
            <Button className="w-full gap-2" size="sm" onClick={onAccept}>
              <CheckCircle2 className="h-3.5 w-3.5" />
              Übernehmen
            </Button>
            <Button
              variant="outline"
              className="w-full gap-2"
              size="sm"
              onClick={onDiscard}
            >
              <XCircle className="h-3.5 w-3.5" />
              Verwerfen
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
