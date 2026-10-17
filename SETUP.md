# MOLTEN: team environment and first demo

> Historical setup notes. The final roadmap in [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) supersedes conflicting scope, schedule, and ownership details below. Verification statements here reflect the original setup session, not current implementation status. Future work should read [AGENTS.md](AGENTS.md) first.

Goal: upload a PDF, enter a virtual presentation room, face a simulated audience, and display the selected PDF page on a board behind the presenter.

## Decisions

- Target a reserved Meta Quest 3 using its browser and WebXR. Confirm the loan with organizers; access is not yet verified.
- Use React + TypeScript + Vite, with direct Three.js and PDF.js (`pdfjs-dist`).
- Start with 12 simple seated audience figures. Replace with a licensed lightweight GLB only after the complete flow works.
- Keep files local in the browser for phase one. No API key, server, database, or paid service is required.
- Upload on the headset browser before entering VR. Uploading on a laptop does NOT transfer the file to the headset. A companion upload flow requires shared storage and a session code and is a later task.

## First 30 minutes: everyone

1. Install Node.js 24 LTS from https://nodejs.org/en/download and restart the terminal. npm is included. If nvm is already installed, use `nvm install` then `nvm use` in this directory.
2. Use your existing code editor, Git, and Chrome or Edge for desktop debugging.
3. Verify `node --version`, `npm --version`, and `git --version`.
4. Designate one person as integration owner and create one shared GitHub repository. The local repository currently has no remote or commits. Invite both teammates.
5. Reserve a Quest and confirm its browser can open an HTTPS demo and enter immersive VR before spending time on art.

## Bootstrap: integration owner runs once

Run from the repository root after Node/npm are available. The app subfolder avoids conflicts with these setup files.

```sh
npm create vite@latest app -- --template react-ts --no-interactive
cd app
npm install
npm install three pdfjs-dist
npm install -D @types/three
npm run dev -- --host 0.0.0.0
npm run build
```

Commit the generated `app/package-lock.json`. Agree on the resolved dependencies; teammates use `npm ci`, not independent scaffolds or upgrades.

After the owner shares the repository URL, teammates clone it, enter `app`, run `npm ci`, then `npm run dev`. On desktop, open http://localhost:5173.

## Headset access: first integration gate

Deploy `app/dist` to an HTTPS static host available to the team; set build command `npm run build`, project root `app`, and output folder `dist`. Hosting access is not an event benefit we have verified. An already available trusted HTTPS development tunnel is another option.

Opening `http://LAPTOP-IP:5173` on Quest is not sufficient for immersive WebXR: the remote device requires a secure context. `--host` only exposes the server; it does not add trusted HTTPS. Test `navigator.xr?.isSessionSupported('immersive-vr')` on the actual headset, then test the user-initiated Enter VR button.

Use Three.js `VRButton`, `renderer.xr.enabled = true`, and `renderer.setAnimationLoop(...)`. Maintain a desktop preview for all teammates.

## Three parallel owners

| Member | Owned files | First deliverable | Completion check |
|---|---|---|---|
| A: XR and integration | `app/src/xr/`, `app/src/App.tsx`, deployment config | Enter VR, floor, lighting, presenter origin, room, poster board | Headset enters/exits reliably; poster is behind presenter; desktop preview works |
| B: PDF and controls | `app/src/poster/`, upload/page-selection components | PDF file to canvas, preview, page selection, error UI | Portrait, landscape and multipage PDFs work; replacing a file updates the board |
| C: Audience and demo QA | `app/src/audience/`, `app/public/models/`, demo checklist | Seated audience, simple idle motion, audience count control | Figures face presenter; small crowd performs smoothly on Quest; complete demo rehearsed |

A owns dependency and lockfile edits after bootstrap. B and C request additional packages through A. Each member works on their own `codex/xr`, `codex/poster`, or `codex/audience` branch. Merge small working changes at each gate.

## Agree on these interfaces before coding

```ts
// B renders the PDF; A owns the Three.js texture and board.
type PosterFrame = {
  canvas: HTMLCanvasElement;
  aspectRatio: number;
  page: number;      // 1-based
  pageCount: number;
};
// B notifies A whenever a selected page finishes rendering.
type OnPosterReady = (frame: PosterFrame) => void;

// C creates a group; A adds it to the scene.
// createAudience(count: number): THREE.Group
// updateAudience(elapsedSeconds: number): void
// disposeAudience(): void
```

World convention: meters, Y up; presenter starts near `(0, 0, 0)` looking toward negative Z. Audience sits at negative Z facing positive Z. Board sits at positive Z behind presenter, with its visible face toward negative Z. A owns reset-position behavior.

For PDF.js in Vite, import the worker as a bundled URL:

```ts
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
```

Read selected files as bytes, load with `getDocument({ data })`, and render the selected page onto a canvas. Initially cap the longest canvas edge at 2048 pixels; test legibility on Quest and adjust. Preserve aspect ratio. A creates a `CanvasTexture`, updates/replaces it when needed, and disposes old GPU textures. B cancels stale renders so an earlier page cannot overwrite a newer selection.

## Hackathon schedule, relative to starting

| Time | Gate |
|---|---|
| 0–30 min | Shared runtime, repository, hardware reservation, interfaces agreed |
| 30–90 min | A: headset room; B: PDF canvas; C: audience group, all independently visible |
| 90–120 min | Merge: actual uploaded PDF behind presenter and audience visible in headset |
| Hours 2–4 | File replacement, page navigation, reset, crowd controls, upload errors |
| Hours 4–6 | Headset performance, readable board, reliable repeat demo |
| Remaining time | Visual polish; optional voice questions only after core acceptance passes |

If VR entry is blocked at 90 minutes, preserve the desktop demo while A resolves HTTPS/headset access. If character assets are slow or heavy, keep geometric figures. Test a supplied sample poster plus an independently uploaded poster; include portrait, landscape, multipage, malformed, and password-protected files. Check exit and re-entry.

## Event resources: claim versus use

The following entitlements come from the event resource text previously supplied by the team. The live portal was inaccessible during this setup review; claims, inventory, and API access still need confirmation using the accepted participant email at https://moltenhack.com/#resources.

| Resource | Action |
|---|---|
| Quest hardware + Meta docs | Reserve hardware now; use WebXR browser path for first demo |
| Open-web Three.js/WebXR | Core scene and immersive rendering; public tooling, no sponsor claim |
| AssemblyAI: listed $50 credit per participant | Claim now; use in speech-analysis phase after MVP |
| ElevenLabs: listed one month Creator | Claim now; verify API entitlement before optional spoken questions |
| Miro: license details listed pending | Optional coordination; a shared checklist is sufficient |
| Kaedim: listed API access and credits | Optional audience asset experiment; do not make it a dependency |
| Rokoko, DataFeel, Auki posemesh | Defer until a feature actually requires motion capture, haptics, or shared physical coordinates |
| Houdini, Marmoset, Scaniverse, Volinga, Roboflow, Depth Anything | Defer for this room + audience + PDF scope |

Future speech analysis needs a server-side API for provider keys. Never place a secret in a `VITE_*` environment variable: those values are exposed to the browser. Supabase and hosting were architecture suggestions, not confirmed hackathon benefits.

## References

- Vite setup and runtime requirements: https://vite.dev/guide/
- Node installer: https://nodejs.org/en/download
- Three.js VR and secure-context guidance: https://threejs.org/manual/pages/webxr-basics.html
- PDF.js rendering examples: https://mozilla.github.io/pdf.js/examples/

## Current verification

Setup files prepared. Application scaffolding, dependency installation, build, deployment, and headset testing have not run. Node and npm were not found on this terminal's PATH; Git is available.
