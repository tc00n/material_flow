'use client'

import { memo } from 'react'
import { NodeProps } from '@xyflow/react'
import { Package, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { CanvasObjectType } from '@/app/actions/canvas'

export type MachineNodeData = {
  label: string
  objectType: CanvasObjectType
  widthUnits: number
  heightUnits: number
  color?: string
  hasOverlap?: boolean
  machine_type_id?: string
}

const TYPE_ICONS = {
  machine: Package,
  source: ArrowDownCircle,
  sink: ArrowUpCircle,
}

const TYPE_COLORS: Record<CanvasObjectType, string> = {
  machine: '#003C73',
  source: '#16a34a',
  sink: '#dc2626',
}

function MachineNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as MachineNodeData
  const Icon = TYPE_ICONS[nodeData.objectType] ?? Package
  const baseColor = nodeData.color ?? TYPE_COLORS[nodeData.objectType] ?? '#003C73'

  const borderColor = nodeData.hasOverlap
    ? '#dc2626'
    : selected
      ? '#f59e0b'
      : baseColor

  const borderWidth = nodeData.hasOverlap || selected ? 2 : 1

  return (
    <div
      className="w-full h-full rounded flex flex-col items-center justify-center gap-1 select-none overflow-hidden"
      style={{
        backgroundColor: `${baseColor}18`,
        border: `${borderWidth}px solid ${borderColor}`,
        boxShadow: selected
          ? `0 0 0 2px ${borderColor}40`
          : '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      <Icon
        style={{ color: baseColor, flexShrink: 0 }}
        size={nodeData.heightUnits >= 2 ? 18 : 14}
        strokeWidth={1.5}
      />
      <span
        className="font-medium text-center leading-tight px-1"
        style={{
          color: baseColor,
          fontSize: nodeData.heightUnits >= 2 ? '11px' : '9px',
          maxWidth: '90%',
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {nodeData.label}
      </span>
      {nodeData.hasOverlap && (
        <span className="text-[8px] text-red-600 font-medium">Überlappung</span>
      )}
    </div>
  )
}

export const MachineNode = memo(MachineNodeComponent)
