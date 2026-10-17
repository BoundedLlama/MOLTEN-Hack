MOLTEN Spatial Hackathon: Complete Project Context
Event date: Saturday, October 17, 2026
Event hours: 9:00 AM–9:00 PM
Location: 231 S La Brea Ave, Inglewood, California
Project status: Planning complete; implementation and hardware access remain unverified.
1. Event Overview
MOLTEN is a one-day spatial hackathon focused on building tools and experiences for spatial computing and creation. Technologies discussed include Meta Quest, Apple Vision Pro, smart glasses, WebXR, spatial mapping, computer vision, and motion capture.
The event's spatial-creation themes include:
Worldbuild: Create or shape spatial environments and objects.
Navigate: Explore and move through spatial experiences.
Capture: Capture information from the physical or digital world.
Inhabit: Occupy and interact with virtual environments.
Open: Explore other spatial creation tools and workflows.
The central design principle is that a project should use spatial computing for a meaningful reason. Simply putting a conventional website or desktop application on a virtual screen is less compelling than enabling an interaction that benefits from 3D space and body input.
Judging rubric
Each judge scores five criteria from 1 to 5. All five count equally, for a total out of 25. Scores from different judges are averaged. Ties go to the higher score on "It works in space".
Copy rubric as text
It works in space
A spatial output runs for real: Vision Pro, Quest, Spectacles, WebXR or phone AR. Anything mocked or hard-coded is said out loud.
1
An idea, a mockup or a flat screen recording of a concept
3
The core interaction works, with help or retries
5
Works live, repeatably, in the headset or on the phone
Made with the body
At least one body input beyond keyboard and mouse: hands, gaze, voice, full-body motion, touch. Two or more earn bonus points.
1
The body input is decorative
3
One body input does real work
5
Two or more body inputs, and they feel natural together
A new way to create
The project is a tool for making spatial things, in the spirit of its track: worldbuild, navigate, capture, inhabit or open.
1
A familiar 2D tool moved into a headset
3
A fresh twist on a known spatial tool
5
A way of making we have not seen before
Worth making with again
A creator would want it after the event, because it is useful, delightful or both.
1
No clear reason to come back
3
We can see who it is for
5
Hand it over, we want another go
It clicks fast
One sentence says what it does. The video shows it working within the first seconds. The team is honest about what is real.
1
We could not explain it back
3
We get it after the full demo
5
Clear in one sentence, shown in seconds

Working judging rubric
Each category is scored from 1 to 5, for a maximum of 25 points.
It works in space: The experience runs on a real headset or phone AR/WebXR platform. A repeatable live demo is stronger than a mockup.
Made with the body: The experience uses body input beyond keyboard and mouse. Multiple meaningful inputs can strengthen the score.
A new way to create: The experience enables a genuinely spatial way to create, navigate, capture, inhabit, or open something.
Worth making with again: The experience is useful, enjoyable, and worth returning to.
It clicks fast: Judges understand the concept within the first few seconds of the demo.
A prior rough evaluation of the original VR presentation-room concept was 17/25. Its strengths were clarity and usefulness; its weakness was that a PDF on a virtual board could feel like a conventional presentation application moved into VR. The two body inputs described below are intended to make the experience more spatial and distinctive.
2. Ideas Explored
Several concepts were discussed before settling on the current project.
Spatial Tetris
A Tetris-style game in which players use their hands to place and rotate blocks in 3D space, building structures around themselves. This idea makes hand interaction central to the experience.
Room Scanning and Redesign
Scan a room and turn it into a 3D world where users can experiment with decorations, furniture, and lighting before making real changes.
Visual GPT in VR
Use a GPT-style assistant in VR whose answers can include images or visual objects. The concern was that simply showing AI answers in VR does not justify the headset. The spatial interaction needs to add something that is difficult or less natural to do on a PC.
VR GeoGuessr
A geography-guessing experience built around spatial exploration rather than a flat map or conventional image-based interface.
Other brainstormed ideas
Fintech
Workflow automation
Body-weight exercise form correction
Digital twins
These were exploratory ideas rather than implementation commitments.
3. Selected Project: VR Presentation Practice Room
One-sentence pitch
A VR presentation practice tool that lets a presenter upload a PDF, face a simulated audience, and receive feedback when they spend too long looking at their slides.
Core goal
Upload a PDF, enter a virtual presentation room, face a simulated audience, and display the selected PDF page on a board behind the presenter.
The experience should feel like practicing a real presentation rather than simply reading a PDF in a headset.
Why this project
It has a clear target audience: students, researchers, and people practicing pitches or presentations.
It is easy to demonstrate quickly.
A simulated audience makes the environment feel more like a presentation rehearsal.
Head-pose feedback gives the app a practical coaching purpose.
Hand tracking can let the presenter interact with visual material spatially.
Current body inputs
Input 1: Hand tracking
Grab and move a separate chart, figure, or visual panel in 3D space. Resizing is optional if it can be implemented reliably.
Input 2: Head-pose tracking
Detect when the presenter remains oriented toward the poster instead of the audience for too long, then show a subtle reminder.
These are the two planned body inputs. Physical walking around a chart is a possible enhancement, but it is not one of the two primary features in the current roadmap.
4. Body Input 1: Hand Tracking
Intended behavior
The presenter can grab a visual panel, move it to a new position, and release it. The panel could be a chart or figure taken from the PDF.
This creates a spatial interaction that goes beyond displaying a normal slide deck on a virtual screen.
Implementation strategy
Start with one simple, grabbable plane in Three.js.
Check WebXR hand-input support on the actual headset and browser.
Use a reliably detected gesture to grab and release the plane.
Update the object's position using the tracked hand pose.
Add resizing only if the basic interaction works well.
Provide a controller or simple UI fallback if hand tracking is unavailable or unreliable.
Automatic chart extraction from arbitrary PDFs is not part of the core MVP. If extracting a chart proves difficult, use a manually selected crop or a predefined demo image, and be transparent about the limitation.
5. Body Input 2: Head-Pose Presentation Feedback
Intended behavior
The app detects when the presenter spends too much time facing the poster instead of the audience.
Example interaction:
The presenter enters the room and faces the audience.
The presenter turns toward the poster to read or explain it.
If they remain oriented toward the poster for approximately 5–8 seconds, a subtle reminder appears: “Try facing your audience.”
When they turn back, the reminder disappears and the timer resets.
Technical approach
Use the headset's position and orientation through WebXR.
Establish the intended audience-facing direction when the presenter enters or resets the room.
Compare the horizontal headset-forward direction with the direction toward the poster.
Start a timer when the presenter appears to face the poster.
Display a reminder after a configurable angular and time threshold.
Dismiss the reminder when the presenter turns back.
Add a cooldown to prevent repeated warnings during a single prolonged glance.
Important limitation
This detects head orientation, not eye gaze. The system cannot reliably tell whether someone is reading the poster with their eyes while keeping their head facing forward. The feature should be presented as a practice cue rather than an objective measure of presentation quality.
6. Hardware and WebXR
Target hardware
The team plans to use a reserved Meta Quest 3S or Quest 3, subject to confirmation from the organizers.
Both devices support 6DoF headset tracking, including head rotation and physical movement. WebXR and Three.js can access headset pose data during an immersive session.
The project does not need to implement head tracking from scratch. It does need to verify that immersive WebXR works reliably in the actual headset browser.
Hardware limitations and verification
Dedicated eye tracking should not be assumed.
Hand tracking is supported by the hardware, but its availability and reliability depend on the browser, WebXR session configuration, and implementation.
The headset loan or reservation has not yet been confirmed.
Actual headset testing has not yet been completed.
HTTPS requirement
Immersive WebXR generally requires a secure context.
npm run dev -- --host 0.0.0.0 exposes the development server to other devices, but it does not provide trusted HTTPS. Opening http://LAPTOP-IP:5173 on the headset is therefore not a reliable path to immersive WebXR.
Deploy the built app to an HTTPS static host available to the team, or use an already trusted HTTPS development tunnel.
Test the following on the actual headset:
navigator.xr?.isSessionSupported('immersive-vr')
Then test a user-initiated Enter VR button.
Three.js VR setup
Use the Three.js VRButton, set renderer.xr.enabled = true, and render with renderer.setAnimationLoop(...). Keep a desktop preview available for development and debugging.
7. Technical Stack
React
TypeScript
Vite
Three.js
PDF.js (pdfjs-dist)
@types/three
Git and GitHub
Use direct Three.js for 3D rendering and WebXR. Keep dependencies minimal during the one-day build.
Local PDF handling
PDF files remain local in the browser for phase one.
The presenter uploads the PDF through the headset browser before entering VR. Uploading a file on a laptop does not transfer it to the headset.
A laptop companion upload feature would require shared storage or a session code and is deferred.
The core MVP does not require an API key, backend, database, or paid service.
8. Bootstrap Instructions
The integration owner runs these commands once from the repository root after Node.js and npm are available:
npm create vite@latest app -- --template react-ts --no-interactive
cd app
npm install
npm install three pdfjs-dist
npm install -D @types/three
npm run dev -- --host 0.0.0.0
npm run build
Commit the generated app/package-lock.json.
The integration owner manages dependencies and lockfile changes. Teammates clone the shared repository, enter app, run npm ci, and then run npm run dev.
For desktop testing, open http://localhost:5173.
Runtime installation
Install Node.js 24 LTS from https://nodejs.org/en/download.
Verify:
node --version
npm --version
git --version
The previously recorded setup status was that Git was available, but Node and npm were not found on the terminal's PATH. Restart the terminal after installing Node.js.
9. PDF Rendering
Use PDF.js to load the selected file and render a page to an HTML canvas.
For Vite, configure the worker as follows:
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
Read the selected file as bytes and call getDocument({ data }). Render the selected page to a canvas.
Initial rendering decisions:
Cap the longest canvas edge at 2048 pixels.
Preserve the PDF page's aspect ratio.
Cancel stale rendering jobs so an earlier page cannot overwrite the most recently selected page.
Dispose of old Three.js GPU textures when the board image is replaced.
Adjust rendering resolution after checking readability and performance on the headset.
10. World Layout
Use meters and Y-up coordinates.
Presenter: starts near (0, 0, 0), facing negative Z.
Audience: sits at negative Z, facing positive Z toward the presenter.
Poster board: sits at positive Z behind the presenter, with its visible face toward negative Z.
Reset behavior: owned by the integration owner.
The selected PDF page should appear behind the presenter, facing the audience. The room and its contents should remain spatially consistent as the presenter moves.
11. Agreed Interfaces
PDF page interface
B renders the selected page into a canvas and notifies A when rendering finishes:
type PosterFrame = {
  canvas: HTMLCanvasElement;
  aspectRatio: number;
  page: number; // 1-based
  pageCount: number;
};

type OnPosterReady = (frame: PosterFrame) => void;
A creates a Three.js CanvasTexture and updates the board when a new frame is ready.
Optional spatial figure interface
If a separate chart or figure is implemented, expose it as:
type SpatialFigure = {
  canvas: HTMLCanvasElement;
  aspectRatio: number;
  label?: string;
};
A converts this canvas to a Three.js texture and places it on a movable plane.
Audience interface
C creates the audience group, and A adds it to the scene:
createAudience(count: number): THREE.Group
updateAudience(elapsedSeconds: number): void
disposeAudience(): void
Start with 12 simple seated geometric figures. Replace them with a licensed lightweight GLB only after the complete flow works.
12. Three-Person Work Split
Person A: XR and integration
Files: app/src/xr/, app/src/App.tsx, deployment configuration.
Responsibilities:
Scaffold and integrate the application.
Build the room, floor, lighting, and poster board.
Implement headset entry and exit.
Maintain the desktop preview.
Implement head-pose feedback.
Integrate the PDF canvas and audience group.
Own reset behavior, final merge, dependency changes, and lockfile.
First deliverable: a working room with a correctly positioned board and a desktop preview.
Completion criteria: VR enters and exits reliably, the board is behind the presenter, and head-pose feedback responds to the presenter's direction.
Person B: PDF and controls
Files: app/src/poster/ and upload/page-selection components.
Responsibilities:
Implement PDF file selection.
Load and render PDFs using PDF.js.
Provide page navigation and preview.
Handle portrait and landscape pages.
Handle file replacement and errors.
Cancel stale render jobs.
Supply the PosterFrame interface.
First deliverable: a PDF page rendered to a canvas and working independently in the desktop browser.
Completion criteria: portrait, landscape, and multipage PDFs work, and changing the selected page updates the board.
Person C: Audience and interaction QA
Files: app/src/audience/, hand-interaction module, sample PDFs, and demo documentation.
Responsibilities:
Build 12 seated audience figures.
Ensure they face the presenter.
Add simple idle motion if time permits.
Implement basic hand-based manipulation of a spatial panel in coordination with A.
Test headset performance and repeatability.
Prepare sample PDFs and a short demo sequence.
First deliverable: a lightweight audience group that faces the presenter.
Completion criteria: the audience runs smoothly, hand interaction works or has a tested fallback, and the demo can be repeated reliably.
Collaboration
Use separate branches:
codex/xr
codex/poster
codex/audience
Agree on interfaces before parallel implementation. Commit small working changes and merge early.
Person A owns dependency and lockfile changes after bootstrap. B and C request any additional packages through A.
13. One-Day Schedule
Time from start
Goal
0–30 minutes
Verify runtime, create shared repository, confirm headset access and HTTPS, agree on interfaces
30–90 minutes
A builds the room and XR entry; B builds PDF rendering; C builds the audience
90–120 minutes
Integrate the uploaded PDF, board, audience, and immersive VR
Hours 2–3
Add page navigation, PDF replacement, reset, upload errors, and stable headset behavior
Hours 3–4
Add head-pose feedback and test warning timing
Hours 4–6
Add hand grab/move interaction and test fallback controls
Remaining time
Improve performance, readability, visuals, and demo reliability

If VR entry is blocked at the two-hour gate, preserve the desktop preview while A resolves HTTPS or headset access.
If character assets are slow or heavy, keep geometric figures.
14. Testing Strategy
Test the supplied sample poster and an independently uploaded PDF.
Include:
Portrait PDFs
Landscape PDFs
Multipage PDFs
Malformed PDFs
Password-protected PDFs
Check that replacing a file updates the board, page navigation works, and exiting and re-entering VR works.
For hand tracking, test grabbing, moving, and releasing a spatial panel. Use a controller or UI fallback if necessary.
For head-pose feedback, test brief glances, sustained poster-facing, returning to the audience, and warning cooldown behavior.
Confirm that text is legible and the scene remains responsive on the actual headset.
15. Scope Guardrails
Do not let these features block the MVP:
Automatic extraction of arbitrary charts from PDFs
Realistic animated audience models
AI-generated audience questions or speech
Speech analysis or advanced presentation scoring
Multiplayer
Laptop-to-headset file transfer
Backend accounts or databases
Advanced gestures or complex object manipulation
The core demo should work before any stretch feature is attempted.
Potential future AI feature
A simulated audience member could ask a question using a voice service such as ElevenLabs. AssemblyAI could be considered for later speech analysis. Neither service is required for the current MVP.
Roboflow may be relevant for future computer-vision features. It is not required for the planned WebXR head-pose approach.
Never put provider secrets in browser-exposed VITE_* environment variables. Future provider API calls should use a server-side component.
16. Event Resources
The event resource text previously discussed listed tools or credits such as ElevenLabs, AssemblyAI, Kaedim, Roboflow, and others.
However, the event resource portal was not successfully verified. Availability, credits, API access, hardware inventory, and license terms must be confirmed with the accepted participant email at:
https://moltenhack.com/#resources
Hosting access was also not verified as an event benefit.
17. References
MOLTEN event resources: https://moltenhack.com/#resources
Vite guide: https://vite.dev/guide/
Node.js download: https://nodejs.org/en/download
Three.js WebXR basics: https://threejs.org/manual/pages/webxr-basics.html
PDF.js examples: https://mozilla.github.io/pdf.js/examples/
Meta WebXR overview: https://developers.meta.com/vr/documentation/web/webxr-overview/
18. Current Status and Critical Risks
At the time this context was compiled:
The project concept, stack, interfaces, team roles, and roadmap have been defined.
Application scaffolding has not been verified as complete.
Dependency installation and production build have not been verified.
Deployment has not been completed or tested.
Quest 3S/Quest 3 reservation and browser access have not been confirmed.
Immersive WebXR support on the actual headset has not been tested.
Event hosting and sponsor API entitlements have not been verified.
Head-pose feedback and hand tracking are planned, not implemented.
Critical path
Confirm headset access and a working HTTPS WebXR route.
Build a reliable room with the actual uploaded PDF on the board and an audience.
Add head-pose feedback.
Add one reliable hand interaction.
Rehearse the demo repeatedly.
Do not sacrifice a repeatable live demo for optional AI, advanced chart extraction, or realistic character assets.

