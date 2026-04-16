'use server'

import { createClient } from '@/utils/supabase/server'

export type CanvasLayout = {
  id: string
  project_id: string
  name: string
  sort_order: number
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

export async function getOrCreateCanvasLayout(projectId: string, variantId?: string): Promise<CanvasData | null> {
  const supabase = await createClient()

  // Try to get a specific variant or the first one
  let query = supabase
    .from('canvas_layouts')
    .select('*')
    .eq('project_id', projectId)

  if (variantId) {
    query = query.eq('id', variantId)
  } else {
    query = query.order('sort_order').limit(1)
  }

  const { data: rows } = await query
  const existing = rows?.[0] ?? null

  if (existing) {
    const { data: objects } = await supabase
      .from('canvas_objects')
      .select('*')
      .eq('canvas_layout_id', existing.id)
      .order('created_at')

    return { layout: existing, objects: objects ?? [] }
  }

  // Create new default layout (only if no variants exist at all)
  const { data: created, error } = await supabase
    .from('canvas_layouts')
    .insert({
      project_id: projectId,
      name: 'Variante 1',
      sort_order: 1,
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

// ── Variant management ────────────────────────────────────────────────────────

export type VariantActionResult = { success: boolean; error?: string; variant?: CanvasLayout }

export async function getVariants(projectId: string): Promise<CanvasLayout[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('canvas_layouts')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order')

  return data ?? []
}

export async function createVariant(
  projectId: string,
  name: string,
  copyFromId?: string
): Promise<VariantActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  // Determine next sort_order
  const { data: existing } = await supabase
    .from('canvas_layouts')
    .select('sort_order')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = (existing?.[0]?.sort_order ?? 0) + 1

  // Create new layout row
  const { data: newLayout, error: layoutError } = await supabase
    .from('canvas_layouts')
    .insert({
      project_id: projectId,
      name,
      sort_order: nextOrder,
      grid_cell_size: 1.0,
      canvas_width: 50,
      canvas_height: 30,
    })
    .select()
    .single()

  if (layoutError || !newLayout) {
    return { success: false, error: layoutError?.message ?? 'Failed to create variant' }
  }

  // If copying, deep-copy objects and flows
  if (copyFromId) {
    // Fetch source layout settings and copy them
    const { data: sourceLayout } = await supabase
      .from('canvas_layouts')
      .select('canvas_width, canvas_height, grid_cell_size, cost_per_meter, meters_per_cell')
      .eq('id', copyFromId)
      .single()

    if (sourceLayout) {
      await supabase
        .from('canvas_layouts')
        .update({
          canvas_width: sourceLayout.canvas_width,
          canvas_height: sourceLayout.canvas_height,
          grid_cell_size: sourceLayout.grid_cell_size,
          cost_per_meter: sourceLayout.cost_per_meter,
          meters_per_cell: sourceLayout.meters_per_cell,
        })
        .eq('id', newLayout.id)
    }

    // Deep copy objects with new IDs
    const { data: sourceObjects } = await supabase
      .from('canvas_objects')
      .select('*')
      .eq('canvas_layout_id', copyFromId)

    if (sourceObjects && sourceObjects.length > 0) {
      // Build id mapping: old_id → new_id
      const idMap = new Map<string, string>()
      const newObjects = sourceObjects.map((o) => {
        const newId = crypto.randomUUID()
        idMap.set(o.id, newId)
        return {
          id: newId,
          canvas_layout_id: newLayout.id,
          type: o.type,
          label: o.label,
          pos_x: o.pos_x,
          pos_y: o.pos_y,
          width: o.width,
          height: o.height,
          color: o.color,
          machine_type_id: o.machine_type_id,
        }
      })

      await supabase.from('canvas_objects').insert(newObjects)

      // Deep copy material flows with re-mapped node IDs
      const { data: sourceFlows } = await supabase
        .from('material_flows')
        .select('*')
        .eq('canvas_layout_id', copyFromId)

      if (sourceFlows && sourceFlows.length > 0) {
        const newFlows = sourceFlows
          .map((f) => ({
            canvas_layout_id: newLayout.id,
            from_node_id: idMap.get(f.from_node_id),
            to_node_id: idMap.get(f.to_node_id),
            quantity: f.quantity,
            frequency: f.frequency,
            transport_intensity: f.transport_intensity,
            material_name: f.material_name,
          }))
          .filter((f) => f.from_node_id && f.to_node_id)

        if (newFlows.length > 0) {
          await supabase.from('material_flows').insert(newFlows)
        }
      }
    }
  }

  // Re-fetch to get final state (with updated settings if copied)
  const { data: finalLayout } = await supabase
    .from('canvas_layouts')
    .select('*')
    .eq('id', newLayout.id)
    .single()

  return { success: true, variant: finalLayout ?? newLayout }
}

export async function renameVariant(layoutId: string, name: string): Promise<VariantActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { error } = await supabase
    .from('canvas_layouts')
    .update({ name })
    .eq('id', layoutId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function deleteVariant(layoutId: string): Promise<VariantActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  // Verify ownership and count siblings
  const { data: layout } = await supabase
    .from('canvas_layouts')
    .select('id, project_id, projects!inner(user_id)')
    .eq('id', layoutId)
    .eq('projects.user_id', user.id)
    .single()

  if (!layout) return { success: false, error: 'Not found or access denied' }

  const { count } = await supabase
    .from('canvas_layouts')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', layout.project_id)

  if ((count ?? 0) <= 1) {
    return { success: false, error: 'Letzte Variante kann nicht gelöscht werden' }
  }

  const { error } = await supabase.from('canvas_layouts').delete().eq('id', layoutId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

// KPI data per variant for the comparison panel (computed server-side)
export type VariantKpi = {
  layoutId: string
  name: string
  totalDistance: number
  totalCost: number
  totalTransports: number
  objectCount: number
  flowCount: number
}

export async function getVariantKpis(projectId: string): Promise<VariantKpi[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: layouts } = await supabase
    .from('canvas_layouts')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order')

  if (!layouts || layouts.length === 0) return []

  const results: VariantKpi[] = []

  for (const layout of layouts) {
    const { data: objects } = await supabase
      .from('canvas_objects')
      .select('id, pos_x, pos_y, width, height')
      .eq('canvas_layout_id', layout.id)

    const { data: flows } = await supabase
      .from('material_flows')
      .select('from_node_id, to_node_id, transport_intensity, frequency')
      .eq('canvas_layout_id', layout.id)

    const nodeMap = new Map(
      (objects ?? []).map((o) => [o.id, o])
    )

    let totalDistance = 0
    let totalTransports = 0
    const metersPerCell = layout.meters_per_cell ?? 1

    for (const f of flows ?? []) {
      const from = nodeMap.get(f.from_node_id)
      const to = nodeMap.get(f.to_node_id)
      if (!from || !to) continue

      const fromCX = from.pos_x + from.width / 2
      const fromCY = from.pos_y + from.height / 2
      const toCX = to.pos_x + to.width / 2
      const toCY = to.pos_y + to.height / 2

      const dx = toCX - fromCX
      const dy = toCY - fromCY
      const distM = Math.sqrt(dx * dx + dy * dy) * metersPerCell

      totalDistance += f.transport_intensity * distM
      totalTransports += f.frequency
    }

    results.push({
      layoutId: layout.id,
      name: layout.name,
      totalDistance,
      totalCost: totalDistance * (layout.cost_per_meter ?? 0),
      totalTransports,
      objectCount: objects?.length ?? 0,
      flowCount: flows?.length ?? 0,
    })
  }

  return results
}
