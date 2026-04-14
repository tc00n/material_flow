import { useMemo } from 'react'
import { Node } from '@xyflow/react'
import { MaterialFlowWithLabels } from '@/app/actions/material-flows'
import { MachineNodeData } from '@/components/canvas/machine-node'

const CELL_SIZE = 60

export type KpiResult = {
  totalDistance: number   // meters/day
  totalCost: number       // €/day
  totalTransports: number // transports/day
  top3Flows: Array<{
    id: string
    fromLabel: string
    toLabel: string
    intensity: number
    distanceM: number
  }>
}

export function useKpiCalculation(
  nodes: Node[],
  flows: MaterialFlowWithLabels[],
  costPerMeter: number,
  metersPerCell: number
): KpiResult {
  return useMemo(() => {
    if (flows.length === 0) {
      return { totalDistance: 0, totalCost: 0, totalTransports: 0, top3Flows: [] }
    }

    const nodeMap = new Map(nodes.map((n) => [n.id, n]))

    let totalDistance = 0
    let totalTransports = 0

    const flowsWithDistance = flows.map((f) => {
      const fromNode = nodeMap.get(f.from_node_id)
      const toNode = nodeMap.get(f.to_node_id)

      if (!fromNode || !toNode) {
        return { flow: f, distanceM: 0 }
      }

      const fromData = fromNode.data as MachineNodeData
      const toData = toNode.data as MachineNodeData

      // Node centres in grid units
      const fromCX = fromNode.position.x / CELL_SIZE + fromData.widthUnits / 2
      const fromCY = fromNode.position.y / CELL_SIZE + fromData.heightUnits / 2
      const toCX = toNode.position.x / CELL_SIZE + toData.widthUnits / 2
      const toCY = toNode.position.y / CELL_SIZE + toData.heightUnits / 2

      const dx = toCX - fromCX
      const dy = toCY - fromCY
      const distCells = Math.sqrt(dx * dx + dy * dy)
      const distanceM = distCells * metersPerCell

      return { flow: f, distanceM }
    })

    flowsWithDistance.forEach(({ flow, distanceM }) => {
      totalDistance += flow.transport_intensity * distanceM
      totalTransports += flow.frequency
    })

    const top3Flows = [...flowsWithDistance]
      .sort((a, b) => b.flow.transport_intensity - a.flow.transport_intensity)
      .slice(0, 3)
      .map(({ flow, distanceM }) => ({
        id: flow.id,
        fromLabel: flow.from_label,
        toLabel: flow.to_label,
        intensity: flow.transport_intensity,
        distanceM,
      }))

    return {
      totalDistance,
      totalCost: totalDistance * costPerMeter,
      totalTransports,
      top3Flows,
    }
  }, [nodes, flows, costPerMeter, metersPerCell])
}
