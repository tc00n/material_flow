'use server'

import { createClient } from '@/utils/supabase/server'

export type MaterialFlow = {
  id: string
  canvas_layout_id: string
  from_node_id: string
  to_node_id: string
  quantity: number
  frequency: number
  transport_intensity: number
  material_name: string | null
  created_at: string
}

export type MaterialFlowWithLabels = MaterialFlow & {
  from_label: string
  to_label: string
}

export async function getMaterialFlows(layoutId: string): Promise<MaterialFlowWithLabels[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Verify ownership via canvas_layouts → projects
  const { data: layout } = await supabase
    .from('canvas_layouts')
    .select('id, projects!inner(user_id)')
    .eq('id', layoutId)
    .eq('projects.user_id', user.id)
    .single()

  if (!layout) return []

  const { data: flows, error } = await supabase
    .from('material_flows')
    .select(`
      *,
      from_node:canvas_objects!from_node_id(label),
      to_node:canvas_objects!to_node_id(label)
    `)
    .eq('canvas_layout_id', layoutId)
    .order('created_at')

  if (error) {
    console.error('Error fetching material flows:', error)
    return []
  }

  return (flows ?? []).map((f) => ({
    id: f.id,
    canvas_layout_id: f.canvas_layout_id,
    from_node_id: f.from_node_id,
    to_node_id: f.to_node_id,
    quantity: f.quantity,
    frequency: f.frequency,
    transport_intensity: f.transport_intensity,
    material_name: f.material_name,
    created_at: f.created_at,
    from_label: (f.from_node as { label: string } | null)?.label ?? 'Unbekannt',
    to_label: (f.to_node as { label: string } | null)?.label ?? 'Unbekannt',
  }))
}

type CreateFlowInput = {
  canvas_layout_id: string
  from_node_id: string
  to_node_id: string
  quantity: number
  frequency: number
  material_name?: string | null
}

export type FlowActionResult = { success: boolean; error?: string }

export async function createMaterialFlow(input: CreateFlowInput): Promise<FlowActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet' }

  // Verify ownership
  const { data: layout } = await supabase
    .from('canvas_layouts')
    .select('id, projects!inner(user_id)')
    .eq('id', input.canvas_layout_id)
    .eq('projects.user_id', user.id)
    .single()

  if (!layout) return { success: false, error: 'Layout nicht gefunden' }

  // Validate: no self-flow
  if (input.from_node_id === input.to_node_id) {
    return { success: false, error: 'Von und Nach dürfen nicht identisch sein' }
  }

  const { error } = await supabase.from('material_flows').insert({
    canvas_layout_id: input.canvas_layout_id,
    from_node_id: input.from_node_id,
    to_node_id: input.to_node_id,
    quantity: input.quantity,
    frequency: input.frequency,
    transport_intensity: input.quantity * input.frequency,
    material_name: input.material_name ?? null,
  })

  if (error) {
    console.error('Error creating material flow:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

type UpdateFlowInput = {
  id: string
  from_node_id: string
  to_node_id: string
  quantity: number
  frequency: number
  material_name?: string | null
}

export async function updateMaterialFlow(input: UpdateFlowInput): Promise<FlowActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet' }

  // Validate: no self-flow
  if (input.from_node_id === input.to_node_id) {
    return { success: false, error: 'Von und Nach dürfen nicht identisch sein' }
  }

  // Verify ownership (flow → layout → project)
  const { data: flow } = await supabase
    .from('material_flows')
    .select('id, canvas_layouts!inner(projects!inner(user_id))')
    .eq('id', input.id)
    .single()

  if (!flow) return { success: false, error: 'Fluss nicht gefunden' }

  const { error } = await supabase
    .from('material_flows')
    .update({
      from_node_id: input.from_node_id,
      to_node_id: input.to_node_id,
      quantity: input.quantity,
      frequency: input.frequency,
      transport_intensity: input.quantity * input.frequency,
      material_name: input.material_name ?? null,
    })
    .eq('id', input.id)

  if (error) {
    console.error('Error updating material flow:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function deleteMaterialFlow(id: string): Promise<FlowActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht angemeldet' }

  const { error } = await supabase
    .from('material_flows')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting material flow:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}
