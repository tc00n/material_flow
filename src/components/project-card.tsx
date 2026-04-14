'use client'

import { useState, useTransition } from 'react'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { EditProjectDialog } from '@/components/edit-project-dialog'
import { deleteProject, type Project } from '@/app/actions/projects'

type Props = {
  project: Project
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function ProjectCard({ project }: Props) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      await deleteProject(project.id)
      setDeleteOpen(false)
    })
  }

  return (
    <>
      <Card className="group relative flex flex-col hover:shadow-md transition-shadow cursor-pointer">
        {/* Clickable area */}
        <a
          href={`/projects/${project.id}`}
          className="flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-t-lg"
          aria-label={`Projekt öffnen: ${project.name}`}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base leading-snug line-clamp-2">
              {project.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {project.description ? (
              <CardDescription className="line-clamp-3 text-sm">
                {project.description}
              </CardDescription>
            ) : (
              <CardDescription className="text-sm italic">
                Keine Beschreibung
              </CardDescription>
            )}
          </CardContent>
        </a>

        {/* Footer: date + actions */}
        <div className="flex items-center justify-between px-6 pb-4 pt-2 border-t border-border/50">
          <span className="text-xs text-muted-foreground">
            Geändert {formatDate(project.updated_at)}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                aria-label="Projektoptionen"
                onClick={(e) => e.preventDefault()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Umbenennen
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Löschen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>

      <EditProjectDialog
        project={project}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Projekt löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>&ldquo;{project.name}&rdquo;</strong> wird unwiderruflich gelöscht — inklusive
              aller gespeicherten Layout-Daten. Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? 'Löschen…' : 'Wirklich löschen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
