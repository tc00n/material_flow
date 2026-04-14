'use server'

import { createClient } from '@/utils/supabase/server'

export type MachineType = {
  id: string
  project_id: string
  name: string
  width_m: number
  height_m: number
  color: string
  description: string | null
  created_at: string
}

export type MachineTypeInput = {
  name: string
  width_m: number
  height_m: number
  color: string
  description?: string
}

export type MachineTypeResult =
  | { success: true; data: MachineType }
  | { success: false; error: string }

export type DeleteMachineTypeResult =
  | { success: true }
  | { success: false; error: string; instanceCount?: number }

export async function getMachineTypes(projectId: string): Promise<MachineType[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('machine_types')
    .select('*')
    .eq('project_id', projectId)
    .order('name')

  return data ?? []
}

export async function createMachineType(
  projectId: string,
  input: MachineTypeInput
): Promise<MachineTypeResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht autorisiert' }

  // Verify project ownership
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (!project) return { success: false, error: 'Projekt nicht gefunden' }

  // Check name uniqueness within project
  const { data: existing } = await supabase
    .from('machine_types')
    .select('id')
    .eq('project_id', projectId)
    .ilike('name', input.name)
    .single()

  if (existing) return { success: false, error: 'Name bereits vergeben' }

  const { data, error } = await supabase
    .from('machine_types')
    .insert({
      project_id: projectId,
      name: input.name.trim(),
      width_m: input.width_m,
      height_m: input.height_m,
      color: input.color,
      description: input.description?.trim() || null,
    })
    .select()
    .single()

  if (error || !data) {
    console.error('Error creating machine type:', error)
    return { success: false, error: error?.message ?? 'Fehler beim Erstellen' }
  }

  return { success: true, data }
}

export async function updateMachineType(
  id: string,
  input: MachineTypeInput
): Promise<MachineTypeResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht autorisiert' }

  // Fetch the type (with project ownership check via join)
  const { data: existing } = await supabase
    .from('machine_types')
    .select('id, project_id, projects!inner(user_id)')
    .eq('id', id)
    .eq('projects.user_id', user.id)
    .single()

  if (!existing) return { success: false, error: 'Typ nicht gefunden' }

  // Check name uniqueness (exclude self)
  const { data: duplicate } = await supabase
    .from('machine_types')
    .select('id')
    .eq('project_id', existing.project_id)
    .ilike('name', input.name)
    .neq('id', id)
    .single()

  if (duplicate) return { success: false, error: 'Name bereits vergeben' }

  const { data, error } = await supabase
    .from('machine_types')
    .update({
      name: input.name.trim(),
      width_m: input.width_m,
      height_m: input.height_m,
      color: input.color,
      description: input.description?.trim() || null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    console.error('Error updating machine type:', error)
    return { success: false, error: error?.message ?? 'Fehler beim Aktualisieren' }
  }

  return { success: true, data }
}

export async function deleteMachineType(id: string): Promise<DeleteMachineTypeResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nicht autorisiert' }

  // Verify ownership via join
  const { data: existing } = await supabase
    .from('machine_types')
    .select('id, projects!inner(user_id)')
    .eq('id', id)
    .eq('projects.user_id', user.id)
    .single()

  if (!existing) return { success: false, error: 'Typ nicht gefunden' }

  // Count canvas instances using this type
  const { count } = await supabase
    .from('canvas_objects')
    .select('*', { count: 'exact', head: true })
    .eq('machine_type_id', id)

  const instanceCount = count ?? 0
  if (instanceCount > 0) {
    return {
      success: false,
      error: `Typ kann nicht gelöscht werden — ${instanceCount} Instanz${instanceCount === 1 ? '' : 'en'} auf dem Canvas`,
      instanceCount,
    }
  }

  const { error } = await supabase.from('machine_types').delete().eq('id', id)

  if (error) {
    console.error('Error deleting machine type:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}
