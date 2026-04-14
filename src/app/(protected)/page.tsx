import { FolderOpen, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProjectCard } from '@/components/project-card'
import { CreateProjectDialog } from '@/components/create-project-dialog'
import { getProjects } from '@/app/actions/projects'
import { logout } from '@/app/actions/auth'

export default async function DashboardPage() {
  const projects = await getProjects()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-semibold text-sm tracking-tight">
            Materialfluss-Analyse
          </span>
          <form action={logout}>
            <Button variant="ghost" size="sm" type="submit">
              <LogOut className="mr-2 h-4 w-4" />
              Abmelden
            </Button>
          </form>
        </div>
      </header>

      {/* Page content */}
      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Page title row */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Projekte</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {projects.length === 0
                ? 'Noch keine Projekte vorhanden.'
                : `${projects.length} Projekt${projects.length === 1 ? '' : 'e'}`}
            </p>
          </div>
          <CreateProjectDialog />
        </div>

        {/* Empty state */}
        {projects.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-1">Kein Projekt vorhanden</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              Erstelle dein erstes Projekt, um mit der Layoutplanung zu beginnen.
            </p>
            <CreateProjectDialog />
          </div>
        )}

        {/* Project grid */}
        {projects.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
