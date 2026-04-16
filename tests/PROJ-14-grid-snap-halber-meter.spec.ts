import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

/**
 * PROJ-14: Grid-Snap auf 0,5 m — E2E Tests
 *
 * Most acceptance criteria require authenticated canvas access.
 * These tests cover:
 *   1. Source-code verification of the three precise changes (snapGrid, drop snap, save formula)
 *   2. Background grid gap unchanged at 60px (1m main lines)
 *   3. Security: canvas route still requires auth after the change
 *   4. Snap constants are correctly configured (SNAP_SIZE = 30, CELL_SIZE = 60)
 *   5. Visual regression: login and project pages still render (no JS/import errors)
 */

// ---------------------------------------------------------------------------
// AC-1: snapGrid is [30, 30] — drag snapping at 0.5 m resolution
// Verified by reading source code (can't test drag without auth)
// ---------------------------------------------------------------------------
test('AC-1: snapGrid prop is [SNAP_SIZE, SNAP_SIZE] = [30, 30] in canvas-client.tsx', () => {
  const src = fs.readFileSync(
    path.join(process.cwd(), 'src/components/canvas/canvas-client.tsx'),
    'utf-8'
  )

  // SNAP_SIZE constant must be defined as CELL_SIZE / 2
  expect(src).toContain('const SNAP_SIZE = CELL_SIZE / 2')

  // snapGrid prop must use SNAP_SIZE (not CELL_SIZE)
  expect(src).toContain('snapGrid={[SNAP_SIZE, SNAP_SIZE]}')

  // The old [CELL_SIZE, CELL_SIZE] must not be used for snapGrid anymore
  expect(src).not.toContain('snapGrid={[CELL_SIZE, CELL_SIZE]}')
})

// ---------------------------------------------------------------------------
// AC-1: Drop handler uses SNAP_SIZE (0.5 m resolution) for new items from sidebar
// ---------------------------------------------------------------------------
test('AC-1: Drop handler snaps to SNAP_SIZE (30 px) not CELL_SIZE (60 px)', () => {
  const src = fs.readFileSync(
    path.join(process.cwd(), 'src/components/canvas/canvas-client.tsx'),
    'utf-8'
  )

  // New items snapped at SNAP_SIZE resolution
  expect(src).toContain('Math.round(rawPosition.x / SNAP_SIZE) * SNAP_SIZE')
  expect(src).toContain('Math.round(rawPosition.y / SNAP_SIZE) * SNAP_SIZE')

  // Old CELL_SIZE-based snap must be gone from drop handler
  expect(src).not.toContain('Math.round(rawPosition.x / CELL_SIZE) * CELL_SIZE')
})

// ---------------------------------------------------------------------------
// AC-1: Save formula converts pixel position to 0.5 m values
// ---------------------------------------------------------------------------
test('AC-1: Save formula stores 0.5m precision (Math.round(x / SNAP_SIZE) * 0.5)', () => {
  const src = fs.readFileSync(
    path.join(process.cwd(), 'src/components/canvas/canvas-client.tsx'),
    'utf-8'
  )

  // Save formula must produce 0.5m steps
  expect(src).toContain('Math.round(n.position.x / SNAP_SIZE) * 0.5')
  expect(src).toContain('Math.round(n.position.y / SNAP_SIZE) * 0.5')

  // Old integer-meter formula must be gone
  expect(src).not.toContain('Math.round(n.position.x / CELL_SIZE)')
  expect(src).not.toContain('Math.round(n.position.y / CELL_SIZE)')
})

// ---------------------------------------------------------------------------
// AC-4: Background grid gap stays at CELL_SIZE (60 px = 1 m main lines)
// ---------------------------------------------------------------------------
test('AC-4: Background grid gap stays at CELL_SIZE=60 (1m main lines unchanged)', () => {
  const src = fs.readFileSync(
    path.join(process.cwd(), 'src/components/canvas/canvas-client.tsx'),
    'utf-8'
  )

  // Background gap must still reference CELL_SIZE (60 px)
  expect(src).toContain('gap={CELL_SIZE}')

  // CELL_SIZE must still be 60
  expect(src).toContain('const CELL_SIZE = 60')
})

// ---------------------------------------------------------------------------
// AC-3: Existing integer positions are valid 0.5m positions (no data migration needed)
// Verified by checking that pos_x/pos_y still use NUMERIC DB columns (no schema changes)
// ---------------------------------------------------------------------------
test('AC-3: No database migration was added for PROJ-14 (no schema change needed)', () => {
  // The spec states pos_x/pos_y are already NUMERIC — no migration should exist
  const migrationsDir = path.join(process.cwd(), 'supabase/migrations')
  if (!fs.existsSync(migrationsDir)) {
    // No migrations directory at all — fine, nothing to check
    return
  }
  const migrationFiles = fs.readdirSync(migrationsDir)
  const proj14Migrations = migrationFiles.filter((f) =>
    f.toLowerCase().includes('proj14') || f.toLowerCase().includes('proj-14') || f.toLowerCase().includes('snap')
  )
  expect(proj14Migrations).toHaveLength(0)
})

// ---------------------------------------------------------------------------
// Security regression: canvas routes still require authentication
// ---------------------------------------------------------------------------
test('Security: canvas route still redirects unauthenticated users to /login', async ({ page }) => {
  await page.context().clearCookies()
  await page.goto('/projects/test-project-id/canvas')
  await expect(page).toHaveURL(/\/login/)
})

test('Security: canvas UUID route still redirects unauthenticated to /login', async ({ page }) => {
  await page.context().clearCookies()
  const fakeId = '00000000-0000-0000-0000-000000000014'
  await page.goto(`/projects/${fakeId}/canvas`)
  await expect(page).toHaveURL(/\/login/)
})

// ---------------------------------------------------------------------------
// Regression: login page still renders (no import errors from canvas changes)
// ---------------------------------------------------------------------------
test('Regression: login page renders without errors after PROJ-14 changes', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(err.message))
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })

  await page.goto('/login')
  await expect(page.locator('input[type="email"]')).toBeVisible()
  await expect(page.locator('input[type="password"]')).toBeVisible()

  // No JavaScript errors on login page
  const criticalErrors = errors.filter(
    (e) => !e.includes('hydrat') && !e.includes('favicon')
  )
  expect(criticalErrors).toHaveLength(0)
})

// ---------------------------------------------------------------------------
// Regression: projects page still loads (or redirects to login)
// ---------------------------------------------------------------------------
test('Regression: projects page route exists and does not 404', async ({ request }) => {
  const response = await request.get('/')
  expect(response.status()).not.toBe(404)
})

// ---------------------------------------------------------------------------
// AC-2: machine-type-dialog.tsx already had step=0.5 — verify no regression
// ---------------------------------------------------------------------------
test('AC-2: machine-type-dialog.tsx retains step=0.5 and min=0.5 for width/height inputs', () => {
  const dialogPath = path.join(
    process.cwd(),
    'src/components/canvas/machine-type-dialog.tsx'
  )
  if (!fs.existsSync(dialogPath)) {
    // Dialog not at this path — skip
    return
  }
  const src = fs.readFileSync(dialogPath, 'utf-8')
  expect(src).toContain('step={0.5}')
  expect(src).toContain('min={0.5}')
})
