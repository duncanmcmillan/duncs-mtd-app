# duncs-mtd-app

HMRC MTD App — built with [Angular CLI](https://github.com/angular/angular-cli) version 21.1.2.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Electron Build

This project has been integrated with [Electron](https://www.electronjs.org/) to run as a desktop application.

### Key files

- **`main.js`** — Electron entry point. Creates the `BrowserWindow` and loads the compiled Angular app from `dist/duncs-mtd-app/browser/index.html`.
- **`preload.js`** — Runs in a privileged context before the renderer loads. Uses Electron's `contextBridge` to safely expose Node.js APIs (e.g. `process.versions`) to the Angular app via `window.versions`.

### How it works

1. Electron starts via `main.js`, which opens a browser window pointed at the built Angular app.
2. `preload.js` is loaded before the renderer and exposes `window.versions` (Node, Chrome, Electron version strings) using `contextBridge.exposeInMainWorld`.
3. The Angular `App` component reads `window.versions` and displays the version info in the UI.

### Build process

Because Electron loads the app via `file://`, the Angular build must use a relative `base-href`:

```bash
npm run build -- --base-href ./
```

This outputs the app to `dist/` which is committed to version control so Electron can load it without a local dev server.

### IPC (Inter-Process Communication)

Electron separates the **main process** (Node.js, full OS access) from the **renderer process** (the Angular app, sandboxed). They communicate via IPC.

**Example ping/pong flow:**

1. `preload.js` exposes a `ping` function to the renderer via `contextBridge`:
   ```js
   ping: () => ipcRenderer.invoke('ping')
   ```
2. `main.js` registers a handler in `whenReady`:
   ```js
   ipcMain.handle('ping', () => 'pong')
   ```
3. The Angular component calls it and logs the response:
   ```ts
   const response = await eWin.versions.ping(); // → 'pong'
   console.log(response);
   ```

This pattern (expose via `contextBridge` → invoke via `ipcRenderer` → handle via `ipcMain`) is the secure, recommended way to call main-process code from Angular.

### Debugging

`main.js` calls `win.webContents.openDevTools()` on launch, opening Chrome DevTools automatically. Use the **Console** tab to inspect renderer logs and errors.

### Running the desktop app

```bash
npm run start-electron
```

This runs `electron .`, which reads `main.js` as the entry point (set via `"main": "main.js"` in `package.json`).

## Accessibility

This application targets **EN 301 549 Clause 11** compliance — the European standard that transposes WCAG 2.1 AA requirements into software UI contexts. [WCAG2ICT](https://www.w3.org/TR/wcag2ict/) is used as interpretive guidance when applying web-oriented success criteria to the desktop context.

### Platform accessibility API exposure

Electron renders the Angular app via Chromium, which automatically builds and exposes the DOM accessibility tree to the host platform's native AT API:

| Platform | API | Assistive technologies |
|----------|-----|------------------------|
| Windows  | UI Automation (UIA) | NVDA, JAWS, Narrator |
| macOS    | NSAccessibility | VoiceOver |

Semantic HTML, ARIA roles, and correct focus management are therefore sufficient to surface the UI to platform-native screen readers and other AT — no custom bindings are required.

### OS-level accessibility preferences

The app detects and responds to the following OS accessibility settings at runtime via `AccessibilityService` (`src/app/core`):

| Preference | CSS media query | Effect |
|-----------|----------------|--------|
| Reduced motion | `prefers-reduced-motion: reduce` | All transitions and animations disabled (`global styles.scss`) |
| High contrast | `prefers-contrast: more` | Higher contrast ratios applied |
| Forced Colors | `forced-colors: active` | Windows High Contrast mode; custom colours replaced by system values |
| Dark mode | `prefers-color-scheme: dark` | Available via `AccessibilityService.prefersDarkMode` signal |
| Screen reader active | Electron `app.accessibilitySupportEnabled` | Available via `AccessibilityService.screenReaderActive` signal |

The `AccessibilityService` exposes each preference as a read-only Angular signal. Inject it into any component or service that needs to adapt its behaviour:

```typescript
import { AccessibilityService } from '../core';

readonly a11y = inject(AccessibilityService);

// In template: @if (a11y.screenReaderActive()) { ... }
// Or read the full snapshot: this.a11y.preferences()
```

### IPC flow (Electron)

Native AT and theme preferences are bridged from the main process:

1. `main.js` registers an `a11y:get-preferences` IPC handler that reads `app.accessibilitySupportEnabled`, `nativeTheme.shouldUseHighContrastColors`, and `nativeTheme.shouldUseInvertedColorScheme`.
2. `main.js` pushes `a11y:preferences-changed` events to all renderer windows when `nativeTheme` updates or `accessibility-support-changed` fires.
3. `preload.js` exposes `window.accessibility.getPreferences()` and `window.accessibility.onPreferencesChanged()` to the Angular renderer.
4. `AccessibilityService.initElectronBridge()` queries on startup and subscribes to changes.

### Keyboard navigation

- A **skip link** (`Skip to main content`) is rendered at the top of every page and becomes visible on keyboard focus, allowing keyboard users to bypass the navigation bar.
- All navigation links carry `aria-current="page"` when active.
- The `<main id="main-content">` landmark is the skip link target and receives `tabindex="-1"` so focus can be programmatically moved to it.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
