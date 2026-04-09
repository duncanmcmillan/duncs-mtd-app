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

## Avoid

- No NgModules, no CommonModule imports
- No constructor injection
- No `*ngIf`/`*ngFor` — use `@if`/`@for`
- No `subscribe()` in components
