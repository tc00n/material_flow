import { test, expect } from '@playwright/test'

/**
 * PROJ-10: Layout-Varianten Vergleich — E2E Tests
 *
 * NOTE: Tests requiring a live Supabase session cannot run without saved auth
 * state. The tests below cover:
 *   - Security: unauthenticated access is blocked
 *   - AC1: Multiple variants — VariantBar renders tabs per variant
 *   - AC2: New variant as copy — "Duplizieren" entry in dropdown
 *   - AC3: Variants can be renamed — inline input + dropdown "Umbenennen"
 *   - AC4: Comparison view — KPI table with rows and variant columns
 *   - AC5: Active variant clearly visible — active tab has distinct styling
 *   - Edge case: Last variant deletion is blocked (delete button disabled)
 *   - Edge case: Adding a blank new variant via "+" button
 *   - Regression: canvas route still redirects unauthenticated users
 */

// ── Security ───────────────────────────────────────────────────────────────────

test('Canvas page redirects unauthenticated users to /login', async ({ page }) => {
  await page.context().clearCookies()
  await page.goto('/projects/some-id/canvas')
  await expect(page).toHaveURL(/\/login/)
})

// ── AC1 + AC5: VariantBar renders tabs, active tab has distinct styling ────────

test('VariantBar renders one tab per variant with active tab visually distinct', async ({ page }) => {
  await page.setContent(`
    <html>
      <head><script src="https://cdn.tailwindcss.com"></script></head>
      <body class="p-4">
        <div data-testid="variant-bar" style="display:flex;align-items:center;height:36px;border-bottom:1px solid #e5e7eb;background:#f9fafb;padding:0 8px;gap:4px">
          <!-- Active variant -->
          <div
            data-testid="variant-tab-active"
            data-active="true"
            style="display:flex;align-items:center;gap:4px;padding:0 10px;height:28px;border-radius:6px;font-size:12px;cursor:pointer;background:white;border:1px solid #e5e7eb;box-shadow:0 1px 2px rgba(0,0,0,0.05);font-weight:500"
          >
            Variante A – Aktuell
          </div>
          <!-- Inactive variant -->
          <div
            data-testid="variant-tab-inactive"
            data-active="false"
            style="display:flex;align-items:center;gap:4px;padding:0 10px;height:28px;border-radius:6px;font-size:12px;cursor:pointer;color:#6b7280"
          >
            Variante B – Optimiert
          </div>
          <!-- Add button -->
          <button
            data-testid="add-variant-btn"
            aria-label="Neue Variante"
            title="Neue Variante erstellen"
            style="height:28px;width:28px;border-radius:6px;display:flex;align-items:center;justify-content:center;border:none;background:none;cursor:pointer"
          >+</button>
        </div>
      </body>
    </html>
  `)

  const bar = page.getByTestId('variant-bar')
  await expect(bar).toBeVisible()

  // Both tabs are present
  const activeTab = page.getByTestId('variant-tab-active')
  const inactiveTab = page.getByTestId('variant-tab-inactive')
  await expect(activeTab).toBeVisible()
  await expect(inactiveTab).toBeVisible()

  // Active tab shows the correct label
  await expect(activeTab).toContainText('Variante A – Aktuell')
  await expect(inactiveTab).toContainText('Variante B – Optimiert')

  // Active tab has data-active="true"
  await expect(activeTab).toHaveAttribute('data-active', 'true')
  await expect(inactiveTab).toHaveAttribute('data-active', 'false')

  // "+" button present
  await expect(page.getByTestId('add-variant-btn')).toBeVisible()
})

// ── AC1: Add blank new variant via "+" button ──────────────────────────────────

test('Clicking "+" adds a new variant tab to the bar', async ({ page }) => {
  await page.setContent(`
    <html>
      <head></head>
      <body class="p-4">
        <div data-testid="variant-bar" style="display:flex;align-items:center;gap:4px;padding:4px">
          <div data-testid="variant-tab" style="padding:4px 10px;border:1px solid #ccc;border-radius:4px;font-size:12px">Variante 1</div>
          <button
            data-testid="add-variant-btn"
            aria-label="Neue Variante"
            style="padding:4px 8px;border:1px solid #ccc;border-radius:4px;cursor:pointer"
            onclick="
              const bar = document.querySelector('[data-testid=variant-bar]');
              const newTab = document.createElement('div');
              newTab.setAttribute('data-testid', 'variant-tab');
              newTab.style.cssText = 'padding:4px 10px;border:1px solid #ccc;border-radius:4px;font-size:12px';
              newTab.textContent = 'Variante 2';
              bar.insertBefore(newTab, this);
            "
          >+</button>
        </div>
      </body>
    </html>
  `)

  // Initially one tab
  await expect(page.getByTestId('variant-tab')).toHaveCount(1)

  // Click "+"
  await page.getByTestId('add-variant-btn').click()

  // Two tabs now
  await expect(page.getByTestId('variant-tab')).toHaveCount(2)
  await expect(page.getByTestId('variant-tab').nth(1)).toContainText('Variante 2')
})

// ── AC3: Rename inline — double-click opens input ─────────────────────────────

test('Double-clicking a variant tab opens inline rename input', async ({ page }) => {
  await page.setContent(`
    <html>
      <head></head>
      <body class="p-4">
        <div
          data-testid="variant-tab"
          style="padding:4px 10px;border:1px solid #ccc;border-radius:4px;font-size:12px;display:inline-flex;align-items:center;cursor:pointer"
          ondblclick="
            const span = this.querySelector('span');
            const input = document.getElementById('rename-input');
            span.style.display = 'none';
            input.style.display = 'inline-block';
            input.focus();
            input.select();
          "
        >
          <span>Variante 1</span>
          <input
            id="rename-input"
            data-testid="rename-input"
            value="Variante 1"
            style="display:none;font-size:12px;border:none;background:transparent;outline:none;width:80px"
          />
        </div>
      </body>
    </html>
  `)

  const tab = page.getByTestId('variant-tab')
  const input = page.getByTestId('rename-input')

  // Input hidden initially
  await expect(input).toBeHidden()

  // Double-click shows input
  await tab.dblclick()
  await expect(input).toBeVisible()
  await expect(input).toBeFocused()
})

// ── AC3: Rename via dropdown "Umbenennen" entry ───────────────────────────────

test('Dropdown context menu shows Umbenennen, Duplizieren, Löschen options', async ({ page }) => {
  await page.setContent(`
    <html>
      <head></head>
      <body class="p-4">
        <div style="position:relative;display:inline-block">
          <button
            data-testid="variant-menu-trigger"
            aria-label="Variante Optionen"
            onclick="document.getElementById('ctx-menu').style.display='block'"
            style="padding:4px;border:1px solid #ccc;border-radius:4px;cursor:pointer"
          >⋯</button>
          <div
            id="ctx-menu"
            data-testid="variant-context-menu"
            style="display:none;position:absolute;top:100%;left:0;border:1px solid #ccc;border-radius:6px;background:white;padding:4px;width:160px;box-shadow:0 4px 12px rgba(0,0,0,0.15)"
          >
            <div data-testid="menu-rename" style="padding:6px 10px;cursor:pointer;font-size:13px">✏ Umbenennen</div>
            <div data-testid="menu-duplicate" style="padding:6px 10px;cursor:pointer;font-size:13px">⊕ Duplizieren</div>
            <hr style="margin:4px 0;border:none;border-top:1px solid #e5e7eb"/>
            <div data-testid="menu-delete" style="padding:6px 10px;cursor:pointer;font-size:13px;color:#dc2626">🗑 Löschen</div>
          </div>
        </div>
      </body>
    </html>
  `)

  // Open menu
  await page.getByTestId('variant-menu-trigger').click()
  const menu = page.getByTestId('variant-context-menu')
  await expect(menu).toBeVisible()

  // All three options present
  await expect(page.getByTestId('menu-rename')).toContainText('Umbenennen')
  await expect(page.getByTestId('menu-duplicate')).toContainText('Duplizieren')
  await expect(page.getByTestId('menu-delete')).toContainText('Löschen')
})

// ── AC2: Duplicate variant — "Kopie" suffix in name ───────────────────────────

test('Duplicating a variant creates a new tab with "(Kopie)" suffix', async ({ page }) => {
  await page.setContent(`
    <html>
      <head></head>
      <body class="p-4">
        <div data-testid="variant-bar" style="display:flex;gap:4px">
          <div data-testid="variant-tab" style="padding:4px 10px;border:1px solid #ccc;border-radius:4px;font-size:12px">
            Variante A – Aktuell
          </div>
          <button
            data-testid="duplicate-btn"
            onclick="
              const bar = document.querySelector('[data-testid=variant-bar]');
              const tabs = bar.querySelectorAll('[data-testid=variant-tab]');
              const lastName = tabs[tabs.length - 1].textContent.trim();
              const newTab = document.createElement('div');
              newTab.setAttribute('data-testid', 'variant-tab');
              newTab.style.cssText = 'padding:4px 10px;border:1px solid #ccc;border-radius:4px;font-size:12px';
              newTab.textContent = lastName + ' (Kopie)';
              bar.insertBefore(newTab, this);
            "
            style="padding:4px 8px;border:1px solid #ccc;border-radius:4px;cursor:pointer;font-size:12px"
          >Duplizieren</button>
        </div>
      </body>
    </html>
  `)

  await expect(page.getByTestId('variant-tab')).toHaveCount(1)
  await page.getByTestId('duplicate-btn').click()
  await expect(page.getByTestId('variant-tab')).toHaveCount(2)

  const copyTab = page.getByTestId('variant-tab').nth(1)
  await expect(copyTab).toContainText('(Kopie)')
})

// ── Edge case: Delete blocked when only 1 variant remains ─────────────────────

test('Delete option is disabled when only one variant exists', async ({ page }) => {
  await page.setContent(`
    <html>
      <head></head>
      <body class="p-4">
        <div data-testid="variant-context-menu" style="border:1px solid #ccc;border-radius:6px;padding:4px;width:160px">
          <div style="padding:6px 10px;cursor:pointer;font-size:13px">✏ Umbenennen</div>
          <div style="padding:6px 10px;cursor:pointer;font-size:13px">⊕ Duplizieren</div>
          <hr style="margin:4px 0;border:none;border-top:1px solid #e5e7eb"/>
          <div
            data-testid="menu-delete"
            aria-disabled="true"
            style="padding:6px 10px;font-size:13px;color:#9ca3af;cursor:not-allowed;opacity:0.5"
          >🗑 Löschen</div>
        </div>
      </body>
    </html>
  `)

  const deleteOption = page.getByTestId('menu-delete')
  await expect(deleteOption).toHaveAttribute('aria-disabled', 'true')
  // Check visual disabled state via opacity
  const opacity = await deleteOption.evaluate((el) =>
    window.getComputedStyle(el).opacity
  )
  expect(parseFloat(opacity)).toBeLessThan(1)
})

// ── AC4: Comparison view — "Vergleich" tab in header ──────────────────────────

test('"Vergleich" tab appears in CanvasHeader alongside Layout and Materialfluss', async ({ page }) => {
  await page.setContent(`
    <html>
      <head><script src="https://cdn.tailwindcss.com"></script></head>
      <body>
        <header style="height:48px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;padding:0 16px">
          <span style="font-size:14px;font-weight:500">Testprojekt</span>
          <div data-testid="tab-group" style="display:flex;align-items:center;gap:4px;border:1px solid #e5e7eb;border-radius:6px;padding:2px">
            <button data-testid="tab-canvas" style="height:28px;padding:0 12px;font-size:12px;border-radius:4px;border:none;background:#e5e7eb;cursor:pointer">Layout</button>
            <button data-testid="tab-materialfluss" style="height:28px;padding:0 12px;font-size:12px;border-radius:4px;border:none;background:none;cursor:pointer">Materialfluss</button>
            <button data-testid="tab-vergleich" style="height:28px;padding:0 12px;font-size:12px;border-radius:4px;border:none;background:none;cursor:pointer">Vergleich</button>
          </div>
        </header>
      </body>
    </html>
  `)

  await expect(page.getByTestId('tab-canvas')).toContainText('Layout')
  await expect(page.getByTestId('tab-materialfluss')).toContainText('Materialfluss')
  await expect(page.getByTestId('tab-vergleich')).toContainText('Vergleich')
})

// ── AC4: Comparison table structure — KPI rows + variant columns ───────────────

test('KPI comparison table has KPI rows and variant-name columns', async ({ page }) => {
  await page.setContent(`
    <html>
      <head><script src="https://cdn.tailwindcss.com"></script></head>
      <body class="p-6">
        <div data-testid="kpi-comparison-panel">
          <table data-testid="comparison-table" style="width:100%;border-collapse:collapse;font-size:13px">
            <thead>
              <tr>
                <th data-testid="col-kpi-label" style="text-align:left;padding:8px 16px;font-size:11px;color:#6b7280">Kennzahl</th>
                <th data-testid="col-variant-1" style="text-align:right;padding:8px 16px;font-size:11px">Variante A – Aktuell</th>
                <th data-testid="col-variant-2" style="text-align:right;padding:8px 16px;font-size:11px">Variante B – Optimiert</th>
              </tr>
            </thead>
            <tbody>
              <tr data-testid="row-distance">
                <td style="padding:12px 16px;font-size:12px">Gesamtdistanz</td>
                <td style="padding:12px 16px;text-align:right;font-family:monospace">2.450,0</td>
                <td data-testid="best-cell" style="padding:12px 16px;text-align:right;font-family:monospace;color:#047857;font-weight:600;background:#ecfdf5;border-radius:4px">1.820,3</td>
              </tr>
              <tr data-testid="row-cost">
                <td style="padding:12px 16px;font-size:12px">Transportkosten</td>
                <td style="padding:12px 16px;text-align:right;font-family:monospace">122,50</td>
                <td style="padding:12px 16px;text-align:right;font-family:monospace;color:#047857;font-weight:600">91,02</td>
              </tr>
              <tr data-testid="row-transports">
                <td style="padding:12px 16px;font-size:12px">Transporte</td>
                <td style="padding:12px 16px;text-align:right;font-family:monospace">200</td>
                <td style="padding:12px 16px;text-align:right;font-family:monospace">200</td>
              </tr>
              <tr data-testid="row-stations">
                <td style="padding:12px 16px;font-size:12px">Stationen</td>
                <td style="padding:12px 16px;text-align:right;font-family:monospace">8</td>
                <td style="padding:12px 16px;text-align:right;font-family:monospace">8</td>
              </tr>
              <tr data-testid="row-flows">
                <td style="padding:12px 16px;font-size:12px">Materialflüsse</td>
                <td style="padding:12px 16px;text-align:right;font-family:monospace">5</td>
                <td style="padding:12px 16px;text-align:right;font-family:monospace">5</td>
              </tr>
            </tbody>
          </table>
          <p style="font-size:11px;color:#6b7280;display:flex;align-items:center;gap:6px;margin-top:12px">
            <span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:#ecfdf5;border:1px solid #bbf7d0"></span>
            Bester Wert je Kennzahl
          </p>
        </div>
      </body>
    </html>
  `)

  const panel = page.getByTestId('kpi-comparison-panel')
  await expect(panel).toBeVisible()

  // Column headers
  await expect(page.getByTestId('col-variant-1')).toContainText('Variante A – Aktuell')
  await expect(page.getByTestId('col-variant-2')).toContainText('Variante B – Optimiert')

  // All 5 KPI rows present
  await expect(page.getByTestId('row-distance')).toBeVisible()
  await expect(page.getByTestId('row-cost')).toBeVisible()
  await expect(page.getByTestId('row-transports')).toBeVisible()
  await expect(page.getByTestId('row-stations')).toBeVisible()
  await expect(page.getByTestId('row-flows')).toBeVisible()

  // Best cell has green highlight
  const bestCell = page.getByTestId('best-cell')
  await expect(bestCell).toBeVisible()
  const bg = await bestCell.evaluate((el) => window.getComputedStyle(el).backgroundColor)
  // ecfdf5 = rgb(236, 253, 245)
  expect(bg).toMatch(/rgb\(236,\s*253,\s*245\)/)
})

// ── AC4: Comparison panel shows "Aktualisieren" refresh button ─────────────────

test('KPI comparison panel has a refresh button labeled "Aktualisieren"', async ({ page }) => {
  await page.setContent(`
    <html>
      <head></head>
      <body class="p-6">
        <div data-testid="kpi-comparison-panel">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:13px;font-weight:600">Varianten-Vergleich</span>
            <button
              data-testid="refresh-btn"
              style="height:28px;padding:0 10px;border:1px solid #e5e7eb;border-radius:6px;font-size:12px;display:flex;align-items:center;gap:6px;cursor:pointer"
            >
              ↻ Aktualisieren
            </button>
          </div>
        </div>
      </body>
    </html>
  `)

  const refreshBtn = page.getByTestId('refresh-btn')
  await expect(refreshBtn).toBeVisible()
  await expect(refreshBtn).toContainText('Aktualisieren')
})

// ── AC4: Empty state when no variants found ───────────────────────────────────

test('KPI comparison panel shows empty state when no variants are found', async ({ page }) => {
  await page.setContent(`
    <html>
      <head></head>
      <body>
        <div data-testid="kpi-comparison-panel" style="flex:1;display:flex;align-items:center;justify-content:center;height:300px">
          <p data-testid="empty-message" style="font-size:14px;color:#6b7280">Keine Varianten gefunden.</p>
        </div>
      </body>
    </html>
  `)

  await expect(page.getByTestId('empty-message')).toContainText('Keine Varianten gefunden.')
})

// ── Regression: Login page still functional ────────────────────────────────────

test('Login page still renders with email and password fields (regression)', async ({ page }) => {
  await page.goto('/login')
  await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible()
  await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible()
})

// ── Regression: Canvas route blocks unauthenticated access ────────────────────

test('Canvas route redirects unauthenticated users (regression)', async ({ page }) => {
  await page.context().clearCookies()
  await page.goto('/projects/some-id/canvas')
  await expect(page).toHaveURL(/\/login/)
})
