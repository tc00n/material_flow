'use server'

import { createClient } from '@/utils/supabase/server'

export type CanvasLayout = {
  id: string
  project_id: string
  grid_cell_size: number
  canvas_width: number
  canvas_height: number
  cost_per_meter: number
  meters_per_cell: number
  created_at: string
  updated_at: string
}

export type CanvasObjectType = 'machine' | 'source' | 'sink'

export type CanvasObject = {
  id: string
  canvas_layout_id: string
  type: CanvasObjectType
  label: string
  pos_x: number
  pos_y: number
  width: number
  height: number
  color: string | null
  machine_type_id: string | null
}

export type CanvasData = {
  layout: CanvasLayout
  objects: CanvasObject[]
}

export async function getOrCreateCanvasLayout(projectId: string): Promise<CanvasData | null> {
  const supabase = await createClient()

  // Try to get existing layout
  const { data: existing } = await supabase
    .from('canvas_layouts')
    .select('*')
    .eq('project_id', projectId)
    .single()

  if (existing) {
    const { data: objects } = await supabase
      .from('canvas_objects')
      .select('*')
      .eq('canvas_layout_id', existing.id)
      .order('created_at')

    return { layout: existing, objects: objects ?? [] }
  }

  // Create new default layout
  const { data: created, error } = await supabase
    .from('canvas_layouts')
    .insert({
      project_id: projectId,
      grid_cell_size: 1.0,
      canvas_width: 50,
      canvas_height: 30,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating canvas layout:', error)
    return null
  }

  return { layout: created, objects: [] }
}

export type SaveCanvasResult = { success: boolean; error?: string }

export async function saveCanvasObjects(
  layoutId: string,
  objects: Omit<CanvasObject, 'created_at' | 'updated_at'>[]
): Promise<SaveCanvasResult> {
  const supabase = await createClient()

  // Verify the authenticated user owns this layout (defense-in-depth on top of RLS)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data: layout } = await supabase
    .from('canvas_layouts')
    .select('id, projects!inner(user_id)')
    .eq('id', layoutId)
    .eq('projects.user_id', user.id)
    .single()

  if (!layout) return { success: false, error: 'Not found or access denied' }

  // Upsert current objects — preserves existing IDs so that material_flows FK
  // references (ON DELETE CASCADE) are not accidentally triggered.
  if (objects.length > 0) {
    const { error: upsertError } = await supabase
      .from('canvas_objects')
      .upsert(objects, { onConflict: 'id' })

    if (upsertError) {
      console.error('Error upserting canvas objects:', upsertError)
      return { success: false, error: upsertError.message }
    }
  }

  // Delete only objects that are no longer on the canvas (truly removed nodes).
  // This keeps FK-referenced rows intact while still cleaning up deleted nodes.
  const currentIds = objects.map((o) => o.id)
  const deleteQuery = supabase
    .from('canvas_objects')
    .delete()
    .eq('canvas_layout_id', layoutId)

  const { error: deleteError } = currentIds.length > 0
    ? await deleteQuery.not('id', 'in', `(${currentIds.join(',')})`)
    : await deleteQuery

  if (deleteError) {
    console.error('Error deleting removed canvas objects:', deleteError)
    return { success: false, error: deleteError.message }
  }

  return { success: true }
}

export type UpdateLayoutSettingsInput = {
  layoutId: string
  cost_per_meter: number
  meters_per_cell: number
}

export async function updateLayoutSettings(
  input: UpdateLayoutSettingsInput
): Promise<SaveCanvasResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data: layout } = await supabase
    .from('canvas_layouts')
    .select('id, projects!inner(user_id)')
    .eq('id', input.layoutId)
    .eq('projects.user_id', user.id)
    .single()

  if (!layout) return { success: false, error: 'Not found or access denied' }

  const { error } = await supabase
    .from('canvas_layouts')
    .update({
      cost_per_meter: input.cost_per_meter,
      meters_per_cell: input.meters_per_cell,
    })
    .eq('id', input.layoutId)

  if (error) {
    console.error('Error updating layout settings:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}
