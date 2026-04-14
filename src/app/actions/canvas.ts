'use server'

import { createClient } from '@/utils/supabase/server'

export type CanvasLayout = {
  id: string
  project_id: string
  grid_cell_size: number
  canvas_width: number
  canvas_height: number
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

  // Delete all and reinsert for simplicity (debounced, so not too frequent)
  const { error: deleteError } = await supabase
    .from('canvas_objects')
    .delete()
    .eq('canvas_layout_id', layoutId)

  if (deleteError) {
    console.error('Error deleting canvas objects:', deleteError)
    return { success: false, error: deleteError.message }
  }

  if (objects.length === 0) {
    return { success: true }
  }

  const { error: insertError } = await supabase
    .from('canvas_objects')
    .insert(objects)

  if (insertError) {
    console.error('Error inserting canvas objects:', insertError)
    return { success: false, error: insertError.message }
  }

  return { success: true }
}
