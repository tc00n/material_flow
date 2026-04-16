import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getOrCreateCanvasLayout, getVariants } from '@/app/actions/canvas'
import { getMachineTypes } from '@/app/actions/machine-types'
import { CanvasClient } from '@/components/canvas/canvas-client'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ variant?: string }>
}

export default async function CanvasPage({ params, searchParams }: Props) {
  const { id: projectId } = await params
  const { variant: variantId } = await searchParams

  const supabase = await createClient()

  // Auth guard
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch project (verify ownership)
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (projectError || !project) notFound()

  // Load all variants + active variant's canvas data
  const [variants, canvasData] = await Promise.all([
    getVariants(projectId),
    getOrCreateCanvasLayout(projectId, variantId),
  ])

  if (!canvasData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3 max-w-sm">
          <h2 className="text-lg font-semibold">Datenbank noch nicht eingerichtet</h2>
          <p className="text-sm text-muted-foreground">
            Die Canvas-Tabellen fehlen noch. Bitte führe zuerst{' '}
            <code className="bg-muted px-1 rounded text-xs">/backend</code> aus, um die Datenbank
            zu konfigurieren.
          </p>
          <a href="/" className="text-sm text-primary underline underline-offset-4">
            Zurück zum Dashboard
          </a>
        </div>
      </div>
    )
  }

  // Ensure variants list always contains at least the active layout
  const variantList =
    variants.length > 0
      ? variants
      : [canvasData.layout]

  // Fetch machine types for this project
  const machineTypes = await getMachineTypes(projectId)

  return (
    <CanvasClient
      projectId={projectId}
      projectName={project.name}
      layout={canvasData.layout}
      initialObjects={canvasData.objects}
      initialMachineTypes={machineTypes}
      variants={variantList}
    />
  )
}
