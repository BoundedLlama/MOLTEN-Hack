# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## PDF board integration

`PdfUpload` publishes the unchanged `PosterFrame` contract to `App`, which passes
it to `PracticeRoom`. The room creates an sRGB `CanvasTexture`, fits the board
within 3.2 × 2.4 metres while preserving page aspect ratio, and disposes the old
texture on replacement or removal. `onPosterClear` is a separate optional event
for removal/file replacement; it does not change `OnPosterReady`.

Run `node --test src/xr/posterBoard.test.mjs` for board sizing and resource cleanup
checks. Run `npm run build` and `npm run lint` for static checks.

Manual verification: choose a multipage PDF, check the 3D board and page label,
switch between portrait and landscape pages, replace the file, then remove it.
The board should match the last successfully rendered page and clear on removal.
PDF processing stays in the selecting browser.

The desktop preview uses orbit controls. On a compatible headset, open a trusted
HTTPS URL and use Enter VR. The presenter starts at the origin facing -Z; the
board is at +Z facing -Z. Turn around to see it. Exit VR to use page controls.
Headset entry/exit, HTTPS deployment, and device-specific behavior require actual
hardware verification. Audience and hand interaction are not yet included here.

### Practice session controls

Upload a PDF and enter either room mode. Start requires a rendered page, a
working room, and no pending PDF render/error or microphone request. Audio is
optional: enable it before Start to record locally. Desktop controls and VR controls share one `SessionClock`. VR mode opens a
fullscreen Start screen. Start enters immersive VR on supported browsers (or the
fullscreen presenter preview otherwise), then shows translucent white 3, 2, 1
numbers before starting measurements. The full control panel is hidden in VR;
round pause/resume and stop icons float at the top left. In a headset, the compact
icons and countdown follow the viewer; select icons with either controller ray.
Stop returns to the Start screen. Headset testing is still required.

`SessionClock.elapsedMs` and event timestamps use active milliseconds since Start.
Pause freezes this clock, pauses MediaRecorder, and rejects measurement events.
Resume records the currently displayed page; changes while paused do not accrue
page duration. End freezes the result; another Start clears the timeline. Audio
must finish saving before another Start. Downloads remain local. Leaving the
room, exiting XR, hiding the tab, or removing the PDF pauses a running session.
Head orientation is sampled at 10 Hz during active practice; desktop samples are
explicitly labeled `desktop-preview`, not headset measurements or eye gaze.

Integration: producers use `clock.record(type, data)` and consumers read
`clock.events`. Audio adapters implement start/pause/resume/stop and must be
attached before Start. Do not use wall-clock timestamps or MediaRecorder chunk
arrival times for practice measurements. The XR animation timestamp remains for
visual animation only. No speech analysis or head-pose scoring is implemented.

Verification: `npm run build`, `npm run lint`, and
`node --test src/session/*.test.mjs src/xr/posterBoard.test.mjs`.
On a headset over HTTPS, verify ray selection, pause/resume during speech,
recording playback, hidden-tab/XR-exit pause, PDF removal, and restart.
