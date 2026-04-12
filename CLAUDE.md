# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # Start dev server at http://localhost:4200 (hot reload)
npm run build      # Production build to dist/
npm run watch      # Dev build in watch mode
npm test           # Run unit tests with Vitest
```

To scaffold new code: `ng generate component|service|directive|pipe <name>`

## Architecture

This is an **Angular 21** SPA using the modern **standalone component** architecture (no NgModules).

**Key patterns:**
- **Standalone components** — components declare their own imports directly in `@Component({ imports: [...] })`
- **Signals** — use Angular Signals (`signal()`, `computed()`) for reactive state rather than RxJS Subjects in components
- **Functional providers** — app configuration in `src/app/app.config.ts` uses `provideRouter()`, `provideBrowserGlobalErrorListeners()` etc.
- **SCSS** — default style language; styles are component-scoped; `src/styles.scss` is for global styles only

**Entry points:**
- `src/main.ts` — bootstraps the app
- `src/app/app.ts` — root standalone component
- `src/app/app.config.ts` — application-level providers
- `src/app/app.routes.ts` — route definitions (currently empty, add feature routes here)

**Bundle budgets** (enforced in `angular.json`): 500KB warning / 1MB error for initial bundle; 4KB/8KB per component style.

## TypeScript

Strict mode is enabled. Angular-specific strict options are on: `strictTemplates`, `strictInjectionParameters`. Target is ES2022.

## Stack

- State management: NgRx Signal Store
- UI: Angular Material with custom theme
- API: REST with HttpClient + `httpResource()`
- Testing: Vitest (unit), Playwright (e2e)

## Conventions

- Feature-based folder structure: `feature-name/{component,service,store,model,routes}`
- All components use `OnPush` change detection
- API calls through services, never directly in components
- Barrel exports (`index.ts`) for every feature folder

## API calls and error handling

All HTTP calls go through `HmrcApiService` (`get<T>`, `post<T>`) — never use `HttpClient` directly in components or stores.

**Error flow:** services throw, stores catch and translate.
- Services throw `Error` (or let `HttpErrorResponse` propagate) — no swallowing.
- Every `async` store method wraps its service call in `try/catch`.
- Use `extractErrorMessage(e, 'Fallback message')` (from `src/app/core`) to convert any caught value into a string.
- Set `{ status: 'error', error: message, isLoading: false }` on failure.
- Sign-out / cleanup methods should still `try/catch` but clear local state regardless of IPC errors.

```typescript
import { extractErrorMessage } from '../../core';

try {
  await someService.doWork();
  patchState(store, { isLoading: false });
} catch (e: unknown) {
  patchState(store, { status: 'error', error: extractErrorMessage(e, 'Operation failed'), isLoading: false });
}
```

## Vitest

Tests run via Angular's build wrapper — always use `npm test`, not `npx vitest run` (the latter lacks jsdom).

- Test files live alongside source: `feature.spec.ts` next to `feature.ts`
- Use Angular `TestBed` for all component/service/store tests
- Provide HTTP mocking with `provideHttpClient()` + `provideHttpClientTesting()` and `HttpTestingController`
- Always call `httpController.verify()` in `afterEach` to catch unexpected requests
- Access `protected` members in tests via `(component as unknown as { member: Type }).member`
- Every new service, store, and component must have a corresponding `.spec.ts` covering: creation, initial state, public methods, and template elements

## JSDoc

All exported functions, classes, methods, interfaces, and types must have JSDoc.

- Files: `@fileoverview` block at the top describing the file's purpose
- Interfaces/types: document each field with an inline `/** ... */` comment
- Methods: `@param`, `@returns`, and `@throws` where applicable
- Keep descriptions concise — one sentence is enough for self-evident behaviour
- Do not add JSDoc to private implementation details or test files

## Accessibility (EN 301 549 / WCAG 2.1 AA)

This app targets **EN 301 549 Clause 11** compliance (WCAG 2.1 AA applied to software UIs via WCAG2ICT). Chromium exposes the DOM accessibility tree to platform AT APIs (UIA on Windows, NSAccessibility on macOS) automatically, so correct semantics and ARIA usage are the primary requirements.

**Required in every component:**
- All interactive elements must be keyboard-operable and have visible `:focus-visible` styles (global ring defined in `styles.scss`)
- Never convey information by colour alone — pair colour with text, icons, or patterns
- Provide `aria-label` on icon-only controls (buttons, links) and on landmark elements with ambiguous names
- Announce loading and status changes with `aria-live="polite"` (or `"assertive"` for urgent updates)
- Meaningful images need `alt` text; decorative images and icons need `aria-hidden="true"`

**OS preferences — `AccessibilityService` (`src/app/core`):**

Import and inject to read OS preferences as Angular signals:
```typescript
readonly a11y = inject(AccessibilityService);
// a11y.prefersReducedMotion(), a11y.prefersHighContrast(),
// a11y.forcedColors(), a11y.prefersDarkMode(), a11y.screenReaderActive()
```

- `prefers-reduced-motion` — already handled globally in `styles.scss`; avoid JS animations when `a11y.prefersReducedMotion()` is true
- `forced-colors` — avoid hardcoded hex colours in component styles; use CSS custom properties so Forced Colors mode can override them
- `screenReaderActive` — use to opt into more verbose live-region announcements when a screen reader is running (Electron only)

**Navigation patterns:**
- Skip link (`<a class="skip-link" href="#main-content">`) at the top of the shell
- `<nav aria-label="...">` for every navigation region
- `aria-current="page"` on the active link (use `routerLinkActive` template ref: `[attr.aria-current]="rla.isActive ? 'page' : null"`)
- `<main id="main-content" tabindex="-1">` as the skip-link target

## Avoid

- No NgModules, no CommonModule imports
- No constructor injection
- No `*ngIf`/`*ngFor` — use `@if`/`@for`
- No `subscribe()` in components
