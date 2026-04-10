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

### Running the desktop app

```bash
npm run start-electron
```

This runs `electron .`, which reads `main.js` as the entry point (set via `"main": "main.js"` in `package.json`).

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
