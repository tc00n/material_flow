'use client'

import { useRef, useState, useCallback } from 'react'
import { Node } from '@xyflow/react'
import { MaterialFlowWithLabels } from '@/app/actions/material-flows'
import { MachineNodeData } from '@/components/canvas/machine-node'

const CELL_SIZE = 60

export type OptimizerResult = {
  positions: Record<string, { pos_x: number; pos_y: number }>
  scoreBefore: number
  scoreAfter: number
}

type RunParams = {
  nodes: Node[]
  fixedIds: string[]
  flows: MaterialFlowWithLabels[]
  canvasWidth: number
  canvasHeight: number
  metersPerCell: number
}

type UseOptimizerReturn = {
  isRunning: boolean
  result: OptimizerResult | null
  error: string | null
  run: (params: RunParams) => void
  reset: () => void
}

export function useOptimizer(): UseOptimizerReturn {
  const workerRef = useRef<Worker | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<OptimizerResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback((params: RunParams) => {
    // Terminate any previous worker
    if (workerRef.current) {
      workerRef.current.terminate()
      workerRef.current = null
    }

    setIsRunning(true)
    setResult(null)
    setError(null)

    const worker = new Worker(
      new URL('../workers/optimizer.worker.ts', import.meta.url)
    )
    workerRef.current = worker

    worker.onmessage = (e: MessageEvent<OptimizerResult>) => {
      setResult(e.data)
      setIsRunning(false)
      worker.terminate()
      workerRef.current = null
    }

    worker.onerror = (e: ErrorEvent) => {
      setError('Optimierung fehlgeschlagen: ' + (e.message ?? 'Unbekannter Fehler'))
      setIsRunning(false)
      worker.terminate()
      workerRef.current = null
    }

    // Convert React Flow nodes to optimizer input format (grid cell coordinates)
    const optimizerNodes = params.nodes.map((n) => {
      const data = n.data as MachineNodeData
      return {
        id: n.id,
        pos_x: Math.round(n.position.x / CELL_SIZE),
        pos_y: Math.round(n.position.y / CELL_SIZE),
        width: data.widthUnits,
        height: data.heightUnits,
      }
    })

    const optimizerFlows = params.flows.map((f) => ({
      from_node_id: f.from_node_id,
      to_node_id: f.to_node_id,
      transport_intensity: f.transport_intensity,
    }))

    worker.postMessage({
      nodes: optimizerNodes,
      fixedIds: params.fixedIds,
      flows: optimizerFlows,
      canvasWidth: params.canvasWidth,
      canvasHeight: params.canvasHeight,
      metersPerCell: params.metersPerCell,
    })
  }, [])

  const reset = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate()
      workerRef.current = null
    }
    setIsRunning(false)
    setResult(null)
    setError(null)
  }, [])

  return { isRunning, result, error, run, reset }
}
