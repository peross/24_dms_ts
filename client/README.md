# DMS Desktop Client

Electron-based desktop companion application for the Document Management System. The client keeps a local workspace in sync with the web platform by watching the `My Folders` directory and uploading new folders and files automatically.

## Getting Started

```bash
cd /home/pero/Documents/Racunari/24_dms_ts/client
npm install
npm run dev
```

The development script runs three concurrent processes:

- TypeScript compilation for the Electron main process and preload script (watch mode)
- Vite development server for the React renderer (port `5174`)
- Electron with hot-reload via `nodemon`

## Initial Setup Flow

1. **Configure API** – Provide the base URL of the backend (e.g. `http://localhost:3000/api`). A helper normalizes the URL and stores it in `electron-store`.
2. **Authenticate** – Log in with your regular DMS credentials. Two-factor authentication tokens are supported when required. Access tokens are stored securely in the main process and refreshed automatically via the API.
3. **Choose Workspace** – Select the local directory that should mirror the DMS folders. The app creates the canonical structure (`General`, `My Folders`, `Shared With Me`) on first run.
4. **Automatic Sync** – On startup the app pulls down your remote folders/files before enabling the watcher, ensuring the local workspace reflects the server.
5. **Continuous Upload** – Once authenticated and a workspace is set, a `chokidar` watcher observes the `My Folders` subtree:
   - New folders are created remotely (respecting `system_folder_id: 2`).
   - New files are uploaded to the corresponding folder using the existing `/api/files/upload` endpoint.

The app maintains folder-to-id mappings in `electron-store` so nested uploads target the correct remote folders.

## Production Build

```bash
npm run build
```

Outputs are written to `dist/`:

- `dist/main` – Electron main process bundle
- `dist/preload` – Preload script
- `dist/renderer` – React renderer assets

You can then package the app using Electron Builder or Forge (not included yet).

## Project Structure

- `src/main` – Electron main process, IPC handlers, file sync logic
- `src/preload` – Secure bridge exposing limited IPC entry points
- `src/renderer` – React front-end for configuration, quick access shortcuts, and a searchable file list
- `src/shared` – Cross-process constants

Persisted settings live under `client-data/settings.json` (created automatically on first run).

## Next Steps

- Handle rename/move/delete events for full parity with the web platform
- Surface sync progress and error history to the renderer
- Package installers for Windows and Linux

