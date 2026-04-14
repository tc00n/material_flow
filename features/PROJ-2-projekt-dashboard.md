# PROJ-2: Projekt-Dashboard (Projekte verwalten)

## Status: Deployed
**Created:** 2026-04-14
**Last Updated:** 2026-04-14

## Dependencies
- Requires: PROJ-1 (User Authentication) — nur eingeloggte Berater können Projekte verwalten

## User Stories
- As a consultant, I want to see all my projects on a dashboard so that I have a quick overview.
- As a consultant, I want to create a new project with a name and description so that I can start a new client engagement.
- As a consultant, I want to open an existing project so that I can continue working on it.
- As a consultant, I want to rename a project so that I can keep it organized.
- As a consultant, I want to delete a project so that I can remove outdated work.
- As a consultant, I want to see when a project was last modified so that I know which version is current.

## Acceptance Criteria
- [ ] Dashboard zeigt alle Projekte des eingeloggten Nutzers als Karten-Übersicht
- [ ] Jede Projektkarte zeigt: Name, Beschreibung (optional), letztes Änderungsdatum
- [ ] "Neues Projekt erstellen" Button ist prominent platziert
- [ ] Beim Erstellen muss mindestens ein Projektname angegeben werden
- [ ] Projekte können umbenannt werden (Inline-Bearbeitung oder Modal)
- [ ] Projekte können gelöscht werden — mit Bestätigungsdialog ("Wirklich löschen?")
- [ ] Klick auf Projektkarte öffnet den Layout Canvas (PROJ-3)
- [ ] Leerer Zustand: Wenn keine Projekte vorhanden, wird ein Hinweis + CTA angezeigt

## Edge Cases
- Was passiert, wenn der Projektname leer gelassen wird? → Validierungsfehler, Speichern blockiert
- Was passiert beim Löschen eines Projekts mit gespeicherten Layout-Daten? → Alles wird gelöscht (kein Recovery)
- Was passiert, wenn zwei Projekte denselben Namen haben? → Erlaubt (IDs sind eindeutig)
- Was passiert bei sehr vielen Projekten (> 50)? → Suche/Filter-Funktion oder Pagination

## Technical Requirements
- Daten in Supabase (Tabelle: projects, verknüpft mit user_id)
- Optimistic UI Update beim Erstellen/Löschen
- Browser Support: Chrome, Firefox, Safari (Desktop)

---
## Implementation Notes (2026-04-14)

### What was built
- **Supabase migration**: `projects` table with `id`, `user_id`, `name`, `description`, `created_at`, `updated_at` — RLS enabled with per-user SELECT/INSERT/UPDATE/DELETE policies; `update_updated_at_column` trigger auto-updates `updated_at`
- **Server actions** (`src/app/actions/projects.ts`): `getProjects`, `createProject`, `updateProject`, `deleteProject` — all validated with Zod, auth-guarded
- **Dashboard page** (`src/app/(protected)/page.tsx`): Server component, replaces Next.js placeholder; shows project grid or empty state with CTA
- **`ProjectCard`** (`src/components/project-card.tsx`): card with name, description, last-modified date, hover dropdown for rename/delete
- **`CreateProjectDialog`** (`src/components/create-project-dialog.tsx`): modal form with name + optional description, inline error display
- **`EditProjectDialog`** (`src/components/edit-project-dialog.tsx`): modal for renaming/editing description
- **Delete confirmation**: `AlertDialog` with "Wirklich löschen?" copy

### Deviations from spec
- PROJ-3 (Layout Canvas) not yet built — project card links to `/projects/:id` which will 404 until PROJ-3 is implemented
- Search/filter for >50 projects deferred (pagination hook + `limit(100)` in place)

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
**Date:** 2026-04-14
**Tester:** QA Engineer (automated)
**Build:** main branch, post-PROJ-1 auth fix

### Acceptance Criteria

| # | Criterion | Result | Notes |
|---|-----------|--------|-------|
| AC-1 | Dashboard zeigt alle Projekte als Karten-Übersicht | ✅ PASS | Server component calls `getProjects()`, renders `ProjectCard` grid |
| AC-2 | Karte zeigt Name, Beschreibung, letztes Änderungsdatum | ✅ PASS | `updated_at` formatted as `DD.MM.YYYY`, description italicised when absent |
| AC-3 | "Neues Projekt" Button prominent platziert | ✅ PASS | Visible in page header AND repeated inside empty state |
| AC-4 | Erstellen erfordert Projektname | ✅ PASS | HTML5 `required` + Zod `min(1)` server-side; error message displayed inline |
| AC-5 | Projekte können umbenannt werden | ✅ PASS | `EditProjectDialog` via dropdown; pre-fills current name + description |
| AC-6 | Löschen mit Bestätigungsdialog | ✅ PASS | `AlertDialog` with "Wirklich löschen" CTA, disabled during pending state |
| AC-7 | Klick auf Karte öffnet Layout Canvas (PROJ-3) | ⚠️ KNOWN DEVIATION | Links to `/projects/:id` — 404 until PROJ-3 is built (documented in Implementation Notes) |
| AC-8 | Leerer Zustand mit Hinweis + CTA | ✅ PASS | Dashed border, `FolderOpen` icon, descriptive text, second `CreateProjectDialog` trigger |

**7 / 8 criteria passed.** AC-7 is a known, documented deviation — not a QA failure.

### Edge Cases

| Edge Case | Result | Notes |
|-----------|--------|-------|
| Leerer Projektname → Validierungsfehler | ✅ PASS | HTML5 blocks submit; Zod blocks server action; error shown inline |
| Whitespace-only name | ✅ PASS | Zod `min(1)` rejects after trimming (empty string fails) |
| Name > 100 Zeichen | ✅ PASS | Zod returns "Name zu lang" |
| Beschreibung > 500 Zeichen | ✅ PASS | Zod returns "Beschreibung zu lang" |
| Gleicher Name zweimal | ✅ PASS | Erlaubt (IDs eindeutig) |
| > 50 Projekte | ⚠️ DEFERRED | `limit(100)` in place; pagination/search deferred per spec |

### Security Audit

| Check | Result | Notes |
|-------|--------|-------|
| Auth Guard: Unauthenticated → `/login` | ✅ PASS | `ProtectedLayout` checks `supabase.auth.getUser()` server-side |
| User Isolation: SELECT | ✅ PASS | RLS policy ensures only own projects are returned |
| User Isolation: UPDATE | ✅ PASS | Server action filters `.eq('user_id', user.id)` + RLS |
| User Isolation: DELETE | ✅ PASS | Server action filters `.eq('user_id', user.id)` + RLS |
| Input Injection (XSS) | ✅ PASS | React escapes all rendered user content |
| Input Validation (SQL Injection) | ✅ PASS | Zod validates; Supabase parameterised queries |
| Exposed data via GET / | ✅ PASS | Returns HTML redirect, not JSON data |
| Rate Limiting | ⚠️ LOW | No per-user rate limit on `createProject` — a user could spam-create projects |
| Silent success on 0 rows modified | ⚠️ LOW | `updateProject`/`deleteProject` return `{ success: true }` even if RLS blocked the write (0 rows affected). RLS still protects data, but feedback is misleading. |

### Bugs Found

| ID | Severity | Component | Description | Steps to Reproduce |
|----|----------|-----------|-------------|--------------------|
| BUG-1 | **Medium** | `project-card.tsx:45-49` | `deleteProject` result is not checked — if the server action returns an error, the dialog closes silently with no feedback to the user | Trigger a DB error during delete (e.g. revoke DB permissions momentarily), click "Wirklich löschen" — dialog disappears but project may still exist |
| BUG-2 | **Low** | `src/app/actions/projects.ts:107-113` | `updateProject` and `deleteProject` do not assert that at least one row was modified. Both return `{ success: true }` when RLS silently blocks the write. | Submit an update with a valid UUID that belongs to another user — server returns success but nothing changes |
| BUG-3 | **Low** | `src/app/actions/projects.ts:49-82` | No server-side rate limiting on `createProject` — authenticated user can create unlimited projects in a tight loop | Run `createProject` 200 times in rapid succession — all succeed |

### Regression Testing

PROJ-1 (User Authentication): All 9 Chromium E2E tests still pass — **no regressions**.

### Automated Tests Added

| File | Type | Tests |
|------|------|-------|
| `src/app/actions/projects.test.ts` | Unit (Vitest) | 11 schema validation tests — empty name, max length, UUID format, optional description |
| `tests/PROJ-2-projekt-dashboard.spec.ts` | E2E (Playwright) | 5 tests — auth redirect, login gateway, HTML5 required validation, desktop responsive, unauthenticated API access |

**Note:** Full CRUD E2E tests (create/rename/delete round-trip) require a saved Supabase test-account auth state (`tests/auth.json`). Add a `globalSetup` that logs in with test credentials when a test account is available.

### Production-Ready Decision

**✅ APPROVED — production-ready**

- No Critical bugs
- No High bugs
- 1 Medium bug (BUG-1: delete error not surfaced) — edge case; delete succeeds in the happy path; acceptable for internal MVP tool
- 2 Low bugs — do not block release

## Deployment

**Deployed:** 2026-04-14
**Production URL:** https://material-flow-lyart.vercel.app
**Platform:** Vercel (auto-deploy from GitHub `main`)

- Dashboard: https://material-flow-lyart.vercel.app/ (requires login)
