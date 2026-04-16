'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  useNodesState,
  useReactFlow,
  useViewport,
  Node,
  NodeChange,
  applyNodeChanges,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Eye, EyeOff } from 'lucide-react'
import { CanvasLayout, CanvasObject, saveCanvasObjects } from '@/app/actions/canvas'
import { MachineType } from '@/app/actions/machine-types'
import { getMaterialFlows, MaterialFlowWithLabels } from '@/app/actions/material-flows'
import { MachineNode, MachineNodeData } from '@/components/canvas/machine-node'
import { CanvasHeader, CanvasTab, SaveStatus } from '@/components/canvas/canvas-header'
import { MaterialFlowPanel } from '@/components/canvas/material-flow-panel'
import { Station } from '@/components/canvas/flow-form-dialog'
import { MachineSidebar, SidebarItem } from '@/components/canvas/machine-sidebar'
import { PropertiesPanel } from '@/components/canvas/properties-panel'
import { SpaghettiOverlay } from '@/components/canvas/spaghetti-overlay'
import { KpiPanel } from '@/components/canvas/kpi-panel'
import { FixedObjectsDialog } from '@/components/canvas/fixed-objects-dialog'
import { OptimizationResultPanel } from '@/components/canvas/optimization-result-panel'
import { VariantBar } from '@/components/canvas/variant-bar'
import { KpiComparisonPanel } from '@/components/canvas/kpi-comparison-panel'
import { Button } from '@/components/ui/button'
import { useDebounce } from '@/hooks/use-debounce'
import { useOptimizer } from '@/hooks/use-optimizer'

// 1 grid unit = CELL_SIZE pixels at 100% zoom
const CELL_SIZE = 60
// Snap resolution: 0.5 m = CELL_SIZE / 2 pixels
const SNAP_SIZE = CELL_SIZE / 2

const NODE_TYPES = { machineNode: MachineNode }

// Convert a CanvasObject to a React Flow node
function objectToNode(obj: CanvasObject): Node {
  return {
    id: obj.id,
    type: 'machineNode',
    position: { x: obj.pos_x * CELL_SIZE, y: obj.pos_y * CELL_SIZE },
    data: {
      label: obj.label,
      objectType: obj.type,
      widthUnits: obj.width,
      heightUnits: obj.height,
      color: obj.color ?? undefined,
      hasOverlap: false,
      machine_type_id: obj.machine_type_id ?? undefined,
    } satisfies MachineNodeData,
    style: {
      width: obj.width * CELL_SIZE,
      height: obj.height * CELL_SIZE,
    },
  }
}

// Check if two nodes overlap (bounding box intersection)
function doNodesOverlap(a: Node, b: Node): boolean {
  const aData = a.data as MachineNodeData
  const bData = b.data as MachineNodeData
  const ax1 = a.position.x, ay1 = a.position.y
  const ax2 = ax1 + aData.widthUnits * CELL_SIZE
  const ay2 = ay1 + aData.heightUnits * CELL_SIZE
  const bx1 = b.position.x, by1 = b.position.y
  const bx2 = bx1 + bData.widthUnits * CELL_SIZE
  const by2 = by1 + bData.heightUnits * CELL_SIZE
  return ax1 < bx2 && ax2 > bx1 && ay1 < by2 && ay2 > by1
}

// Mark nodes that overlap with any other node
function applyOverlapFlags(nodes: Node[]): Node[] {
  const overlapSet = new Set<string>()
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (doNodesOverlap(nodes[i], nodes[j])) {
        overlapSet.add(nodes[i].id)
        overlapSet.add(nodes[j].id)
      }
    }
  }
  return nodes.map((n) => ({
    ...n,
    data: { ...n.data, hasOverlap: overlapSet.has(n.id) },
  }))
}

// Clamp a drop position to stay within canvas bounds
function clampPosition(
  x: number,
  y: number,
  widthUnits: number,
  heightUnits: number,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } {
  const maxX = (canvasWidth - widthUnits) * CELL_SIZE
  const maxY = (canvasHeight - heightUnits) * CELL_SIZE
  return {
    x: Math.max(0, Math.min(x, maxX)),
    y: Math.max(0, Math.min(y, maxY)),
  }
}

type CanvasFlowProps = {
  projectName: string
  projectId: string
  layout: CanvasLayout
  initialObjects: CanvasObject[]
  initialMachineTypes: MachineType[]
  variants: CanvasLayout[]
}

function CanvasFlow({ projectName, projectId, layout, initialObjects, initialMachineTypes, variants: initialVariants }: CanvasFlowProps) {
  const router = useRouter()
  const { screenToFlowPosition, zoomIn, zoomOut, fitView } = useReactFlow()
  const viewport = useViewport()
  const { zoom } = viewport
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [variants, setVariants] = useState<CanvasLayout[]>(initialVariants)

  const [nodes, setNodes] = useNodesState(
    applyOverlapFlags(initialObjects.map(objectToNode))
  )
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [activeTab, setActiveTab] = useState<CanvasTab>('canvas')
  const [showSpaghetti, setShowSpaghetti] = useState(false)
  const [flows, setFlows] = useState<MaterialFlowWithLabels[]>([])
  const [kpiSettings, setKpiSettings] = useState({
    cost_per_meter: layout.cost_per_meter,
    meters_per_cell: layout.meters_per_cell,
  })

  // Optimization state
  const [showFixedDialog, setShowFixedDialog] = useState(false)
  const [preOptimizeNodes, setPreOptimizeNodes] = useState<Node[] | null>(null)
  const { isRunning: isOptimizing, result: optimizationResult, run: runOptimizer, reset: resetOptimizer } = useOptimizer()

  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null

  // Load flows on mount for KPI panel
  useEffect(() => {
    getMaterialFlows(layout.id).then(setFlows)
  }, [layout.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle spaghetti overlay — flows already loaded
  async function handleToggleSpaghetti() {
    setShowSpaghetti((prev) => !prev)
  }

  // Re-fetch flows when returning to canvas tab
  useEffect(() => {
    if (activeTab === 'canvas') {
      getMaterialFlows(layout.id).then(setFlows)
    }
  }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save: debounce 2 seconds
  const performSave = useCallback(
    async (nodesToSave: Node[]) => {
      setSaveStatus('saving')
      const objects = nodesToSave.map((n) => {
        const data = n.data as MachineNodeData
        return {
          id: n.id,
          canvas_layout_id: layout.id,
          type: data.objectType,
          label: data.label,
          pos_x: Math.round(n.position.x / SNAP_SIZE) * 0.5,
          pos_y: Math.round(n.position.y / SNAP_SIZE) * 0.5,
          width: data.widthUnits,
          height: data.heightUnits,
          color: data.color ?? null,
          machine_type_id: data.machine_type_id ?? null,
        }
      })
      const result = await saveCanvasObjects(layout.id, objects)
      setSaveStatus(result.success ? 'saved' : 'error')
    },
    [layout.id]
  )

  const debouncedSave = useDebounce(performSave, 2000)

  function markDirtyAndSave(updatedNodes: Node[]) {
    setSaveStatus('unsaved')
    debouncedSave(updatedNodes)
  }

  // Handle node changes (move, select, remove via keyboard)
  function handleNodesChange(changes: NodeChange[]) {
    const safeChanges = changes.filter((c) => c.type !== 'remove')

    setNodes((nds) => {
      const updated = applyNodeChanges(safeChanges, nds)
      const withFlags = applyOverlapFlags(updated)

      const hasPositionChange = safeChanges.some((c) => c.type === 'position' && c.dragging === false)
      if (hasPositionChange) markDirtyAndSave(withFlags)

      return withFlags
    })

    changes.forEach((c) => {
      if (c.type === 'select') {
        setSelectedNodeId(c.selected ? c.id : null)
      }
    })
  }

  // Drop from sidebar onto canvas
  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const raw = e.dataTransfer.getData('application/machineData')
    if (!raw) return

    const item: SidebarItem = JSON.parse(raw)
    const rawPosition = screenToFlowPosition({ x: e.clientX, y: e.clientY })

    const snappedX = Math.round(rawPosition.x / SNAP_SIZE) * SNAP_SIZE
    const snappedY = Math.round(rawPosition.y / SNAP_SIZE) * SNAP_SIZE

    const { x, y } = clampPosition(
      snappedX,
      snappedY,
      item.widthUnits,
      item.heightUnits,
      layout.canvas_width,
      layout.canvas_height
    )

    const newNode: Node = {
      id: crypto.randomUUID(),
      type: 'machineNode',
      position: { x, y },
      data: {
        label: item.label,
        objectType: item.type,
        widthUnits: item.widthUnits,
        heightUnits: item.heightUnits,
        color: item.color,
        hasOverlap: false,
        machine_type_id: item.machine_type_id,
      } satisfies MachineNodeData,
      style: {
        width: item.widthUnits * CELL_SIZE,
        height: item.heightUnits * CELL_SIZE,
      },
    }

    setNodes((nds) => {
      const updated = applyOverlapFlags([...nds, newNode])
      markDirtyAndSave(updated)
      return updated
    })
  }

  // Delete selected node
  function handleDelete(id: string) {
    setNodes((nds) => {
      const updated = applyOverlapFlags(nds.filter((n) => n.id !== id))
      markDirtyAndSave(updated)
      return updated
    })
    setSelectedNodeId(null)
  }

  // Update label of selected node
  function handleLabelChange(id: string, label: string) {
    setNodes((nds) => {
      const updated = nds.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, label } } : n
      )
      markDirtyAndSave(updated)
      return updated
    })
  }

  // Apply preview positions when optimizer finishes
  useEffect(() => {
    if (!optimizationResult) return
    setNodes((nds) =>
      applyOverlapFlags(
        nds.map((n) => {
          const pos = optimizationResult.positions[n.id]
          if (!pos) return n
          return {
            ...n,
            position: { x: pos.pos_x * CELL_SIZE, y: pos.pos_y * CELL_SIZE },
          }
        })
      )
    )
    setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 50)
  }, [optimizationResult]) // eslint-disable-line react-hooks/exhaustive-deps

  // Accept optimized layout: save to DB
  async function handleAcceptOptimization() {
    setNodes((nds) => {
      const withFlags = applyOverlapFlags(nds)
      performSave(withFlags)
      return withFlags
    })
    setPreOptimizeNodes(null)
    resetOptimizer()
  }

  // Discard: restore original nodes
  function handleDiscardOptimization() {
    if (preOptimizeNodes) {
      setNodes(preOptimizeNodes)
    }
    setPreOptimizeNodes(null)
    resetOptimizer()
  }

  // Open fixed-objects dialog
  function handleOpenOptimize() {
    setShowFixedDialog(true)
  }

  // Start optimizer after user selects fixed objects
  function handleOptimizeConfirm(fixedIds: string[]) {
    setShowFixedDialog(false)
    setPreOptimizeNodes(nodes)
    runOptimizer({
      nodes,
      fixedIds,
      flows,
      canvasWidth: layout.canvas_width,
      canvasHeight: layout.canvas_height,
      metersPerCell: kpiSettings.meters_per_cell,
    })
  }

  // When a machine type is updated, sync all canvas nodes linked to it
  function handleTypeUpdated(type: MachineType) {
    setNodes((nds) => {
      const updated = nds.map((n) => {
        const data = n.data as MachineNodeData
        if (data.machine_type_id !== type.id) return n
        return {
          ...n,
          data: {
            ...data,
            label: type.name,
            widthUnits: type.width_m,
            heightUnits: type.height_m,
            color: type.color,
          },
          style: {
            width: type.width_m * CELL_SIZE,
            height: type.height_m * CELL_SIZE,
          },
        }
      })
      const withFlags = applyOverlapFlags(updated)
      markDirtyAndSave(withFlags)
      return withFlags
    })
  }

  // Keyboard: Delete key removes selected node
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Delete' && selectedNodeId) {
        const tag = (e.target as HTMLElement).tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') return
        handleDelete(selectedNodeId)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedNodeId]) // eslint-disable-line react-hooks/exhaustive-deps

  const canvasPixelWidth = layout.canvas_width * CELL_SIZE
  const canvasPixelHeight = layout.canvas_height * CELL_SIZE

  // Derive station list for material flow dropdowns
  const stations: Station[] = nodes.map((n) => ({
    id: n.id,
    label: (n.data as MachineNodeData).label,
  }))

  function handleVariantChange(variantId: string) {
    // BUG-3 fix: flush unsaved changes before navigating away
    if (saveStatus === 'unsaved') {
      performSave(nodes)
    }
    router.push(`?variant=${variantId}`)
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <FixedObjectsDialog
        open={showFixedDialog}
        onOpenChange={setShowFixedDialog}
        nodes={nodes}
        onConfirm={handleOptimizeConfirm}
      />

      <CanvasHeader
        projectId={projectId}
        projectName={projectName}
        saveStatus={saveStatus}
        zoom={zoom}
        onZoomIn={() => zoomIn({ duration: 200 })}
        onZoomOut={() => zoomOut({ duration: 200 })}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Variant tab bar — always visible */}
      <VariantBar
        projectId={projectId}
        variants={variants}
        activeVariantId={layout.id}
        onVariantChange={handleVariantChange}
        onVariantsUpdate={setVariants}
      />

      {activeTab === 'vergleich' ? (
        <KpiComparisonPanel projectId={projectId} />
      ) : activeTab === 'canvas' ? (
        <div className="flex flex-1 min-h-0">
          <MachineSidebar
            projectId={projectId}
            initialMachineTypes={initialMachineTypes}
            onTypeCreated={() => {}}
            onTypeUpdated={handleTypeUpdated}
            onTypeDeleted={() => {}}
          />

          <div
            ref={reactFlowWrapper}
            className="flex-1 relative"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <ReactFlow
              nodes={nodes}
              edges={[]}
              nodeTypes={NODE_TYPES}
              onNodesChange={handleNodesChange}
              onNodeClick={(_, node) => setSelectedNodeId(node.id)}
              onPaneClick={() => setSelectedNodeId(null)}
              snapToGrid
              snapGrid={[SNAP_SIZE, SNAP_SIZE]}
              minZoom={0.25}
              maxZoom={2}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              deleteKeyCode={null}
              panOnScroll={false}
              panOnDrag
              selectionOnDrag={false}
            >
              <Background
                variant={BackgroundVariant.Lines}
                gap={CELL_SIZE}
                color="#e5e7eb"
                style={{ backgroundColor: '#fafafa' }}
              />

              <div
                className="absolute pointer-events-none"
                style={{
                  left: 0,
                  top: 0,
                  width: canvasPixelWidth,
                  height: canvasPixelHeight,
                  border: '2px dashed #cbd5e1',
                  borderRadius: 4,
                }}
              />
            </ReactFlow>

            {/* Spaghetti toggle button — top-right corner */}
            <div className="absolute top-3 right-3 z-20">
              <Button
                variant={showSpaghetti ? 'secondary' : 'outline'}
                size="sm"
                className="h-8 gap-1.5 text-xs shadow-sm"
                onClick={handleToggleSpaghetti}
              >
                {showSpaghetti ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
                {showSpaghetti ? 'Flüsse ausblenden' : 'Materialfluss anzeigen'}
              </Button>
            </div>

            {/* Spaghetti diagram overlay */}
            {showSpaghetti && (
              <SpaghettiOverlay nodes={nodes} flows={flows} viewport={viewport} />
            )}

            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none xl:hidden">
              <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-1.5 text-xs text-amber-700">
                Für optimale Nutzung Desktop-Browser verwenden
              </div>
            </div>

            {/* Loading overlay while optimizer runs */}
            {isOptimizing && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/60 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-3 rounded-xl border bg-background px-8 py-6 shadow-lg">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <p className="text-sm font-medium">Optimierung läuft…</p>
                  <p className="text-xs text-muted-foreground">Simulated Annealing</p>
                </div>
              </div>
            )}
          </div>

          {selectedNode && !optimizationResult ? (
            <PropertiesPanel
              nodeId={selectedNode.id}
              data={selectedNode.data as MachineNodeData}
              onClose={() => setSelectedNodeId(null)}
              onDelete={handleDelete}
              onLabelChange={handleLabelChange}
            />
          ) : optimizationResult ? (
            <OptimizationResultPanel
              scoreBefore={optimizationResult.scoreBefore}
              scoreAfter={optimizationResult.scoreAfter}
              onAccept={handleAcceptOptimization}
              onDiscard={handleDiscardOptimization}
            />
          ) : (
            <KpiPanel
              nodes={nodes}
              flows={flows}
              layout={{ ...layout, ...kpiSettings }}
              onSettingsChange={(cost_per_meter, meters_per_cell) =>
                setKpiSettings({ cost_per_meter, meters_per_cell })
              }
              onOptimize={handleOpenOptimize}
              canOptimize={nodes.length >= 2 && flows.length > 0}
              isOptimizing={isOptimizing}
            />
          )}
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <MaterialFlowPanel layoutId={layout.id} stations={stations} projectName={projectName} />
        </div>
      )}
    </div>
  )
}

type Props = {
  projectName: string
  projectId: string
  layout: CanvasLayout
  initialObjects: CanvasObject[]
  initialMachineTypes: MachineType[]
  variants: CanvasLayout[]
}

export function CanvasClient(props: Props) {
  return (
    <ReactFlowProvider>
      <CanvasFlow {...props} />
    </ReactFlowProvider>
  )
}
