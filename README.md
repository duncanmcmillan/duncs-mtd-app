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

### Testing checklist

Manual steps to verify the accessibility baseline is working correctly:

- [ ] Press `Tab` on the app — confirm the skip link appears and, when activated, moves focus to `<main>`
- [ ] Keyboard-navigate through all nav links — confirm `aria-current="page"` is set on the active link and absent on others
- [ ] Enable **Reduce Motion** in OS settings (macOS: Accessibility → Display; Windows: Settings → Ease of Access → Display) — confirm all CSS transitions are disabled
- [ ] Enable **Windows High Contrast** or macOS **Increase Contrast** — confirm `forced-colors` tokens apply and no information is lost
- [ ] Start a screen reader (NVDA or JAWS on Windows; VoiceOver on macOS) — confirm `AccessibilityService.screenReaderActive` becomes `true` in DevTools
- [ ] Run `npm test` — confirm the `AccessibilityService` unit tests pass

## Privacy & Data (UK GDPR)

This application processes clients' personal tax data (NINO, OAuth tokens, HMRC credentials) and
is therefore subject to UK GDPR.

### Lawful basis

Processing is carried out under **Article 6(1)(b) UK GDPR** — performance of a contract.
Data is used solely to submit Making Tax Digital returns on behalf of the operator's clients as
required by HMRC.

### What is stored locally

| Data | Storage | Location |
|------|---------|----------|
| OAuth access & refresh tokens | Encrypted via OS keychain (`safeStorage`) | `userData/hmrc-tokens.enc` |
| HMRC client ID & secret | Encrypted via OS keychain (`safeStorage`) | `userData/hmrc-config.enc` |
| Consent record | Plain JSON (not sensitive) | `userData/gdpr-consent.json` |

No personal data is transmitted to any third-party server. All HMRC API calls are made over TLS.

### Data retention

- Tokens are cleared when the user signs out (`hmrc:clear-tokens` IPC handler).
- Config credentials remain until the user explicitly deletes them or uses **Delete All My Data**.

### `userData` location per OS

| Platform | Path |
|----------|------|
| Windows | `%APPDATA%\duncs-mtd-app\` |
| macOS | `~/Library/Application Support/duncs-mtd-app/` |
| Linux | `~/.config/duncs-mtd-app/` |

### Right to erasure (Article 17 UK GDPR)

Users can delete all locally stored data in-app:

1. Navigate to **Privacy** in the top navigation bar.
2. Click **Delete All My Data**.
3. This deletes `hmrc-tokens.enc`, `hmrc-config.enc`, and `gdpr-consent.json` and signs the user out.

Alternatively, delete the files manually from the `userData` path listed above.

### ICO registration

If you process clients' personal data commercially (as an accountant or tax agent) you may be
required to register with the Information Commissioner's Office.
See [ico.org.uk/registration](https://ico.org.uk/registration) for guidance and fees.

### Privacy notice

A privacy notice dialog is shown on first launch. The user must accept before the app loads.
The notice can be reviewed at any time via **Settings → Privacy**.

### Testing checklist

Manual steps to verify the GDPR features are working correctly:

- [ ] `npm run build` — passes with no TypeScript or template errors
- [ ] `npm test` — all spec files pass (including `privacy.service.spec.ts`, `privacy-dialog.component.spec.ts`, `privacy-settings.component.spec.ts`)
- [ ] Delete `userData/gdpr-consent.json` manually → privacy notice dialog appears on next launch
- [ ] Click **I Agree & Continue** → dialog closes and the app loads normally; re-launch → no dialog shown
- [ ] Navigate to **/privacy** → settings page renders with the full privacy notice and a **Delete All My Data** button
- [ ] Click **Delete All My Data** → `hmrc-tokens.enc`, `hmrc-config.enc`, and `gdpr-consent.json` are removed from `userData`; user is redirected to `/auth`
- [ ] After deletion, re-launch the app → privacy notice dialog appears again (consent was cleared)

## MTD App End-To-End Journey Summary

> Reference: [HMRC Income Tax MTD End-to-End Service Guide — Customer Journey](https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/documentation/customer-journey.html)

### 1. Income Sources and Obligations

Once authorised, the user should navigate to both the Sources tab then the Obligations tab.

| Step | API / Tab details                  | Notes | Task Type |
|------|------------------------------------|-------|-----------|
| 3    | Business Details (Lists Businesses)| —     | API       |
| 4    | Obligations                        | —     | API       |
| 6    | View updated Obligations           | —     | TAB       |

### 2. Quarterly Submissions

Navigate to the Quarterly Tab and progress entering data for all relevant periods and income sources. Repeat the steps below. Navigate to the Obligations Tab to see real-time updates.

| Step  | API / Tab details                                   | Notes           | Task Type |
|-------|-----------------------------------------------------|-----------------|-----------|
| 8     | View status of all Quarterly Submissions            | —               | TAB       |
| 10    | Self Employment Period Summary — cumulative         | —               | API       |
| 10a/b | Property Period Summary — cumulative                | —               | API       |
| 10d   | Obligations (update)                                | —               | API       |
| 14    | Individual Calculations — in-year (user optional)  | —               | API       |

### 3. Allowances

Several business allowance types exist that can be declared during or before an SATR submission. The user can declare these and submit to HMRC as follows using the Allowances Tab (new).

| Step | API / Tab details                       | Notes | Task Type |
|------|-----------------------------------------|-------|-----------|
| 16   | Self Employment Annual Submission       | —     | API       |
| 18   | View Confirmation of Allowances change  | —     | TAB       |

### 4. Adjustments

Several business adjustment types exist that can be declared during or before an SATR submission. The user can declare these and submit to HMRC as follows using the Adjustments Tab.

| Step | API / Tab details                             | Notes      | Task Type |
|------|-----------------------------------------------|------------|-----------|
| 22   | Trigger Business Source Adjustment Summary    | use calcID | API       |
| 24   | Submit Business Source Adjustment Summary     | —          | API       |
| 26   | View Confirmation of Adjustment change        | —          | TAB       |

### 5. Dividends

Dividends are classed as an income source and therefore can affect tax calculations; they are usually declared once during a Tax Year. The user can declare these and submit to HMRC as follows using the Dividends Tab (new).

| Step  | API / Tab details                             | Notes | Task Type |
|-------|-----------------------------------------------|-------|-----------|
| 29    | Individuals Dividend Income (create & amend)  | —     | API       |
| 31/32 | View Confirmation of Dividend entries         | —     | TAB       |

### 6. Individual Calculations — Self Assessment

All Annual Self Assessment Obligations and submissions can be declared and submitted to HMRC as follows using the Self Assessment Tab.

| Step | API / Tab details                                    | Notes      | Task Type |
|------|------------------------------------------------------|------------|-----------|
| 34   | Individual Calculations 'intent-to-finalise'         | —          | API       |
| 38   | Individual Calculations — Retrieve a SAT calc        | use calcID | API       |
| 41   | View Tax Calculation results                         | —          | TAB       |
| 42   | Confirm Tax Calculation results                      | —          | TAB       |
| 43   | Individual Calculations — submit a SAT calc          | —          | API       |
| 45   | View confirmation of submission (SA & Obligation)    | —          | TAB       |

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
