import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { Countdown } from '../session/Countdown'
import type { PageNavigation, PosterFrame } from '../poster/types'
import { SessionClock, formatTime, type SessionAction } from '../session/SessionClock'
import { classifyHead, summarizeHead, headTimeline, type HeadZone } from '../session/headSummary'
import PresentationSummary from '../session/PresentationSummary'
import SessionControls from '../session/SessionControls'
import { shouldSuspendPage } from './visibility'
import { createSessionPanel } from './sessionPanel'
import VoiceQA from '../components/VoiceQA'
import PageControls from '../components/PageControls'
import { createPosterBoard } from './posterBoard'
import { createConferenceRoom } from './conferenceRoom'
import { createAudience, updateAudience, disposeAudience } from '../audience/audience'

export default function PracticeRoom({ frame, navigation }: {
  frame: PosterFrame | null
  navigation: PageNavigation
}) {
  const [clock] = useState(() => new SessionClock())
  const [countdown] = useState(() => new Countdown())
  const [count, setCount] = useState<number | null>(null)
  const [vrPhase, setVrPhase] = useState<'start' | 'practice'>('start')
  const [launching, setLaunching] = useState(false)
  const launchGeneration = useRef(0)
  const xrActive = useRef(false)
  const xrEntering = useRef(false)
  const enterXR = useRef<() => Promise<void>>(async () => {})
  const exitXR = useRef<() => void>(() => {})
  const navigationRef = useRef(navigation)
  useEffect(() => { navigationRef.current = navigation }, [navigation])
  const hudActions = useRef({ toggle: () => {}, stop: () => {} })
  const cancelCountdown = () => { countdown.cancel(); setCount(null) }
  const cancelRef = useRef(cancelCountdown)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [clockState, setClockState] = useState(clock.state)
  const [summaryDismissed, setSummaryDismissed] = useState(false)
  const summary = useMemo(() => clockState === 'ended' ? summarizeHead(clock.events, clock.elapsedMs) : null, [clockState, clock])
  const timeline = useMemo(() => clockState === 'ended' ? headTimeline(clock.events, clock.elapsedMs) : [], [clockState, clock])
  useEffect(() => { if (clockState === 'ended') exitXR.current() }, [clockState])
  useEffect(() => {
    // Also reflect externally triggered pauses (visibility, device loss, XR exit).
    const timer = window.setInterval(() => { setClockState(clock.state); setElapsedMs(clock.elapsedMs) }, 100)
    return () => window.clearInterval(timer)
  }, [clock])
  const [roomReady, setRoomReady] = useState(false)
  const [audioState, setAudioState] = useState<'off' | 'loading' | 'ready'>('off')
  const [audioUrl, setAudioUrl] = useState('')
  const [sessionError, setSessionError] = useState('')
  const [audioFinalizing, setAudioFinalizing] = useState(false)
  const [, refreshSession] = useState(0)
  const audioResources = useRef<{ stream: MediaStream; recorder: MediaRecorder } | null>(null)
  const alive = useRef(true)
  const readiness = useRef('Upload a PDF before starting.')
  const currentFrame = useRef(frame)
  const [qaEndSignal, setQaEndSignal] = useState(0)
  const act = (action: SessionAction) => {
    if (action === 'end') setQaEndSignal(value => value + 1)
    try {
      if (clock.act(action) && (action === 'start' || action === 'resume')) {
        if (action === 'start') setSummaryDismissed(false)
        clock.record('page', { page: currentFrame.current?.page })
      }
      setClockState(clock.state)
      setSessionError('')
      refreshSession(value => value + 1)
    } catch { setSessionError('Session control failed. Check your microphone and try again.') }
  }
  const actRef = useRef(act)
  useEffect(() => { actRef.current = act })
  useEffect(() => {
    currentFrame.current = frame
    if (frame) clock.record('page', { page: frame.page })
    else clock.act('pause')
  }, [clock, frame])
  const reason = audioFinalizing ? 'Saving audio…' : !roomReady ? 'Preparing room…' : !frame ? 'Upload a PDF before starting.' : navigation.loading ? 'Rendering PDF…' : navigation.error ? 'Resolve the PDF error before starting.' : audioState === 'loading' ? 'Waiting for microphone permission…' : ''
  useEffect(() => { readiness.current = reason; clock.setReady(!reason) }, [clock, reason])
  useEffect(() => {
    alive.current = true
    const suspend = () => { if (shouldSuspendPage(document.hidden, xrActive.current, xrEntering.current)) { cancelRef.current(); clock.act('pause') } }
    document.addEventListener('visibilitychange', suspend)
    return () => {
      alive.current = false
      clock.act('end')
      audioResources.current?.stream.getTracks().forEach(track => track.stop())
      document.removeEventListener('visibilitychange', suspend)
    }
  }, [clock])
  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl) }, [audioUrl])
  const enableAudio = async () => {
    if (clock.state === 'running' || clock.state === 'paused') return
    clock.setReady(false)
    setAudioState('loading')
    let acquiredStream: MediaStream | undefined
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      acquiredStream = stream
      if (!alive.current) { stream.getTracks().forEach(track => track.stop()); return }
      const recorder = new MediaRecorder(stream)
      let chunks: Blob[] = []
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data) }
      recorder.onstop = () => { if (alive.current) { setAudioUrl(URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType }))); setAudioFinalizing(false) } }
      recorder.onerror = () => { clock.act('end'); setSessionError('Audio recording failed. Enable the microphone again.'); clock.setAudio(); setAudioState('off'); stream.getTracks().forEach(track => track.stop()) }
      stream.getTracks().forEach(track => track.addEventListener('ended', () => { clock.act('end'); clock.setAudio(); setAudioState('off') }))
      audioResources.current = { stream, recorder }
      clock.setAudio({
        start() { chunks = []; setAudioUrl(''); recorder.start() },
        pause() { if (recorder.state === 'recording') recorder.pause() },
        resume() { if (recorder.state === 'paused') recorder.resume() },
        stop() { if (recorder.state !== 'inactive') { clock.setReady(false); setAudioFinalizing(true); recorder.stop() } },
      })
      setAudioState('ready')
    } catch { acquiredStream?.getTracks().forEach(track => track.stop()); setAudioState('off'); setSessionError('Microphone unavailable. You can practice without audio.'); }
  }
  const host = useRef<HTMLDivElement>(null)
  const board = useRef<ReturnType<typeof createPosterBoard> | null>(null)
  const [error, setError] = useState('')
  const [stage, setStage] = useState<'welcome' | 'choose'>('welcome')
  const [mode, setMode] = useState<'test' | 'vr' | null>(null)
  const entered = mode !== null
  const [immersive, setImmersive] = useState(false)
  const setTestMode = useRef<(enabled: boolean) => void>(() => {})
  const panel = useRef<HTMLElement>(null)
  const modeButton = useRef<HTMLButtonElement>(null)
  const exitButton = useRef<HTMLButtonElement>(null)
  const moveView = useRef<(view: 'overview' | 'audience' | 'slides') => void>(() => {})
  const leaveRoom = () => {
    launchGeneration.current++
    cancelCountdown()
    setVrPhase('start')
    if (document.fullscreenElement === panel.current) void document.exitFullscreen().catch(() => {})
    clock.act('pause')
    setMode(null)
    setTestMode.current(false)
  }
  const enterRoom = (nextMode: 'test' | 'vr') => {
    cancelCountdown()
    setVrPhase('start')
    setMode(nextMode)
    setTestMode.current(nextMode === 'test')
    if (nextMode === 'test') void panel.current?.requestFullscreen?.().catch(() => {})
  }
  useEffect(() => {
    if (stage === 'choose' && !entered) modeButton.current?.focus()
  }, [stage, entered])

  useEffect(() => {
    if (!entered) return
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    exitButton.current?.focus()
    const leave = () => { launchGeneration.current++; cancelRef.current(); clock.act('pause'); setMode(null); setTestMode.current(false) }
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') leave() }
    const onFullscreen = () => { if (!document.fullscreenElement && !xrActive.current && !xrEntering.current) leave() }
    document.addEventListener('keydown', onKey)
    document.addEventListener('fullscreenchange', onFullscreen)
    return () => {
      document.body.style.overflow = overflow
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('fullscreenchange', onFullscreen)
    }
  }, [entered, clock])

  const stopPractice = () => {
    launchGeneration.current++
    cancelCountdown()
    act('end')
    setVrPhase('start')
    exitXR.current()
  }
  const togglePractice = () => act(clock.state === 'paused' ? 'resume' : 'pause')
  const startPractice = async () => {
    if (reason || launching || xrEntering.current) return
    const generation = ++launchGeneration.current
    setLaunching(true)
    xrEntering.current = true
    try {
      await enterXR.current()
      if (generation !== launchGeneration.current || shouldSuspendPage(document.hidden, xrActive.current, false) || readiness.current) { exitXR.current(); return }
      if (clock.state === 'paused') act('end')
      if (!clock.can('start')) return
      setVrPhase('practice')
      countdown.start()
      setCount(3)
    } catch (error) {
      setSessionError(`Could not enter VR: ${error instanceof Error ? error.message : String(error)}`)
    } finally { xrEntering.current = false; setLaunching(false) }
  }
  useEffect(() => {
    cancelRef.current = () => {
      const wasCounting = countdown.remaining !== null
      countdown.cancel()
      setCount(null)
      if (wasCounting) { setVrPhase('start'); exitXR.current() }
    }
    hudActions.current = { toggle: togglePractice, stop: stopPractice }
  })
  useEffect(() => {
    if (count === null) return
    const timer = window.setInterval(() => {
      if (readiness.current || shouldSuspendPage(document.hidden, xrActive.current, xrEntering.current)) { cancelRef.current(); return }
      const remaining = countdown.remaining
      if (remaining === 0) {
        countdown.cancel()
        setCount(null)
        actRef.current('start')
        if (clock.state !== 'running') setVrPhase('start')
      } else setCount(remaining)
    }, 50)
    return () => window.clearInterval(timer)
  }, [count, countdown, clock])

  useEffect(() => {
    const container = host.current!
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true })
    } catch {
      // Report failure of the external WebGL API during initialization.
      // oxlint-disable-next-line react/set-state-in-effect
      setError('The room needs WebGL. Try a browser with hardware acceleration enabled.')
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.xr.enabled = true
    // Update the tracked camera before positioning view-following content.
    renderer.xr.cameraAutoUpdate = false
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xdce5dd)
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100)
    const presenterPosition = new THREE.Vector3(-2.2, 0, 1.6)
    const audienceTarget = new THREE.Vector3(0, 1.65, -4)
    const slidesTarget = new THREE.Vector3(0, 2, 3)
    // An open stance between audience and board makes either a sideways glance.
    const audienceDirection = audienceTarget.clone().sub(presenterPosition).setY(0).normalize()
    const slidesDirection = slidesTarget.clone().sub(presenterPosition).setY(0).normalize()
    const stanceDirection = audienceDirection.add(slidesDirection).normalize()
    const stanceYaw = Math.atan2(-stanceDirection.x, -stanceDirection.z)
    camera.position.copy(presenterPosition).setY(1.65)
    camera.rotation.set(0, stanceYaw, 0, 'YXZ')
    // The floor-level pivot anchors the presenter; tracked head motion stays natural.
    const presenterPivot = new THREE.Group()
    presenterPivot.name = 'Presenter pivot'
    presenterPivot.position.copy(presenterPosition)
    scene.add(presenterPivot)
    const sessionPanel = createSessionPanel(() => hudActions.current.toggle(), () => hudActions.current.stop(), delta => navigationRef.current.navigate(delta))
    scene.add(sessionPanel.mesh)
    sessionPanel.mesh.visible = false
    const controllerCleanups = [0, 1].map(index => {
      const controller = renderer.xr.getController(index)
      presenterPivot.add(controller)
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -3)]), new THREE.LineBasicMaterial({ color: 0xd7ecba }))
      controller.add(line)
      const select = () => sessionPanel.select(controller)
      controller.addEventListener('select', select)
      return () => { controller.removeEventListener('select', select); line.geometry.dispose(); line.material.dispose() }
    })
    const xrCamera = new THREE.PerspectiveCamera(55, 1, 0.1, 100)
    presenterPivot.add(xrCamera)
    renderer.xr.setReferenceSpaceType('local-floor')
    let needsAnchor = true
    let testMode = false
    const look = new THREE.Euler(0, stanceYaw, 0, 'YXZ')
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.copy(camera.position).add(stanceDirection)
    controls.enabled = false
    controls.maxDistance = 15
    controls.minDistance = 1
    controls.maxPolarAngle = Math.PI / 2
    controls.update()
    let transition: { from: THREE.Vector3; targetFrom: THREE.Vector3; to: THREE.Vector3; target: THREE.Vector3; start: number } | null = null
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const resetPresenterView = (view?: 'audience' | 'slides') => {
      camera.position.copy(presenterPosition).setY(1.65)
      if (view) camera.lookAt(view === 'slides' ? slidesTarget : audienceTarget)
      else camera.rotation.set(0, stanceYaw, 0, 'YXZ')
      look.setFromQuaternion(camera.quaternion, 'YXZ')
    }
    setTestMode.current = (enabled) => {
      testMode = enabled
      transition = null
      controls.enabled = enabled && !renderer.xr.isPresenting
      if (enabled) {
        camera.position.set(4.2, 2.8, -6.7)
        controls.target.set(0, 1.6, 2)
        controls.update()
      } else resetPresenterView()
    }
    let pointer: { id: number; x: number; y: number } | null = null
    const onPointerDown = (event: PointerEvent) => {
      if (testMode || renderer.xr.isPresenting || event.button !== 0) return
      pointer = { id: event.pointerId, x: event.clientX, y: event.clientY }
      renderer.domElement.setPointerCapture(event.pointerId)
    }
    const onPointerMove = (event: PointerEvent) => {
      if (!pointer || pointer.id !== event.pointerId || testMode || renderer.xr.isPresenting) return
      look.y -= (event.clientX - pointer.x) * 0.004
      look.x = THREE.MathUtils.clamp(look.x - (event.clientY - pointer.y) * 0.004, -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01)
      camera.quaternion.setFromEuler(look)
      pointer.x = event.clientX
      pointer.y = event.clientY
    }
    const onPointerEnd = () => { pointer = null }
    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    renderer.domElement.addEventListener('pointermove', onPointerMove)
    renderer.domElement.addEventListener('lostpointercapture', onPointerEnd)
    renderer.domElement.addEventListener('pointerup', onPointerEnd)
    renderer.domElement.addEventListener('pointercancel', onPointerEnd)
    moveView.current = (view) => {
      if (renderer.xr.isPresenting) return
      if (!testMode) {
        resetPresenterView(view === 'overview' ? undefined : view)
        return
      }
      const to = view === 'overview' ? new THREE.Vector3(4.2, 2.8, -6.7) : new THREE.Vector3(0, 1.65, 0)
      const target = view === 'overview' ? new THREE.Vector3(0, 1.6, 2) : new THREE.Vector3(0, 1.55, view === 'slides' ? 3 : -4)
      transition = { from: camera.position.clone(), targetFrom: controls.target.clone(), to, target, start: performance.now() }
    }
    controls.addEventListener('start', () => { transition = null })
    const poster = createPosterBoard()
    board.current = poster
    scene.add(poster.mesh)
    const room = createConferenceRoom()
    scene.add(room.group, createAudience(12))
    renderer.domElement.setAttribute('aria-label', '3D presentation room. In VR mode, drag to look from the presenter position. Enter test mode to orbit, pan and zoom.')
    container.appendChild(renderer.domElement)
    let xrSupported = false
    let disposed = false
    const support = navigator.xr?.isSessionSupported('immersive-vr').then(value => { xrSupported = value }).catch(() => {})
    enterXR.current = async () => {
      await support
      if (disposed) throw new Error('The room has closed. Reopen it and try again.')
      if (renderer.xr.isPresenting) return
      if (!xrSupported) throw new Error('Immersive VR is unavailable. Open the HTTPS site in Quest Browser and allow VR access.')
      const session = await navigator.xr!.requestSession('immersive-vr', { requiredFeatures: ['local-floor'] })
      if (disposed) { await session.end(); return }
      try {
        await renderer.xr.setSession(session)
      } catch (error) {
        await session.end().catch(() => {})
        throw error
      }
    }
    exitXR.current = () => { const session = renderer.xr.getSession(); if (session) void session.end().catch(() => {}) }
    setRoomReady(true)
    const resize = new ResizeObserver(() => {
      const width = container.clientWidth
      const height = container.clientHeight
      if (!width || !height) return
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      if (!renderer.xr.isPresenting) renderer.setSize(width, height)
    })
    resize.observe(container)
    const onSessionStart = () => {
      xrActive.current = true
      needsAnchor = true
      transition = null
      pointer = null
      controls.enabled = false
      setImmersive(true)
      sessionPanel.mesh.visible = true
    }
    const restoreSize = () => {
      xrActive.current = false
      setVrPhase('start')
      cancelRef.current()
      clock.act('pause')
      sessionPanel.mesh.visible = false
      setImmersive(false)
      controls.enabled = testMode
      presenterPivot.position.copy(presenterPosition)
      presenterPivot.quaternion.identity()
      renderer.setSize(container.clientWidth, container.clientHeight)
    }
    renderer.xr.addEventListener('sessionstart', onSessionStart)
    renderer.xr.addEventListener('sessionend', restoreSize)
    let lastHeadSample = -Infinity
    const headOrientation = new THREE.Quaternion()
    const headPosition = new THREE.Vector3()
    const headForward = new THREE.Vector3()
    let lastZone: HeadZone | null = null
    renderer.setAnimationLoop((_time, frame) => {
      if (renderer.xr.isPresenting && needsAnchor && frame) {
        const referenceSpace = renderer.xr.getReferenceSpace()
        const pose = referenceSpace && frame.getViewerPose(referenceSpace)
        if (pose) {
          const { position, orientation } = pose.transform
          const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(
            new THREE.Quaternion(orientation.x, orientation.y, orientation.z, orientation.w),
          )
          // Align the initial heading to the open presenter stance, preserving pitch/roll.
          presenterPivot.rotation.y = Math.atan2(forward.x, -forward.z) + stanceYaw
          presenterPivot.position.set(position.x, 0, position.z)
            .applyQuaternion(presenterPivot.quaternion).negate().add(presenterPosition)
          presenterPivot.updateMatrixWorld(true)
          needsAnchor = false
        }
      }
      if (transition && !renderer.xr.isPresenting) {
        const progress = reducedMotion ? 1 : Math.min((performance.now() - transition.start) / 850, 1)
        const eased = progress * progress * (3 - 2 * progress)
        camera.position.lerpVectors(transition.from, transition.to, eased)
        controls.target.lerpVectors(transition.targetFrom, transition.target, eased)
        controls.update()
        if (progress === 1) transition = null
      }
      if (renderer.xr.isPresenting && countdown.remaining === 0) {
        countdown.cancel()
        setCount(null)
        actRef.current('start')
      }
      sessionPanel.update(countdown.remaining, clock.state === 'paused', countdown.remaining !== null || clock.state === 'running' || clock.state === 'paused', clock.elapsedMs, navigationRef.current)
      if (renderer.xr.isPresenting) {
        presenterPivot.updateMatrixWorld(true)
        renderer.xr.updateCamera(xrCamera)
        const viewer = xrCamera
        viewer.getWorldPosition(sessionPanel.mesh.position)
        viewer.getWorldQuaternion(sessionPanel.mesh.quaternion)
      }
      if (clock.state !== 'running') { lastHeadSample = -Infinity; lastZone = null }
      if (clock.state === 'running' && (clock.elapsedMs < lastHeadSample || clock.elapsedMs - lastHeadSample >= 100)) {
        const head = renderer.xr.isPresenting ? xrCamera : camera
        head.getWorldQuaternion(headOrientation)
        head.getWorldPosition(headPosition)
        headForward.set(0, 0, -1).applyQuaternion(headOrientation)
        const referenceSpace = renderer.xr.getReferenceSpace()
        const tracking = !renderer.xr.isPresenting || (frame && referenceSpace && frame.getViewerPose(referenceSpace) && renderer.xr.getSession()?.visibilityState === 'visible')
        lastZone = tracking ? classifyHead(headPosition, headForward, audienceTarget, poster.mesh.position, lastZone) : null
        clock.record('head', { zone: lastZone, position: headPosition.toArray(), orientation: headOrientation.toArray(), source: renderer.xr.isPresenting ? 'headset' : 'desktop-preview' })
        lastHeadSample = clock.elapsedMs
      }
      updateAudience(performance.now() / 1000, !reducedMotion)
      renderer.render(scene, renderer.xr.isPresenting ? xrCamera : camera)
    })
    return () => {
      disposed = true
      countdown.cancel()
      enterXR.current = async () => {}
      exitXR.current = () => {}
      resize.disconnect()
      renderer.xr.removeEventListener('sessionstart', onSessionStart)
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      renderer.domElement.removeEventListener('pointermove', onPointerMove)
      renderer.domElement.removeEventListener('lostpointercapture', onPointerEnd)
      renderer.domElement.removeEventListener('pointerup', onPointerEnd)
      renderer.domElement.removeEventListener('pointercancel', onPointerEnd)
      setTestMode.current = () => {}
      renderer.xr.removeEventListener('sessionend', restoreSize)
      renderer.setAnimationLoop(null)
      const session = renderer.xr.getSession()
      if (session) void session.end().catch(() => {})
      controllerCleanups.forEach(cleanup => cleanup())
      sessionPanel.dispose()
      controls.dispose()
      poster.dispose()
      board.current = null
      room.dispose()
      disposeAudience()
      moveView.current = () => {}
      renderer.dispose()
      container.replaceChildren()
    }
  }, [clock, countdown])

  useEffect(() => { board.current?.setFrame(frame) }, [frame])

  return <section ref={panel} className={`panel room-panel${entered ? ' room-entered' : ''}`} aria-label="Practice room" data-mode={mode ?? 'lobby'}>
    {!entered && <div className="room-entry" key={stage}>
      {stage === 'welcome'
        ? <button className="primary room-entry-button" onClick={() => setStage('choose')}>
          <svg className="room-entry-art" viewBox="0 0 160 140" fill="none" aria-hidden="true">
            <circle cx="80" cy="70" r="62" fill="#e9f0df" />
            <path d="M22 104 80 80l58 24-58 26z" fill="#d6e3cc" />
            <path d="M40 85V34a5 5 0 0 1 5-5h70a5 5 0 0 1 5 5v51" stroke="#6f8c72" strokeWidth="3" strokeLinecap="round" />
            <rect x="46" y="35" width="68" height="44" rx="4" fill="white" />
            <path d="M57 66V55m13 11V49m13 17V43" stroke="#8eaa78" strokeWidth="6" strokeLinecap="round" />
            <path d="M96 47h8m-8 8h8m-8 8h5" stroke="#d2dfca" strokeWidth="3" strokeLinecap="round" />
            <path d="M80 85v14m-12 4 12-4 12 4" stroke="#6f8c72" strokeWidth="3" strokeLinecap="round" />
            <circle cx="42" cy="87" r="7" fill="#466c56" />
            <path d="M31 109v-7a11 11 0 0 1 22 0v7" fill="#466c56" />
            <circle cx="117" cy="87" r="7" fill="#79956a" />
            <path d="M106 109v-7a11 11 0 0 1 22 0v7" fill="#79956a" />
            <path d="M129 27v10m-5-5h10M26 53v6m-3-3h6" stroke="#91a77e" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="room-entry-copy"><span className="room-entry-eyebrow">YOUR SPACE TO PRACTICE</span><span className="room-entry-title">Enter Practice Room</span><span className="room-entry-description">Find your focus. Face your audience.</span></span>
          <span className="room-entry-arrow" aria-hidden="true">↗</span>
        </button>
        : <div className="room-mode-options" aria-label="Choose a practice mode">
          <button className="primary room-mode-button" ref={modeButton} disabled={!!error} onClick={() => enterRoom('test')}>
            <svg className="room-mode-art" viewBox="0 0 160 140" fill="none" aria-hidden="true">
              <circle cx="80" cy="70" r="60" fill="#e9f0df" />
              <ellipse cx="80" cy="112" rx="52" ry="9" fill="#d6e3cc" />
              <rect x="34" y="32" width="92" height="65" rx="7" fill="white" stroke="#6f8c72" strokeWidth="3" />
              <rect x="41" y="39" width="78" height="49" rx="3" fill="#f2f6ec" />
              <path d="m55 73 25-24 25 24M55 73h50M80 49v24" stroke="#91a77e" strokeWidth="2" strokeLinejoin="round" />
              <path d="M26 98h108l-8 10H34z" fill="white" stroke="#6f8c72" strokeWidth="3" strokeLinejoin="round" />
              <path d="m91 66 5 24 6-8 10-3z" fill="#466c56" stroke="white" strokeWidth="2" strokeLinejoin="round" />
              <path d="M132 24v10m-5-5h10M25 60v6m-3-3h6" stroke="#91a77e" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="room-mode-eyebrow">EXPLORE THE SPACE</span>
            <span className="room-mode-title">Enter Test Mode</span>
            <span className="room-mode-description">Pan, orbit, and find your angle.</span>
            <span className="room-mode-arrow" aria-hidden="true">↗</span>
          </button>
          <button className="primary room-mode-button" disabled={!!error} onClick={() => enterRoom('vr')}>
            <svg className="room-mode-art" viewBox="0 0 160 140" fill="none" aria-hidden="true">
              <circle cx="80" cy="70" r="60" fill="#e9f0df" />
              <ellipse cx="80" cy="112" rx="49" ry="9" fill="#d6e3cc" />
              <path d="M43 66V52c0-28 74-28 74 0v14" stroke="#79956a" strokeWidth="8" />
              <path d="M38 56h84a8 8 0 0 1 8 8v23a13 13 0 0 1-13 13H96l-9-10H73l-9 10H43a13 13 0 0 1-13-13V64a8 8 0 0 1 8-8Z" fill="white" stroke="#6f8c72" strokeWidth="3" strokeLinejoin="round" />
              <rect x="41" y="65" width="78" height="18" rx="9" fill="#d6e3cc" />
              <circle cx="55" cy="74" r="4" fill="#79956a" />
              <circle cx="105" cy="74" r="4" fill="#79956a" />
              <path d="M70 72h20" stroke="white" strokeWidth="3" strokeLinecap="round" />
              <path d="M130 29v10m-5-5h10M26 45v6m-3-3h6" stroke="#91a77e" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="room-mode-eyebrow">TAKE YOUR PLACE</span>
            <span className="room-mode-title">Enter VR Mode</span>
            <span className="room-mode-description">Step up and face your audience.</span>
            <span className="room-mode-arrow" aria-hidden="true">↗</span>
          </button>
        </div>}
    </div>}
    {error && <p className="error" role="alert">{error}</p>}
    <div className="room-content" hidden={!entered}>
      {mode !== 'vr' && <div className="panel-heading">
        <div><h2>Your practice room</h2><p>{immersive ? 'VR mode · Turn your head to look around.' : mode === 'test' ? 'Test mode · Drag to orbit, Shift-drag to pan, scroll to zoom.' : 'VR mode · Drag to look around from your presenter position.'}</p></div>
        <button className="primary" ref={exitButton} disabled={immersive} onClick={leaveRoom}>Change Mode</button>
      </div>}
      <div className="room-viewport" ref={host} />
      {mode !== 'vr' && <>
      <div className="room-views" aria-label="Room viewpoints">
        <button disabled={immersive} onClick={() => moveView.current('audience')}>Face audience</button>
        <button disabled={immersive} onClick={() => moveView.current('slides')}>View slides</button>
        {mode === 'test' && <button disabled={immersive} onClick={() => moveView.current('overview')}>Room overview</button>}
      </div>
      <SessionControls clock={clock} act={act} reason={reason} />
      <div className="session-audio">
        <button disabled={audioState !== 'off' || clock.state === 'running' || clock.state === 'paused'} onClick={() => void enableAudio()}>{audioState === 'ready' ? 'Microphone ready' : audioState === 'loading' ? 'Connecting microphone…' : 'Enable optional audio recording'}</button>
        {audioUrl && <a href={audioUrl} download="practice-audio.webm">Download session audio</a>}
        {sessionError && <p role="alert">{sessionError}</p>}
      </div>
      <PageControls navigation={navigation} label="3D viewer PDF pages" />
      {navigation.error && navigation.pageCount > 0 && <p className="error" role="alert">{navigation.error}</p>}
      <p className="room-status" role="status">{frame
        ? `Board: page ${frame.page} of ${frame.pageCount}`
        : 'Choose a PDF to display it on the board.'}</p>
      </>}
      {mode === 'vr' && !immersive && vrPhase === 'start' && <div className="vr-start-screen">
        <button className="vr-back" onClick={leaveRoom} aria-label="Back to mode selection">←</button>
        <div className="vr-start-card">
          <span className="vr-eyebrow">YOUR MOMENT TO PRACTICE</span>
          <h2>Take a breath.<br />Take the room.</h2>
          <p>Your audience is ready. Begin when you are.</p>
          <button className="vr-start-button" disabled={!!reason || launching} onClick={() => void startPractice()}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 11 7-11 7Z" fill="currentColor" /></svg>
            {launching ? 'Entering…' : 'Start'}
          </button>
          <p className="vr-ready-note" role="status">{sessionError || reason || 'A little space. A little confidence.'}</p>
          {audioUrl && <a href={audioUrl} download="practice-audio.webm">Download session audio</a>}
        </div>
      </div>}
      {mode === 'vr' && vrPhase === 'practice' && !immersive && <>
        <time className="vr-timer" aria-label="Elapsed practice time">{formatTime(count !== null ? 0 : elapsedMs)}</time>
        <div className="vr-icon-controls" aria-label="Practice controls">
          <button disabled={count !== null || (clockState === 'paused' && !!reason)} onClick={togglePractice} aria-label={clockState === 'paused' ? 'Resume practice' : 'Pause practice'} title={clockState === 'paused' ? 'Resume' : 'Pause'}>
            <svg viewBox="0 0 24 24" aria-hidden="true">{clockState === 'paused' ? <path d="m8 5 11 7-11 7Z" fill="currentColor" /> : <><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></>}</svg>
          </button>
          <button onClick={stopPractice} aria-label="Stop practice" title="Stop"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" /></svg></button>
          <button disabled={count !== null || navigation.loading || navigation.page <= 1} onClick={() => navigation.navigate(-1)} aria-label="Previous slide" title="Previous slide"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
          <button disabled={count !== null || navigation.loading || navigation.page >= navigation.pageCount} onClick={() => navigation.navigate(1)} aria-label="Next slide" title="Next slide"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 6 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
        </div>
        {count !== null && <div className="vr-countdown" role="status" aria-label={`Starting in ${count}`}><span key={count}>{count}</span></div>}
        {count === null && clockState === 'paused' && <div className="vr-paused" role="status">Paused</div>}
        {sessionError && <p className="vr-overlay-error" role="alert">{sessionError}</p>}
      </>}

    </div>
    {summary && !summaryDismissed && !immersive && <PresentationSummary summary={summary} timeline={timeline} onClose={() => setSummaryDismissed(true)} />}
    {entered && <VoiceQA immersive={immersive} endSignal={qaEndSignal} />}
  </section>
}
