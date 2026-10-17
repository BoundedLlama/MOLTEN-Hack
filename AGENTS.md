# Shared project context

Read `PROJECT_CONTEXT.md` before planning, implementing, or integrating changes. It preserves the user's final roadmap supplied October 17, 2026 and is the source of truth for project scope, interfaces, roles, and priorities. It supersedes conflicting earlier planning in `SETUP.md`. Later explicit user decisions take precedence.

## Integration commitments

- Build a VR presentation practice room using React, TypeScript, Vite, direct Three.js, and PDF.js. Keep PDFs local to the uploading browser; no backend or paid API is required for the MVP.
- Prioritize a repeatable HTTPS WebXR demo with the actual uploaded PDF and audience, then head-pose feedback, then reliable hand grab/move interaction with a tested controller or UI fallback.
- Use meters and Y-up: presenter near the origin faces negative Z; audience at negative Z faces positive Z; board at positive Z faces negative Z.
- Preserve the roadmap's `PosterFrame`, `OnPosterReady`, `SpatialFigure`, and audience interfaces. Coordinate changes across producers and consumers instead of silently changing contracts.
- A owns XR, integration, reset behavior, deployment, dependencies, and lockfile; B owns PDF rendering and controls; C owns audience, hand interaction in coordination with A, and demo QA.
- Preserve PDF aspect ratio, initially cap canvas edges at 2048 pixels, cancel stale render jobs, and dispose replaced GPU textures.
- Head-pose coaching measures head orientation, not eye gaze. Use configurable angle/time thresholds (approximately 5–8 seconds), reset on return to the audience, and prevent repeated warnings with a cooldown.
- Defer arbitrary chart extraction, realistic audience assets, AI/speech scoring, multiplayer, laptop-to-headset transfer, and backend accounts until the core demo works.

## Evidence and status

The roadmap's status statements describe what was unverified when compiled; they are not proof of current implementation state. Inspect current files and checks before reporting progress. Do not rerun bootstrap over an existing app. Keep desktop/build verification distinct from actual headset, hand-tracking, HTTPS, hardware reservation, and sponsor entitlement verification.
