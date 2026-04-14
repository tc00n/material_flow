'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'

export type Project = {
  id: string
  user_id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

const CreateProjectSchema = z.object({
  name: z.string().min(1, 'Projektname ist erforderlich').max(100, 'Name zu lang'),
  description: z.string().max(500, 'Beschreibung zu lang').optional(),
})

const UpdateProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Projektname ist erforderlich').max(100, 'Name zu lang'),
  description: z.string().max(500, 'Beschreibung zu lang').optional(),
})

export type ActionResult = {
  error?: string
  success?: boolean
}

export async function getProjects(): Promise<Project[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Error fetching projects:', error)
    return []
  }

  return data ?? []
}

export async function createProject(
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const parsed = CreateProjectSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') || undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { error } = await supabase.from('projects').insert({
    user_id: user.id,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
  })

  if (error) {
    console.error('Error creating project:', error)
    return { error: 'Projekt konnte nicht erstellt werden.' }
  }

  revalidatePath('/')
  return { success: true }
}

export async function updateProject(
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const parsed = UpdateProjectSchema.safeParse({
    id: formData.get('id'),
    name: formData.get('name'),
    description: formData.get('description') || undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { error } = await supabase
    .from('projects')
    .update({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
    })
    .eq('id', parsed.data.id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error updating project:', error)
    return { error: 'Projekt konnte nicht aktualisiert werden.' }
  }

  revalidatePath('/')
  return { success: true }
}

export async function deleteProject(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error deleting project:', error)
    return { error: 'Projekt konnte nicht gelöscht werden.' }
  }

  revalidatePath('/')
  return { success: true }
}
