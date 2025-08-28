# Text to Spaceship

Interactive chat + 3D model viewer (STL) built with React, TypeScript, Vite, TailwindCSS, and Three.js.

The UI lets a user:
1. Ask an agent questions (POSTs `prompt` to the backend endpoint `/api/structure_agent`).
2. View structured JSON returned by the agent (auto‑formatted in a code block when JSON detected).
3. After the first agent response, visualize a spacecraft model (`/orion_nofbc.stl`) with orbit controls.

## Prerequisites

- Node.js 20.19+ (enforced via `package.json` engines and `.nvmrc`).
- npm (comes with Node). Yarn/pnpm also fine, but examples use npm.
- Backend API reachable at the URL you set in `VITE_API_BASE` (see Environment Variables).

## Quick Start

```bash
git clone <your-repo-url>
cd text-to-spaceship
nvm use       # or: fnm use / volta install (ensures Node 20)
npm install   # install deps (react, three, tailwind, etc.)
cp .env.example .env.local  # then edit value (optional if using secret in CI)
npm run dev   # start Vite dev server (default http://localhost:5173)
```

Open the browser at the printed URL. Type a prompt and press Enter. Once the agent responds you’ll see the model viewer on the left (desktop) or hidden on small screens (mobile breakpoint `md`).

## Environment Variables

Set the agent API base via `VITE_API_BASE`.

Examples:
```
# .env.local (ignored by git)
VITE_API_BASE=https://your-api.azurewebsites.net
```

During GitHub Actions / Azure Static Web Apps deployment, `VITE_API_BASE` is injected from a repository secret.

## Development Scripts

| Script        | Purpose                                   |
|---------------|--------------------------------------------|
| `npm run dev` | Start dev server with HMR                  |
| `npm run build` | Type-check + production build to `dist/` |
| `npm run preview` | Preview production build locally       |
| `npm run lint` | Run ESLint                                |

## Project Structure (key parts)

```
src/
  Chat.tsx              # Chat interface + JSON formatting + CAD viewer integration
  components/CADViewer.tsx  # Three.js STL viewer (STEP placeholder)
  main.tsx              # App bootstrap
  index.css             # Tailwind directives & base styles
public/
  orion_nofbc.stl       # Spacecraft STL model
  NASA-Logo-Large.png   # Logo asset
```

## 3D Model Viewer Details

Uses Three.js + `STLLoader`. STEP is not parsed yet (placeholder error message). To add STEP support later you could integrate a WASM OCC/OCCT parser.

Viewer features:
- Orbit controls (rotate, zoom, pan)
- Grid helper & lighting
- Auto-centering model

## Chat / API Contract

Frontend sends (POST JSON):
```json
{ "prompt": "What is NASA?", "thread_id": "<optional previous thread>" }
```

Expected response shape:
```json
{
  "response": "<text or JSON string>",
  "run_status": "completed",
  "agent_id": "asst_...",
  "thread_id": "thread_..."
}
```

If `response` is itself valid JSON (object/array), it is rendered as a formatted code block. Embedded JSON inside text is also detected.

## Production Build & Deploy

```bash
npm run build
npm run preview  # sanity check
```
Deploy `dist/` contents to your static host (Azure Static Web Apps workflow already configured: output folder `dist`). Ensure `VITE_API_BASE` secret is set in repository settings.

## Tailwind / Styling Notes

- All layout now uses Tailwind utility classes (legacy `App.css` removed).
- Custom colors defined in `tailwind.config.js` (`surface`, `surface2`).

## Adding a Different Model

Drop a new `.stl` file into `public/` and update the URL in `Chat.tsx` (`/orion_nofbc.stl`). Rebuild or restart dev server if filename changes.

## Future Enhancements (Ideas)

- STEP parsing via WASM (e.g., `occt-import-js`).
- Streaming agent responses (Server-Sent Events or WebSocket) with incremental rendering.
- Copy & download buttons for JSON blocks.
- Persist chat history / model parameters in `localStorage`.
- Split-view toggle / responsive drawer for the viewer on mobile.
