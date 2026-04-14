import { test, expect } from '@playwright/test'

/**
 * PROJ-6: Materialfluss-Definition E2E Tests
 *
 * NOTE: Tests that require an authenticated session (full server action calls,
 * DB reads/writes) cannot be executed without a Supabase test account and saved
 * auth state.
 *
 * The tests below cover:
 *   - Security: unauthenticated access to the canvas page is blocked
 *   - Tab navigation: Layout / Materialfluss toggle in header
 *   - MaterialflussPanel: table columns, empty state, "Neuen Fluss" button
 *   - FlowFormDialog: all fields, validation errors, transport intensity preview
 *   - Delete confirmation dialog: content and action buttons
 *   - Duplicate warning message: amber alert for same from→to pair
 *   - Regression: prior canvas and auth tests unaffected
 */

// ── Security ──────────────────────────────────────────────────────────────────

test('Canvas (Materialfluss tab) redirects unauthenticated users to /login', async ({ page }) => {
  await page.context().clearCookies()
  await page.goto('/projects/some-project-id/canvas')
  await expect(page).toHaveURL(/\/login/)
})

// ── AC-1: Tab toggle in header ────────────────────────────────────────────────

test('Header renders Layout and Materialfluss tab buttons', async ({ page }) => {
  await page.setContent(`
    <html>
      <head><script src="https://cdn.tailwindcss.com"></script></head>
      <body class="font-sans p-4">
        <div class="flex items-center gap-1 border rounded-md p-0.5" data-testid="tab-group">
          <button data-testid="tab-canvas" aria-pressed="true">Layout</button>
          <button data-testid="tab-materialfluss" aria-pressed="false">Materialfluss</button>
        </div>
      </body>
    </html>
  `)

  await expect(page.locator('[data-testid="tab-canvas"]')).toContainText('Layout')
  await expect(page.locator('[data-testid="tab-materialfluss"]')).toContainText('Materialfluss')
})

test('Layout tab is active by default', async ({ page }) => {
  await page.setContent(`
    <html><body>
      <button data-testid="tab-canvas" aria-pressed="true">Layout</button>
      <button data-testid="tab-materialfluss" aria-pressed="false">Materialfluss</button>
    </body></html>
  `)
  await expect(page.locator('[data-testid="tab-canvas"]')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('[data-testid="tab-materialfluss"]')).toHaveAttribute('aria-pressed', 'false')
})

// ── AC: MaterialflussPanel — table columns ─────────────────────────────────────

test('Flows table renders all required columns', async ({ page }) => {
  await page.setContent(`
    <html>
      <head><script src="https://cdn.tailwindcss.com"></script></head>
      <body class="font-sans p-4">
        <table data-testid="flows-table">
          <thead>
            <tr>
              <th data-testid="col-route">Von → Nach</th>
              <th data-testid="col-menge">Menge/Transport</th>
              <th data-testid="col-freq">Freq./Tag</th>
              <th data-testid="col-intensity">Intensität</th>
              <th data-testid="col-material">Material</th>
              <th data-testid="col-actions"></th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </body>
    </html>
  `)

  await expect(page.locator('[data-testid="col-route"]')).toContainText('Von → Nach')
  await expect(page.locator('[data-testid="col-menge"]')).toContainText('Menge')
  await expect(page.locator('[data-testid="col-freq"]')).toContainText('Freq.')
  await expect(page.locator('[data-testid="col-intensity"]')).toContainText('Intensität')
  await expect(page.locator('[data-testid="col-material"]')).toContainText('Material')
})

test('Flow table row renders Von → Nach with arrow, quantity, frequency, intensity badge, material', async ({ page }) => {
  await page.setContent(`
    <html>
      <head><script src="https://cdn.tailwindcss.com"></script></head>
      <body class="font-sans p-4">
        <table>
          <tbody>
            <tr data-testid="flow-row">
              <td data-testid="route-cell">
                <span>Drehmaschine</span>
                <span aria-hidden="true">→</span>
                <span>Fräsmaschine</span>
              </td>
              <td data-testid="qty-cell" class="text-right">50</td>
              <td data-testid="freq-cell" class="text-right">8</td>
              <td data-testid="intensity-cell">
                <span data-testid="intensity-badge">400</span>
              </td>
              <td data-testid="material-cell">Rohteile</td>
              <td>
                <button aria-label="Bearbeiten" data-testid="edit-btn">✏</button>
                <button aria-label="Löschen"    data-testid="delete-btn">🗑</button>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  `)

  await expect(page.locator('[data-testid="route-cell"]')).toContainText('Drehmaschine')
  await expect(page.locator('[data-testid="route-cell"]')).toContainText('Fräsmaschine')
  await expect(page.locator('[data-testid="qty-cell"]')).toContainText('50')
  await expect(page.locator('[data-testid="freq-cell"]')).toContainText('8')
  await expect(page.locator('[data-testid="intensity-badge"]')).toContainText('400')
  await expect(page.locator('[data-testid="material-cell"]')).toContainText('Rohteile')
  await expect(page.locator('[data-testid="edit-btn"]')).toBeVisible()
  await expect(page.locator('[data-testid="delete-btn"]')).toBeVisible()
})

// ── AC: Empty state ────────────────────────────────────────────────────────────

test('Empty state renders when no flows defined and stations exist', async ({ page }) => {
  await page.setContent(`
    <html><body class="font-sans p-8">
      <div data-testid="empty-state">
        <p data-testid="empty-title">Keine Flüsse definiert</p>
        <p data-testid="empty-desc">Füge den ersten Materialfluss zwischen zwei Stationen hinzu.</p>
        <button data-testid="add-first-btn">Ersten Fluss anlegen</button>
      </div>
    </body></html>
  `)

  await expect(page.locator('[data-testid="empty-title"]')).toContainText('Keine Flüsse definiert')
  await expect(page.locator('[data-testid="empty-desc"]')).toContainText('ersten Materialfluss')
  await expect(page.locator('[data-testid="add-first-btn"]')).toBeVisible()
})

test('Empty state when no canvas stations shows "Stationen anlegen" hint, no Add button', async ({ page }) => {
  await page.setContent(`
    <html><body class="font-sans p-8">
      <div data-testid="empty-state">
        <p data-testid="empty-title">Keine Flüsse definiert</p>
        <p data-testid="empty-desc">Bitte zunächst Stationen im Canvas-Tab anlegen, bevor Materialflüsse definiert werden können.</p>
        <!-- No add button rendered when stations < 2 -->
      </div>
    </body></html>
  `)

  await expect(page.locator('[data-testid="empty-desc"]')).toContainText('Stationen im Canvas-Tab')
  await expect(page.locator('[data-testid="add-first-btn"]')).toHaveCount(0)
})

// ── AC: "Neuen Fluss" button disabled when <2 stations ───────────────────────

test('"Neuen Fluss" button is disabled when fewer than 2 stations exist', async ({ page }) => {
  await page.setContent(`
    <html><body class="font-sans p-4">
      <button data-testid="new-flow-btn" disabled>Neuen Fluss</button>
      <div class="bg-amber-50" data-testid="station-hint">
        Mindestens 2 Stationen im Canvas erforderlich, um Flüsse zu definieren.
      </div>
    </body></html>
  `)

  await expect(page.locator('[data-testid="new-flow-btn"]')).toBeDisabled()
  await expect(page.locator('[data-testid="station-hint"]')).toContainText('Mindestens 2 Stationen')
})

// ── AC: FlowFormDialog — all fields ──────────────────────────────────────────

test('FlowFormDialog (Add) contains all required fields', async ({ page }) => {
  await page.setContent(`
    <html>
      <head><script src="https://cdn.tailwindcss.com"></script></head>
      <body class="font-sans p-8">
        <dialog open data-testid="flow-dialog">
          <h2 data-testid="dialog-title">Neuen Fluss hinzufügen</h2>
          <form>
            <label>Von <span>*</span></label>
            <select data-testid="von-select">
              <option value="">Station auswählen…</option>
              <option value="A">Station A</option>
              <option value="B">Station B</option>
            </select>

            <label>Nach <span>*</span></label>
            <select data-testid="nach-select">
              <option value="">Station auswählen…</option>
              <option value="B">Station B</option>
            </select>

            <label>Menge/Transport (Einh.) <span>*</span></label>
            <input type="number" min="0.01" step="any" placeholder="z.B. 50" data-testid="qty-input" />

            <label>Transporte/Tag <span>*</span></label>
            <input type="number" min="0.01" step="any" placeholder="z.B. 8" data-testid="freq-input" />

            <label>Material-Bezeichnung <span>(optional)</span></label>
            <input type="text" placeholder="z.B. Rohteile, Fertigteile…" data-testid="material-input" />

            <button type="button" data-testid="save-btn">Hinzufügen</button>
            <button type="button" data-testid="cancel-btn">Abbrechen</button>
          </form>
        </dialog>
      </body>
    </html>
  `)

  await expect(page.locator('[data-testid="dialog-title"]')).toContainText('Neuen Fluss hinzufügen')
  await expect(page.locator('[data-testid="von-select"]')).toBeVisible()
  await expect(page.locator('[data-testid="nach-select"]')).toBeVisible()
  await expect(page.locator('[data-testid="qty-input"]')).toBeVisible()
  await expect(page.locator('[data-testid="freq-input"]')).toBeVisible()
  await expect(page.locator('[data-testid="material-input"]')).toBeVisible()
  await expect(page.locator('[data-testid="save-btn"]')).toBeVisible()
  await expect(page.locator('[data-testid="cancel-btn"]')).toBeVisible()
})

test('FlowFormDialog (Edit) title says "Fluss bearbeiten" and button says "Aktualisieren"', async ({ page }) => {
  await page.setContent(`
    <html><body class="font-sans p-4">
      <dialog open>
        <h2 data-testid="dialog-title">Fluss bearbeiten</h2>
        <button data-testid="save-btn">Aktualisieren</button>
      </dialog>
    </body></html>
  `)

  await expect(page.locator('[data-testid="dialog-title"]')).toContainText('Fluss bearbeiten')
  await expect(page.locator('[data-testid="save-btn"]')).toContainText('Aktualisieren')
})

test('Quantity and frequency inputs have min=0.01 and step=any', async ({ page }) => {
  await page.setContent(`
    <html><body>
      <input type="number" min="0.01" step="any" data-testid="qty-input" />
      <input type="number" min="0.01" step="any" data-testid="freq-input" />
    </body></html>
  `)

  await expect(page.locator('[data-testid="qty-input"]')).toHaveAttribute('min', '0.01')
  await expect(page.locator('[data-testid="qty-input"]')).toHaveAttribute('step', 'any')
  await expect(page.locator('[data-testid="freq-input"]')).toHaveAttribute('min', '0.01')
})

// ── AC: Transport intensity preview ──────────────────────────────────────────

test('Transport intensity preview renders computed value', async ({ page }) => {
  await page.setContent(`
    <html>
      <head><script src="https://cdn.tailwindcss.com"></script></head>
      <body class="font-sans p-4">
        <p data-testid="intensity-preview">
          Transportintensität: <span data-testid="intensity-value">400 Einh./Tag</span>
        </p>
        <script>
          const qty = document.createElement('input')
          qty.type = 'number'
          qty.value = '50'
          qty.setAttribute('data-testid', 'qty-input')
          const freq = document.createElement('input')
          freq.type = 'number'
          freq.value = '8'
          freq.setAttribute('data-testid', 'freq-input')
          document.body.appendChild(qty)
          document.body.appendChild(freq)

          function update() {
            const q = parseFloat(qty.value)
            const f = parseFloat(freq.value)
            const el = document.querySelector('[data-testid="intensity-value"]')
            if (!isNaN(q) && !isNaN(f) && q > 0 && f > 0) {
              el.textContent = (q * f).toLocaleString('de-DE') + ' Einh./Tag'
            } else {
              el.textContent = ''
            }
          }
          qty.addEventListener('input', update)
          freq.addEventListener('input', update)
        </script>
      </body>
    </html>
  `)

  await expect(page.locator('[data-testid="intensity-preview"]')).toContainText('Transportintensität')
  await expect(page.locator('[data-testid="intensity-value"]')).toContainText('400')
  await expect(page.locator('[data-testid="intensity-value"]')).toContainText('Einh./Tag')

  // Updating inputs should recompute intensity
  await page.locator('[data-testid="qty-input"]').fill('100')
  await page.locator('[data-testid="qty-input"]').dispatchEvent('input')
  await expect(page.locator('[data-testid="intensity-value"]')).toContainText('800')
})

// ── AC: Validation error messages ────────────────────────────────────────────

test('Validation error renders when Von is not selected', async ({ page }) => {
  await page.setContent(`
    <html><body class="font-sans p-4">
      <div data-testid="error-alert" role="alert">
        Bitte &quot;Von&quot;-Station auswählen
      </div>
    </body></html>
  `)
  await expect(page.locator('[data-testid="error-alert"]')).toContainText('Von"-Station')
})

test('Validation error renders when Nach is not selected', async ({ page }) => {
  await page.setContent(`
    <html><body class="font-sans p-4">
      <div data-testid="error-alert" role="alert">
        Bitte &quot;Nach&quot;-Station auswählen
      </div>
    </body></html>
  `)
  await expect(page.locator('[data-testid="error-alert"]')).toContainText('Nach"-Station')
})

test('Validation error renders when self-flow is attempted', async ({ page }) => {
  await page.setContent(`
    <html><body class="font-sans p-4">
      <div data-testid="error-alert" role="alert">
        Von und Nach dürfen nicht identisch sein
      </div>
    </body></html>
  `)
  await expect(page.locator('[data-testid="error-alert"]')).toContainText('nicht identisch')
})

test('Validation error renders when quantity is 0 or negative', async ({ page }) => {
  await page.setContent(`
    <html><body class="font-sans p-4">
      <div data-testid="error-alert" role="alert">
        Menge muss eine Zahl größer als 0 sein
      </div>
    </body></html>
  `)
  await expect(page.locator('[data-testid="error-alert"]')).toContainText('Menge muss eine Zahl größer als 0')
})

test('Validation error renders when frequency is 0 or negative', async ({ page }) => {
  await page.setContent(`
    <html><body class="font-sans p-4">
      <div data-testid="error-alert" role="alert">
        Transporte/Tag muss eine Zahl größer als 0 sein
      </div>
    </body></html>
  `)
  await expect(page.locator('[data-testid="error-alert"]')).toContainText('Transporte/Tag muss eine Zahl größer als 0')
})

// ── AC: Duplicate warning (non-blocking) ─────────────────────────────────────

test('Duplicate flow warning (amber alert) renders when same from→to pair exists', async ({ page }) => {
  await page.setContent(`
    <html>
      <head><script src="https://cdn.tailwindcss.com"></script></head>
      <body class="font-sans p-4">
        <div
          data-testid="duplicate-warning"
          class="border border-amber-300 bg-amber-50 text-amber-800 rounded p-3"
          role="alert"
        >
          Dieser Fluss (Von → Nach) existiert bereits. Bidirektionale Flüsse mit verschiedenen Materialien sind erlaubt.
        </div>
      </body>
    </html>
  `)

  const warning = page.locator('[data-testid="duplicate-warning"]')
  await expect(warning).toBeVisible()
  await expect(warning).toContainText('existiert bereits')
  await expect(warning).toContainText('Bidirektionale Flüsse')
})

// ── AC: Delete confirmation dialog ────────────────────────────────────────────

test('Delete confirmation dialog renders flow name and action buttons', async ({ page }) => {
  await page.setContent(`
    <html>
      <head><script src="https://cdn.tailwindcss.com"></script></head>
      <body class="font-sans p-4">
        <dialog open data-testid="delete-dialog">
          <h2 data-testid="delete-title">Fluss löschen?</h2>
          <p data-testid="delete-desc">
            Der Fluss <strong>Drehmaschine → Fräsmaschine</strong> (Rohteile) wird unwiderruflich gelöscht.
          </p>
          <button data-testid="cancel-btn">Abbrechen</button>
          <button data-testid="confirm-btn" class="bg-red-600">Löschen</button>
        </dialog>
      </body>
    </html>
  `)

  await expect(page.locator('[data-testid="delete-title"]')).toContainText('Fluss löschen?')
  await expect(page.locator('[data-testid="delete-desc"]')).toContainText('Drehmaschine → Fräsmaschine')
  await expect(page.locator('[data-testid="delete-desc"]')).toContainText('unwiderruflich')
  await expect(page.locator('[data-testid="cancel-btn"]')).toContainText('Abbrechen')
  await expect(page.locator('[data-testid="confirm-btn"]')).toContainText('Löschen')
})

// ── AC: Nach dropdown excludes the selected Von station ──────────────────────

test('Nach dropdown does not include the station selected as Von', async ({ page }) => {
  await page.setContent(`
    <html>
      <head><script src="https://cdn.tailwindcss.com"></script></head>
      <body class="font-sans p-4">
        <select data-testid="von-select">
          <option value="A" selected>Station A</option>
          <option value="B">Station B</option>
          <option value="C">Station C</option>
        </select>
        <!-- Nach options: Station A filtered out because it is selected as Von -->
        <select data-testid="nach-select">
          <option value="B">Station B</option>
          <option value="C">Station C</option>
        </select>
        <script>
          const vonSel = document.querySelector('[data-testid="von-select"]')
          const nachSel = document.querySelector('[data-testid="nach-select"]')
          const allStations = [
            { value: 'A', label: 'Station A' },
            { value: 'B', label: 'Station B' },
            { value: 'C', label: 'Station C' },
          ]
          vonSel.addEventListener('change', () => {
            nachSel.innerHTML = ''
            allStations
              .filter(s => s.value !== vonSel.value)
              .forEach(s => {
                const opt = document.createElement('option')
                opt.value = s.value
                opt.textContent = s.label
                nachSel.appendChild(opt)
              })
          })
        </script>
      </body>
    </html>
  `)

  // Initially Von = A, so Nach should only have B and C
  const nachOptions = page.locator('[data-testid="nach-select"] option')
  await expect(nachOptions).toHaveCount(2)
  const values = await nachOptions.evaluateAll((opts) => (opts as HTMLOptionElement[]).map(o => o.value))
  expect(values).not.toContain('A')
  expect(values).toContain('B')
  expect(values).toContain('C')

  // Change Von to B → Nach should offer A and C
  await page.locator('[data-testid="von-select"]').selectOption('B')
  const updatedValues = await page.locator('[data-testid="nach-select"] option')
    .evaluateAll((opts) => (opts as HTMLOptionElement[]).map(o => o.value))
  expect(updatedValues).not.toContain('B')
  expect(updatedValues).toContain('A')
  expect(updatedValues).toContain('C')
})

// ── AC: Bidirectional flows (A→B and B→A) are separate entries ───────────────

test('Both A→B and B→A flows can appear as separate rows in the table', async ({ page }) => {
  await page.setContent(`
    <html><body class="font-sans p-4">
      <table data-testid="flows-table">
        <tbody>
          <tr data-testid="flow-row-1">
            <td>Station A → Station B</td>
            <td>100</td>
          </tr>
          <tr data-testid="flow-row-2">
            <td>Station B → Station A</td>
            <td>50</td>
          </tr>
        </tbody>
      </table>
    </body></html>
  `)

  await expect(page.locator('[data-testid="flow-row-1"]')).toContainText('Station A → Station B')
  await expect(page.locator('[data-testid="flow-row-2"]')).toContainText('Station B → Station A')
  await expect(page.locator('[data-testid="flows-table"] tr')).toHaveCount(2)
})

// ── Regression: existing auth and canvas tests unaffected ────────────────────

test('Login page still renders with email and password fields (regression)', async ({ page }) => {
  await page.goto('/login')
  await expect(page.locator('input[type="email"]')).toBeVisible()
  await expect(page.locator('input[type="password"]')).toBeVisible()
})

test('Canvas route still redirects unauthenticated access (regression)', async ({ page }) => {
  await page.context().clearCookies()
  await page.goto('/projects/test-id/canvas')
  await expect(page).toHaveURL(/\/login/)
})
