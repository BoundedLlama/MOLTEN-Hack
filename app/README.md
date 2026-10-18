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

## Live audience voice Q&A (ElevenLabs)

The full-screen room now has an optional bottom-right **Want live questions?**
card in both room modes. Start voice Q&A requests microphone permission only
when clicked; the same handset button ends the call (or cancels connection).
The card reports connecting, listening, agent speaking, and accessible errors.
Leaving the room or pressing practice Stop/End ends the call. Practice Pause
only pauses the practice timer/recording; Q&A remains live until explicitly ended.

### Setup

1. Run `npm ci` in `app`.
2. Copy `.env.example` to `.env.local` and restart Vite. The supplied value,
   `VITE_ELEVENLABS_AGENT_ID=agent_9801m55ye4zdfcqvnh6rcrfz5hvr`, is a public
   agent identifier, **not an API key**. The local env file is ignored by Git.
   Set the same frontend variable in your hosting build environment and rebuild.
3. In ElevenLabs, make the agent public with authentication disabled. Allow the
   local testing and deployed domains in the agent's allowed-domain settings.
   Agent availability, domain settings, and account usage remain to be verified
   by the account owner. No API key is needed or included in this app.
4. If the agent must be private, this frontend-only setup is insufficient: use a
   secure authenticated backend endpoint to obtain a short-lived WebRTC
   conversation token. Never put an ElevenLabs API key in browser code or a
   `VITE_*` variable.

Set these in the ElevenLabs agent dashboard (the app does not modify your agent):

**Prompt:** “You are one curious, supportive audience member at a presentation rehearsal. Listen to the presenter and ask one concise, relevant question at a time. Wait for the presenter’s answer before asking a follow-up. Base questions only on what the presenter says; you cannot see their PDF. If asked a question, answer briefly, then return to your role as an audience member.”

**First message:** “What is the main idea you’d like the audience to remember?”

The official `@elevenlabs/react` SDK uses WebRTC for the conversation.
`VoiceQA.tsx` uses its `ConversationProvider` and `useConversation`; the SDK's
`onModeChange` callback drives `setAudienceSpeaking(mode === 'speaking')`, guarded
against callbacks after ending. Listening, disconnect, error, leaving the room,
and audience disposal/recreation close the mouth. One front-row member has a
smooth mouth animation on the +Z face; other audience idle animations are unchanged.
This is a speaking indicator, not phoneme-level lip synchronization.

Only microphone audio goes to ElevenLabs. No PDF, page image, extracted text, or
local recording is passed to the SDK. The agent hears the presenter, **not the
PDF**. Local PDF rendering and the optional local recording workflow remain separate.
See the [official React SDK documentation](https://elevenlabs.io/docs/eleven-agents/libraries/react).

### Meta Quest 3S and manual checks

Open the deployed **trusted HTTPS** site in Quest Browser on the headset itself.
Start Q&A in the room before pressing the VR Start button and grant microphone
permission. The SDK captures the browser's default audio input, which should be
the Quest microphone when running on the headset; a laptop call uses the laptop's
microphone and is not transferred to Quest. No device-specific API is required.
Check headset/browser microphone permissions and headset audio volume if silent.

The HTML card is not an immersive WebXR control. An established call is kept
mounted during VR, and the talking audience member stays in the scene. Exit VR
to use the card or use the existing in-world Stop button to end practice and Q&A.
Exiting XR alone leaves the call available in the card. Microphone/audio continuity
through XR entry and exit requires actual Quest 3S testing; it is not proven by a
successful desktop build.

Verify on localhost and the allowed HTTPS deployment:
- Start, allow/deny microphone access, retry, listen, speak, interrupt, and end.
- Check connection/domain failures show errors and close the mouth.
- Confirm only the nearest front-row character's mouth moves during agent speech,
  faces the presenter, and closes on listening/end/disconnection.
- Enter/exit VR during a call; test headset mic and speaker audio, Pause behavior,
  in-world Stop, leaving the room, repeat starts, and network loss.
- If also using local recording, test simultaneous recording/Q&A on the headset.

Automated checks: `node --test src/audience/audience.test.mjs src/session/*.test.mjs src/xr/*.test.mjs`,
`npm run build` (includes TypeScript), and `npm run lint`.
