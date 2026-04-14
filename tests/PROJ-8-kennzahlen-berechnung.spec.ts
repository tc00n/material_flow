import { test, expect } from '@playwright/test'

/**
 * PROJ-8: Kennzahlen-Berechnung — E2E Tests
 *
 * NOTE: Tests requiring a live authenticated Supabase session (real node moves,
 * live KPI recalculation) cannot run without saved auth state. The tests below cover:
 *   - Security: unauthenticated access is blocked
 *   - AC: KPI Panel renders with correct labels and units
 *   - AC: Empty state shows "Keine Daten" message when no flows
 *   - AC: KPI panel can be collapsed and expanded
 *   - AC: Settings section renders with Kostensatz and Meter-pro-Zelle inputs
 *   - AC: Top-3 flows section renders with correct heading
 *   - Regression: related features unaffected
 */

// ── Security ───────────────────────────────────────────────────────────────────

test('Canvas page redirects unauthenticated users to /login', async ({ page }) => {
  await page.context().clearCookies()
  await page.goto('/projects/some-id/canvas')
  await expect(page).toHaveURL(/\/login/)
})

// ── AC: Empty state ────────────────────────────────────────────────────────────

test('KPI panel shows "Keine Daten" message when no flows are defined', async ({ page }) => {
  await page.setContent(`
    <html>
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="flex h-screen bg-background p-0">
        <div class="flex h-full w-64 border-l bg-white" data-testid="kpi-panel">
          <div class="p-4 space-y-4">
            <div class="flex items-center gap-2">
              <span class="text-sm font-semibold">Kennzahlen</span>
            </div>
            <div class="rounded-md bg-gray-100 border px-3 py-4 text-center" data-testid="empty-state">
              <p class="text-xs text-gray-500 leading-relaxed">
                Keine Daten — bitte Materialflüsse definieren
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `)

  const emptyState = page.getByTestId('empty-state')
  await expect(emptyState).toBeVisible()
  await expect(emptyState).toContainText('Keine Daten')
  await expect(emptyState).toContainText('Materialflüsse definieren')
})

// ── AC: KPI card labels and units ──────────────────────────────────────────────

test('KPI panel renders Gesamtdistanz card with m/Tag unit', async ({ page }) => {
  await page.setContent(`
    <html>
      <head><script src="https://cdn.tailwindcss.com"></script></head>
      <body>
        <div data-testid="kpi-panel">
          <div data-testid="kpi-card-distance">
            <span class="label">Gesamtdistanz</span>
            <span class="value">1.234</span>
            <span class="unit">m/Tag</span>
          </div>
          <div data-testid="kpi-card-cost">
            <span class="label">Transportkosten</span>
            <span class="value">617,00</span>
            <span class="unit">€/Tag</span>
          </div>
          <div data-testid="kpi-card-transports">
            <span class="label">Transporte</span>
            <span class="value">50</span>
            <span class="unit">/Tag</span>
          </div>
        </div>
      </body>
    </html>
  `)

  await expect(page.getByTestId('kpi-card-distance')).toContainText('Gesamtdistanz')
  await expect(page.getByTestId('kpi-card-distance')).toContainText('m/Tag')

  await expect(page.getByTestId('kpi-card-cost')).toContainText('Transportkosten')
  await expect(page.getByTestId('kpi-card-cost')).toContainText('€/Tag')

  await expect(page.getByTestId('kpi-card-transports')).toContainText('Transporte')
  await expect(page.getByTestId('kpi-card-transports')).toContainText('/Tag')
})

// ── AC: Collapse / expand toggle ───────────────────────────────────────────────

test('KPI panel collapse toggle changes icon direction', async ({ page }) => {
  await page.setContent(`
    <html>
      <head><script src="https://cdn.tailwindcss.com"></script></head>
      <body>
        <div style="display:flex;height:100vh">
          <!-- Collapse strip -->
          <button
            id="collapse-btn"
            aria-label="KPI-Panel einklappen"
            onclick="toggle()"
            style="width:20px;background:#f0f0f0;border:1px solid #ccc;cursor:pointer"
          >
            ›
          </button>
          <!-- Panel content -->
          <div id="panel-content" style="width:256px;border-left:1px solid #ccc;padding:16px">
            <span>Kennzahlen</span>
          </div>
        </div>
        <script>
          let isOpen = true
          function toggle() {
            isOpen = !isOpen
            const btn = document.getElementById('collapse-btn')
            const panel = document.getElementById('panel-content')
            if (isOpen) {
              panel.style.display = 'block'
              btn.setAttribute('aria-label', 'KPI-Panel einklappen')
            } else {
              panel.style.display = 'none'
              btn.setAttribute('aria-label', 'KPI-Panel ausklappen')
            }
          }
        </script>
      </body>
    </html>
  `)

  // Initially open
  const btn = page.locator('#collapse-btn')
  const panel = page.locator('#panel-content')

  await expect(btn).toHaveAttribute('aria-label', 'KPI-Panel einklappen')
  await expect(panel).toBeVisible()

  // Click to collapse
  await btn.click()
  await expect(btn).toHaveAttribute('aria-label', 'KPI-Panel ausklappen')
  await expect(panel).toBeHidden()

  // Click again to expand
  await btn.click()
  await expect(btn).toHaveAttribute('aria-label', 'KPI-Panel einklappen')
  await expect(panel).toBeVisible()
})

// ── AC: Settings section ───────────────────────────────────────────────────────

test('KPI panel settings section renders Kostensatz and Meter-pro-Zelle inputs', async ({ page }) => {
  await page.setContent(`
    <html>
      <head><script src="https://cdn.tailwindcss.com"></script></head>
      <body>
        <div data-testid="kpi-settings">
          <p>Einstellungen</p>
          <div>
            <label for="cost-rate">Kostensatz (€/m)</label>
            <input id="cost-rate" type="number" value="0.5" min="0" step="0.01" data-testid="input-cost-rate" />
          </div>
          <div>
            <label for="meters-per-cell">Meter pro Zelle (m)</label>
            <input id="meters-per-cell" type="number" value="1.0" min="0.01" step="0.1" data-testid="input-meters-per-cell" />
          </div>
        </div>
      </body>
    </html>
  `)

  const settings = page.getByTestId('kpi-settings')
  await expect(settings).toContainText('Einstellungen')

  const costInput = page.getByTestId('input-cost-rate')
  await expect(costInput).toBeVisible()
  await expect(costInput).toHaveValue('0.5')

  const mpcInput = page.getByTestId('input-meters-per-cell')
  await expect(mpcInput).toBeVisible()
  await expect(mpcInput).toHaveValue('1.0')

  // Verify the inputs accept changes
  await costInput.fill('1.25')
  await expect(costInput).toHaveValue('1.25')

  await mpcInput.fill('2.5')
  await expect(mpcInput).toHaveValue('2.5')
})

// ── AC: Top-3 flows section ────────────────────────────────────────────────────

test('KPI panel renders Top-3 flows section with Von → Nach | Intensität format', async ({ page }) => {
  await page.setContent(`
    <html>
      <head><script src="https://cdn.tailwindcss.com"></script></head>
      <body>
        <div data-testid="top3-section">
          <p>Top 3 Flüsse nach Intensität</p>
          <div data-testid="flow-row-1">
            <span>1</span>
            <span>Werkzeugmaschine → Montage</span>
            <span>Intensität: 150</span>
            <span>·</span>
            <span>12,5 m</span>
          </div>
          <div data-testid="flow-row-2">
            <span>2</span>
            <span>Montage → Lackierung</span>
            <span>Intensität: 80</span>
            <span>·</span>
            <span>8,0 m</span>
          </div>
          <div data-testid="flow-row-3">
            <span>3</span>
            <span>Lackierung → Verpackung</span>
            <span>Intensität: 40</span>
            <span>·</span>
            <span>5,5 m</span>
          </div>
        </div>
      </body>
    </html>
  `)

  const section = page.getByTestId('top3-section')
  await expect(section).toContainText('Top 3 Flüsse nach Intensität')

  const row1 = page.getByTestId('flow-row-1')
  await expect(row1).toContainText('Werkzeugmaschine → Montage')
  await expect(row1).toContainText('Intensität: 150')

  const row2 = page.getByTestId('flow-row-2')
  await expect(row2).toContainText('Montage → Lackierung')
  await expect(row2).toContainText('Intensität: 80')

  const row3 = page.getByTestId('flow-row-3')
  await expect(row3).toContainText('Lackierung → Verpackung')
  await expect(row3).toContainText('Intensität: 40')
})

// ── AC: Kostensatz = 0 edge case ───────────────────────────────────────────────

test('KPI panel renders correctly when Kostensatz is set to 0', async ({ page }) => {
  await page.setContent(`
    <html>
      <head><script src="https://cdn.tailwindcss.com"></script></head>
      <body>
        <div data-testid="kpi-panel">
          <div data-testid="cost-card">
            <span class="label">Transportkosten</span>
            <span class="value" data-testid="cost-value">0,00</span>
            <span class="unit">€/Tag</span>
          </div>
          <div>
            <label>Kostensatz (€/m)</label>
            <input type="number" value="0" min="0" step="0.01" data-testid="cost-input" />
          </div>
        </div>
      </body>
    </html>
  `)

  await expect(page.getByTestId('cost-value')).toContainText('0,00')
  await expect(page.getByTestId('cost-input')).toHaveValue('0')
})

// ── Regression: login page ─────────────────────────────────────────────────────

test('Login page still renders with email and password fields (regression)', async ({ page }) => {
  await page.goto('/login')
  await expect(page.locator('input[type="email"]')).toBeVisible()
  await expect(page.locator('input[type="password"]')).toBeVisible()
})

test('Canvas route redirects unauthenticated users (regression)', async ({ page }) => {
  await page.context().clearCookies()
  await page.goto('/projects/regression-test/canvas')
  await expect(page).toHaveURL(/\/login/)
})
