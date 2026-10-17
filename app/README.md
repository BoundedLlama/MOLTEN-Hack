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
