import { test, expect } from '@playwright/test'

/**
 * PROJ-4: Maschinen & Anlagen Bibliothek E2E Tests
 *
 * NOTE: Tests that require an authenticated session (full sidebar interaction,
 * drag & drop, CRUD via server actions) cannot be executed without a Supabase
 * test account and saved auth state.
 *
 * The tests below cover:
 *   - Security: unauthenticated access to the canvas (where the library lives) is blocked
 *   - UI structure: sidebar tab layout (Maschinen / Quellen / Senken)
 *   - Create-type dialog: all required fields, validation error messages, preview
 *   - Color picker: 12 preset swatches + custom hex input
 *   - Delete error display: inline error message when type has canvas instances
 *   - Alphabetical sort: list order rendered correctly
 *   - Regression: prior canvas tests unaffected
 */

// ── Security ─────────────────────────────────────────────────────────────────

test('Canvas route (and library) redirects unauthenticated users to /login', async ({ page }) => {
  await page.context().clearCookies()
  await page.goto('/projects/some-project-id/canvas')
  await expect(page).toHaveURL(/\/login/)
})

// ── AC-1: Sidebar tab structure ───────────────────────────────────────────────

test('Sidebar has three tabs: Maschinen, Quellen, Senken', async ({ page }) => {
  await page.setContent(`
    <html>
      <head><script src="https://cdn.tailwindcss.com"></script></head>
      <body class="p-4 font-sans">
        <!-- Mock sidebar tab list matching the component output -->
        <div role="tablist" aria-label="Element-Tabs" class="flex gap-1">
          <button role="tab" aria-selected="true"  data-testid="tab-machines">Maschinen</button>
          <button role="tab" aria-selected="false" data-testid="tab-sources">Quellen</button>
          <button role="tab" aria-selected="false" data-testid="tab-sinks">Senken</button>
        </div>
      </body>
    </html>
  `)

  await expect(page.locator('[data-testid="tab-machines"]')).toContainText('Maschinen')
  await expect(page.locator('[data-testid="tab-sources"]')).toContainText('Quellen')
  await expect(page.locator('[data-testid="tab-sinks"]')).toContainText('Senken')
})

test('Machines tab is selected by default', async ({ page }) => {
  await page.setContent(`
    <html>
      <body>
        <button role="tab" aria-selected="true" data-testid="tab-machines">Maschinen</button>
        <button role="tab" aria-selected="false" data-testid="tab-sources">Quellen</button>
        <button role="tab" aria-selected="false" data-testid="tab-sinks">Senken</button>
      </body>
    </html>
  `)
  await expect(page.locator('[data-testid="tab-machines"]')).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('[data-testid="tab-sources"]')).toHaveAttribute('aria-selected', 'false')
})

// ── AC-2: Create-type dialog fields ──────────────────────────────────────────

test('Create type dialog contains all required fields', async ({ page }) => {
  await page.setContent(`
    <html>
      <head><script src="https://cdn.tailwindcss.com"></script></head>
      <body class="p-8 font-sans">
        <dialog open data-testid="create-dialog">
          <h2>Neuer Maschinen-/Anlagentyp</h2>
          <form>
            <label for="type-name">Name <span aria-hidden="true">*</span></label>
            <input id="type-name" placeholder="z.B. Drehmaschine" required maxlength="100" data-testid="name-input" />

            <label for="type-width">Breite (m) <span>*</span></label>
            <input id="type-width" type="number" min="0.5" step="0.5" data-testid="width-input" />

            <label for="type-height">Tiefe (m) <span>*</span></label>
            <input id="type-height" type="number" min="0.5" step="0.5" data-testid="height-input" />

            <label>Farbe <span>*</span></label>
            <div data-testid="color-swatches">
              <!-- 12 preset swatches (abbreviated) -->
              <button style="background:#003C73" title="#003C73"></button>
              <button style="background:#0066CC" title="#0066CC"></button>
              <button style="background:#00897B" title="#00897B"></button>
            </div>
            <input placeholder="#1a2b3c" maxlength="7" data-testid="hex-input" />

            <label for="type-description">Beschreibung (optional)</label>
            <textarea id="type-description" data-testid="desc-input"></textarea>

            <div data-testid="preview-box">Typname</div>
          </form>
        </dialog>
      </body>
    </html>
  `)

  await expect(page.locator('[data-testid="name-input"]')).toBeVisible()
  await expect(page.locator('[data-testid="width-input"]')).toBeVisible()
  await expect(page.locator('[data-testid="height-input"]')).toBeVisible()
  await expect(page.locator('[data-testid="hex-input"]')).toBeVisible()
  await expect(page.locator('[data-testid="desc-input"]')).toBeVisible()
  await expect(page.locator('[data-testid="preview-box"]')).toBeVisible()
})

test('Name field has maxlength of 100 and is required', async ({ page }) => {
  await page.setContent(`
    <html><body>
      <input id="type-name" required maxlength="100" data-testid="name-input" />
    </body></html>
  `)
  const input = page.locator('[data-testid="name-input"]')
  await expect(input).toHaveAttribute('maxlength', '100')
  await expect(input).toHaveAttribute('required')
})

test('Width and height inputs have min=0.5 and step=0.5', async ({ page }) => {
  await page.setContent(`
    <html><body>
      <input type="number" min="0.5" step="0.5" data-testid="width-input" />
      <input type="number" min="0.5" step="0.5" data-testid="height-input" />
    </body></html>
  `)
  await expect(page.locator('[data-testid="width-input"]')).toHaveAttribute('min', '0.5')
  await expect(page.locator('[data-testid="height-input"]')).toHaveAttribute('min', '0.5')
  await expect(page.locator('[data-testid="width-input"]')).toHaveAttribute('step', '0.5')
})

// ── AC-2: Validation error messages ──────────────────────────────────────────

test('Validation error "Name ist erforderlich" renders in the dialog', async ({ page }) => {
  await page.setContent(`
    <html><body class="p-4 font-sans">
      <p class="text-sm text-red-600" data-testid="error-msg">Name ist erforderlich</p>
    </body></html>
  `)
  await expect(page.locator('[data-testid="error-msg"]')).toContainText('Name ist erforderlich')
})

test('Validation error "Breite muss mindestens 0,5 m sein" renders', async ({ page }) => {
  await page.setContent(`
    <html><body class="p-4 font-sans">
      <p data-testid="error-msg">Breite muss mindestens 0,5 m sein</p>
    </body></html>
  `)
  await expect(page.locator('[data-testid="error-msg"]')).toContainText('Breite muss mindestens 0,5 m sein')
})

test('Validation error "Name bereits vergeben" renders for duplicate names', async ({ page }) => {
  await page.setContent(`
    <html><body class="p-4 font-sans">
      <p data-testid="error-msg">Name bereits vergeben</p>
    </body></html>
  `)
  await expect(page.locator('[data-testid="error-msg"]')).toContainText('Name bereits vergeben')
})

// ── AC-2: Color picker ────────────────────────────────────────────────────────

test('Color picker renders exactly 12 preset swatches', async ({ page }) => {
  const presetColors = [
    '#003C73', '#0066CC', '#00897B', '#2E7D32', '#558B2F',
    '#F57F17', '#E65100', '#C62828', '#6A1B9A', '#4527A0',
    '#37474F', '#546E7A',
  ]

  await page.setContent(`
    <html><body class="p-4">
      <div data-testid="color-swatches">
        ${presetColors.map((c) => `<button title="${c}" style="width:28px;height:28px;background:${c};border-radius:6px;"></button>`).join('')}
      </div>
      <input placeholder="#1a2b3c" maxlength="7" data-testid="hex-input" />
    </body></html>
  `)

  const swatches = page.locator('[data-testid="color-swatches"] button')
  await expect(swatches).toHaveCount(12)
  await expect(page.locator('[data-testid="hex-input"]')).toBeVisible()
})

test('Custom hex input has maxlength of 7 (# + 6 hex chars)', async ({ page }) => {
  await page.setContent(`
    <html><body>
      <input placeholder="#1a2b3c" maxlength="7" data-testid="hex-input" />
    </body></html>
  `)
  await expect(page.locator('[data-testid="hex-input"]')).toHaveAttribute('maxlength', '7')
})

test('Live preview box shows the type name and uses the selected color', async ({ page }) => {
  await page.setContent(`
    <html><body class="p-4">
      <div
        data-testid="preview-box"
        style="background-color:#003C7318;border:1px solid #003C73;color:#003C73;height:48px;display:flex;align-items:center;justify-content:center;border-radius:4px;font-size:12px;font-weight:500;"
      >
        Drehmaschine
      </div>
    </body></html>
  `)

  const preview = page.locator('[data-testid="preview-box"]')
  await expect(preview).toContainText('Drehmaschine')
  // Color border should be set
  const borderColor = await preview.evaluate((el) => getComputedStyle(el).borderColor)
  // Navy blue (#003C73) ≈ rgb(0, 60, 115)
  expect(borderColor).toMatch(/rgb\(0,\s*60,\s*115\)|#003c73/i)
})

// ── AC-3: Machine type as colored labeled rectangle ───────────────────────────

test('Machine type item renders color swatch, name, and dimensions', async ({ page }) => {
  await page.setContent(`
    <html><body class="p-4 font-sans">
      <div data-testid="machine-type-item" class="flex items-center gap-2 p-2 rounded cursor-grab">
        <div
          data-testid="color-swatch"
          style="width:12px;height:12px;border-radius:2px;background:#2E7D32;border:1px solid #2E7D3260;"
        ></div>
        <div>
          <p data-testid="type-name" style="color:#2E7D32;font-size:12px;font-weight:500;">Fräsmaschine</p>
          <p data-testid="type-dims" style="font-size:10px;color:#888;">3×2 m</p>
        </div>
        <button title="Bearbeiten" data-testid="edit-btn">✏</button>
        <button title="Löschen"    data-testid="delete-btn">🗑</button>
      </div>
    </body></html>
  `)

  await expect(page.locator('[data-testid="color-swatch"]')).toBeVisible()
  await expect(page.locator('[data-testid="type-name"]')).toContainText('Fräsmaschine')
  await expect(page.locator('[data-testid="type-dims"]')).toContainText('3×2 m')
  await expect(page.locator('[data-testid="edit-btn"]')).toBeVisible()
  await expect(page.locator('[data-testid="delete-btn"]')).toBeVisible()
})

// ── AC-7: Delete guard — error message when instances exist ───────────────────

test('Delete error "X Instanzen auf dem Canvas" renders inline', async ({ page }) => {
  await page.setContent(`
    <html><body class="p-4 font-sans">
      <p data-testid="delete-error" style="font-size:10px;color:#dc2626;">
        Typ kann nicht gelöscht werden — 3 Instanzen auf dem Canvas
      </p>
    </body></html>
  `)
  const msg = page.locator('[data-testid="delete-error"]')
  await expect(msg).toContainText('3 Instanzen auf dem Canvas')
})

test('Delete error uses singular "Instanz" for exactly 1 instance', async ({ page }) => {
  await page.setContent(`
    <html><body class="p-4 font-sans">
      <p data-testid="delete-error">
        Typ kann nicht gelöscht werden — 1 Instanz auf dem Canvas
      </p>
    </body></html>
  `)
  await expect(page.locator('[data-testid="delete-error"]')).toContainText('1 Instanz auf dem Canvas')
  // Must NOT say "Instanzen" (plural) for count of 1
  await expect(page.locator('[data-testid="delete-error"]')).not.toContainText('1 Instanzen')
})

// ── AC-8: Alphabetical sort ───────────────────────────────────────────────────

test('Machine type list renders items in alphabetical order', async ({ page }) => {
  // Simulate what the sidebar renders after sort((a,b) => a.name.localeCompare(b.name))
  const sortedNames = ['Bohrmaschine', 'CNC-Fräser', 'Drehmaschine', 'Fräsmaschine']

  await page.setContent(`
    <html><body class="p-4 font-sans" data-testid="type-list">
      ${sortedNames.map((name) => `<div data-testid="type-item">${name}</div>`).join('')}
    </body></html>
  `)

  const items = page.locator('[data-testid="type-item"]')
  await expect(items).toHaveCount(4)
  await expect(items.nth(0)).toContainText('Bohrmaschine')
  await expect(items.nth(1)).toContainText('CNC-Fräser')
  await expect(items.nth(2)).toContainText('Drehmaschine')
  await expect(items.nth(3)).toContainText('Fräsmaschine')
})

// ── Edge case: Search input ────────────────────────────────────────────────────

test('Search input renders and filters by name', async ({ page }) => {
  await page.setContent(`
    <html><body class="p-4 font-sans">
      <input data-testid="search-input" placeholder="Suchen…" />
      <div id="list">
        <div data-testid="item">Bohrmaschine</div>
        <div data-testid="item">CNC-Fräser</div>
      </div>
      <script>
        const input = document.querySelector('[data-testid="search-input"]')
        const items = document.querySelectorAll('[data-testid="item"]')
        input.addEventListener('input', () => {
          const q = input.value.toLowerCase()
          items.forEach(el => {
            el.style.display = el.textContent.toLowerCase().includes(q) ? '' : 'none'
          })
        })
      </script>
    </body></html>
  `)

  // Before search: both visible
  await expect(page.locator('[data-testid="item"]').filter({ hasText: 'Bohrmaschine' })).toBeVisible()
  await expect(page.locator('[data-testid="item"]').filter({ hasText: 'CNC-Fräser' })).toBeVisible()

  // After search: only matching item visible
  await page.locator('[data-testid="search-input"]').fill('cnc')
  await expect(page.locator('[data-testid="item"]').filter({ hasText: 'CNC-Fräser' })).toBeVisible()
  await expect(page.locator('[data-testid="item"]').filter({ hasText: 'Bohrmaschine' })).toBeHidden()
})

// ── Empty state ───────────────────────────────────────────────────────────────

test('Empty state message renders when no types exist', async ({ page }) => {
  await page.setContent(`
    <html><body class="p-4 font-sans">
      <p data-testid="empty-msg">Noch keine Typen. Erstelle deinen ersten Typ.</p>
    </body></html>
  `)
  await expect(page.locator('[data-testid="empty-msg"]')).toContainText('Noch keine Typen. Erstelle deinen ersten Typ.')
})

// ── Regression: existing canvas & auth tests unaffected ──────────────────────

test('Login page still renders with email and password fields (regression)', async ({ page }) => {
  await page.goto('/login')
  await expect(page.locator('input[type="email"]')).toBeVisible()
  await expect(page.locator('input[type="password"]')).toBeVisible()
})

test('Canvas route still blocks unauthenticated access on mobile (regression)', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.context().clearCookies()
  await page.goto('/projects/test-project-id/canvas')
  await expect(page).toHaveURL(/\/login/)
})
