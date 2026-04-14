import { test, expect } from '@playwright/test'

// AC1: Login-Seite mit E-Mail und Passwort ist vorhanden
test('Login page has email and password fields', async ({ page }) => {
  await page.goto('/login')
  await expect(page.locator('input[type="email"]')).toBeVisible()
  await expect(page.locator('input[type="password"]')).toBeVisible()
  await expect(page.getByRole('button', { name: /anmelden/i })).toBeVisible()
})

// AC1 (continued): "Passwort vergessen?" link is present
test('Login page has "Passwort vergessen?" link', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('link', { name: /passwort vergessen/i })).toBeVisible()
})

// AC2: Bei falschen Zugangsdaten wird Fehlermeldung angezeigt
test('Login form shows error on invalid credentials', async ({ page }) => {
  // Intercept Supabase token endpoint and return invalid credentials error
  await page.route('https://ecarqowqwxbthvhwwegx.supabase.co/auth/v1/token*', async (route) => {
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'invalid_grant',
        error_description: 'Invalid login credentials',
      }),
    })
  })

  await page.goto('/login')
  await page.fill('input[type="email"]', 'wrong@example.com')
  await page.fill('input[type="password"]', 'wrongpassword')
  await page.getByRole('button', { name: /anmelden/i }).click()

  // shadcn Alert renders with nested role="alert"; use first() to avoid strict-mode violation
  await expect(page.getByRole('alert').first()).toBeVisible()
  await expect(page.getByRole('alert').first()).toContainText(/falsch|fehlgeschlagen/i)
})

// AC7: Nicht eingeloggte Nutzer werden automatisch zur Login-Seite weitergeleitet
// BUG: This test is expected to FAIL — middleware does not redirect unauthenticated users (Critical bug)
test('Unauthenticated users are redirected to /login from protected route', async ({ page }) => {
  await page.goto('/')
  // Middleware should redirect to /login. If this fails, the middleware is broken.
  await expect(page).toHaveURL(/\/login/)
})

// AC8: Passwort-Reset Seite ist vorhanden
test('Forgot-password page renders with email field', async ({ page }) => {
  await page.goto('/forgot-password')
  await expect(page.locator('input[type="email"]')).toBeVisible()
  await expect(page.getByRole('button', { name: /reset-link senden/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /zurück zur anmeldung/i })).toBeVisible()
})

// AC8 (continued): Password reset shows success message after submission
test('Forgot-password shows success message after valid email', async ({ page }) => {
  await page.route('https://ecarqowqwxbthvhwwegx.supabase.co/auth/v1/recover*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    })
  })

  await page.goto('/forgot-password')
  await page.fill('input[type="email"]', 'user@neonex.de')
  await page.getByRole('button', { name: /reset-link senden/i }).click()

  await expect(page.getByRole('alert').first()).toBeVisible()
  await expect(page.getByRole('alert').first()).toContainText(/link.*geschickt|posteingang/i)
})

// UX: Password visibility toggle works
test('Password visibility toggle shows/hides password', async ({ page }) => {
  await page.goto('/login')
  const passwordInput = page.locator('input#password')
  await expect(passwordInput).toHaveAttribute('type', 'password')

  const toggleButton = page.getByRole('button', { name: /passwort anzeigen/i })
  await toggleButton.click()
  await expect(passwordInput).toHaveAttribute('type', 'text')

  const hideButton = page.getByRole('button', { name: /passwort ausblenden/i })
  await hideButton.click()
  await expect(passwordInput).toHaveAttribute('type', 'password')
})

// Responsiveness: Login page works on mobile
test('Login page is usable on mobile (375px)', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/login')
  await expect(page.locator('input[type="email"]')).toBeVisible()
  await expect(page.locator('input[type="password"]')).toBeVisible()
  await expect(page.getByRole('button', { name: /anmelden/i })).toBeVisible()
})

// Security: /auth/callback without code redirects to /login with error
test('/auth/callback without code redirects to /login with error', async ({ page }) => {
  await page.goto('/auth/callback')
  await expect(page).toHaveURL(/\/login.*error=auth_callback_failed/)
})
