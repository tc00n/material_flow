'use client'

import { useState } from 'react'
import { Node } from '@xyflow/react'
import { MaterialFlowWithLabels } from '@/app/actions/material-flows'
import { MachineNodeData } from '@/components/canvas/machine-node'

const CELL_SIZE = 60

export function getLineColor(intensity: number, maxIntensity: number): string {
  if (maxIntensity === 0) return '#22c55e'
  const pct = intensity / maxIntensity
  if (pct < 0.33) return '#22c55e'
  if (pct < 0.66) return '#f97316'
  return '#ef4444'
}

export function getLineWidth(intensity: number, maxIntensity: number): number {
  if (maxIntensity === 0) return 2
  const pct = intensity / maxIntensity
  return 2 + pct * 10
}

type Viewport = { x: number; y: number; zoom: number }

type TooltipState = {
  flow: MaterialFlowWithLabels
  x: number
  y: number
}

type Props = {
  nodes: Node[]
  flows: MaterialFlowWithLabels[]
  viewport: Viewport
}

export function SpaghettiOverlay({ nodes, flows, viewport }: Props) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const maxIntensity = Math.max(...flows.map((f) => f.transport_intensity), 0)

  // Group flows by sorted node pair for parallel offset
  const pairGroups = new Map<string, number[]>()
  flows.forEach((f, i) => {
    const key = [f.from_node_id, f.to_node_id].sort().join('|')
    if (!pairGroups.has(key)) pairGroups.set(key, [])
    pairGroups.get(key)!.push(i)
  })

  const validFlows = flows
    .map((f, i) => {
      const fromNode = nodeMap.get(f.from_node_id)
      const toNode = nodeMap.get(f.to_node_id)
      if (!fromNode || !toNode) return null

      const fromData = fromNode.data as MachineNodeData
      const toData = toNode.data as MachineNodeData

      // Node centers in flow (canvas) coordinates
      const fromCX = fromNode.position.x + (fromData.widthUnits * CELL_SIZE) / 2
      const fromCY = fromNode.position.y + (fromData.heightUnits * CELL_SIZE) / 2
      const toCX = toNode.position.x + (toData.widthUnits * CELL_SIZE) / 2
      const toCY = toNode.position.y + (toData.heightUnits * CELL_SIZE) / 2

      // Convert to screen (SVG) coordinates using viewport transform
      const x1 = fromCX * viewport.zoom + viewport.x
      const y1 = fromCY * viewport.zoom + viewport.y
      const x2 = toCX * viewport.zoom + viewport.x
      const y2 = toCY * viewport.zoom + viewport.y

      // Parallel offset for multiple flows between same node pair
      const key = [f.from_node_id, f.to_node_id].sort().join('|')
      const group = pairGroups.get(key)!
      const groupIndex = group.indexOf(i)
      const groupCount = group.length

      let offsetX = 0
      let offsetY = 0
      if (groupCount > 1) {
        const dx = x2 - x1
        const dy = y2 - y1
        const len = Math.sqrt(dx * dx + dy * dy)
        if (len > 0) {
          const perpX = -dy / len
          const perpY = dx / len
          const offsetAmount = (groupIndex - (groupCount - 1) / 2) * 6
          offsetX = perpX * offsetAmount
          offsetY = perpY * offsetAmount
        }
      }

      return {
        flow: f,
        x1: x1 + offsetX,
        y1: y1 + offsetY,
        x2: x2 + offsetX,
        y2: y2 + offsetY,
        color: getLineColor(f.transport_intensity, maxIntensity),
        width: getLineWidth(f.transport_intensity, maxIntensity),
      }
    })
    .filter((v): v is NonNullable<typeof v> => v !== null)

  if (flows.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <div className="bg-background/90 border border-border backdrop-blur-sm rounded-lg px-4 py-2.5 text-sm text-muted-foreground shadow-sm">
          Keine Materialflüsse definiert — wechsle zum Tab „Materialfluss", um Flüsse anzulegen.
        </div>
      </div>
    )
  }

  return (
    <>
      <svg
        className="absolute inset-0 w-full h-full z-10"
        style={{ overflow: 'visible', pointerEvents: 'none' }}
      >
        {validFlows.map((vf) => (
          <g
            key={vf.flow.id}
            style={{ pointerEvents: 'all', cursor: 'crosshair' }}
            onMouseMove={(e) =>
              setTooltip({ flow: vf.flow, x: e.clientX, y: e.clientY })
            }
            onMouseLeave={() => setTooltip(null)}
          >
            {/* Wide transparent hit area for easier hover */}
            <line
              x1={vf.x1}
              y1={vf.y1}
              x2={vf.x2}
              y2={vf.y2}
              stroke="transparent"
              strokeWidth={Math.max(vf.width + 10, 18)}
            />
            {/* Visible colored line */}
            <line
              x1={vf.x1}
              y1={vf.y1}
              x2={vf.x2}
              y2={vf.y2}
              stroke={vf.color}
              strokeWidth={vf.width}
              strokeLinecap="round"
              opacity={0.85}
            />
          </g>
        ))}
      </svg>

      {/* Tooltip rendered outside SVG as a fixed div */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
        >
          <div className="bg-popover text-popover-foreground border border-border rounded-md shadow-md px-3 py-2 text-xs max-w-[260px]">
            <p className="font-medium">
              Von: {tooltip.flow.from_label} → Nach: {tooltip.flow.to_label}
            </p>
            <p className="text-muted-foreground mt-0.5">
              {tooltip.flow.quantity} Einheiten × {tooltip.flow.frequency}/Tag
              {tooltip.flow.material_name && (
                <span> · {tooltip.flow.material_name}</span>
              )}
            </p>
          </div>
        </div>
      )}
    </>
  )
}
