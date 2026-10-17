import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { VRButton } from 'three/addons/webxr/VRButton.js'
import type { PageNavigation, PosterFrame } from '../poster/types'
import PageControls from '../components/PageControls'
import { createPosterBoard } from './posterBoard'
import { createConferenceRoom } from './conferenceRoom'
import { createAudience, updateAudience, disposeAudience } from '../audience/audience'

export default function PracticeRoom({ frame, navigation }: {
  frame: PosterFrame | null
  navigation: PageNavigation
}) {
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
    if (document.fullscreenElement === panel.current) void document.exitFullscreen().catch(() => {})
    setMode(null)
    setTestMode.current(false)
  }
  const enterRoom = (nextMode: 'test' | 'vr') => {
    setMode(nextMode)
    setTestMode.current(nextMode === 'test')
    void panel.current?.requestFullscreen?.().catch(() => {})
  }
  useEffect(() => {
    if (stage === 'choose' && !entered) modeButton.current?.focus()
  }, [stage, entered])

  useEffect(() => {
    if (!entered) return
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    exitButton.current?.focus()
    const leave = () => { setMode(null); setTestMode.current(false) }
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') leave() }
    const onFullscreen = () => { if (!document.fullscreenElement) leave() }
    document.addEventListener('keydown', onKey)
    document.addEventListener('fullscreenchange', onFullscreen)
    return () => {
      document.body.style.overflow = overflow
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('fullscreenchange', onFullscreen)
    }
  }, [entered])

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
    const vrButton = VRButton.createButton(renderer)
    container.appendChild(vrButton)
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
      needsAnchor = true
      transition = null
      pointer = null
      controls.enabled = false
      setImmersive(true)
    }
    const restoreSize = () => {
      setImmersive(false)
      controls.enabled = testMode
      presenterPivot.position.copy(presenterPosition)
      presenterPivot.quaternion.identity()
      renderer.setSize(container.clientWidth, container.clientHeight)
    }
    renderer.xr.addEventListener('sessionstart', onSessionStart)
    renderer.xr.addEventListener('sessionend', restoreSize)
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
      if (!reducedMotion) updateAudience(performance.now() / 1000)
      renderer.render(scene, renderer.xr.isPresenting ? xrCamera : camera)
    })
    return () => {
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
      controls.dispose()
      poster.dispose()
      board.current = null
      room.dispose()
      disposeAudience()
      moveView.current = () => {}
      renderer.dispose()
      container.replaceChildren()
    }
  }, [])

  useEffect(() => { board.current?.setFrame(frame) }, [frame])

  return <section ref={panel} className={`panel room-panel${entered ? ' room-entered' : ''}`} aria-label="Practice room" data-mode={mode ?? 'lobby'}>
    {!entered && <div className="room-entry" key={stage}>
      {stage === 'welcome'
        ? <button className="primary room-entry-button" onClick={() => setStage('choose')}>Enter Practice Room <span aria-hidden="true">↗</span></button>
        : <div className="room-mode-options" aria-label="Choose a practice mode">
          <button className="primary room-mode-button" ref={modeButton} disabled={!!error} onClick={() => enterRoom('test')}>Enter Test Mode</button>
          <button className="primary room-mode-button" disabled={!!error} onClick={() => enterRoom('vr')}>Enter VR Mode</button>
        </div>}
    </div>}
    {error && <p className="error" role="alert">{error}</p>}
    <div className="room-content" hidden={!entered}>
      <div className="panel-heading">
        <div><h2>Your practice room</h2><p>{immersive ? 'VR mode · Turn your head to look around.' : mode === 'test' ? 'Test mode · Drag to orbit, Shift-drag to pan, scroll to zoom.' : 'VR mode · Drag to look around from your presenter position.'}</p></div>
        <button className="primary" ref={exitButton} disabled={immersive} onClick={leaveRoom}>Change Mode</button>
      </div>
      <div className="room-viewport" ref={host} />
      <div className="room-views" aria-label="Room viewpoints">
        <button disabled={immersive} onClick={() => moveView.current('audience')}>Face audience</button>
        <button disabled={immersive} onClick={() => moveView.current('slides')}>View slides</button>
        {mode === 'test' && <button disabled={immersive} onClick={() => moveView.current('overview')}>Room overview</button>}
      </div>
      <PageControls navigation={navigation} label="3D viewer PDF pages" />
      {navigation.error && navigation.pageCount > 0 && <p className="error" role="alert">{navigation.error}</p>}
      <p className="room-status" role="status">{frame
        ? `Board: page ${frame.page} of ${frame.pageCount}`
        : 'Choose a PDF to display it on the board.'}</p>
      {mode === 'vr' && <p className="room-help">You are beside the slides in an open presenter stance. Look left toward the audience or right toward your PDF. To use a headset, select Enter VR in a compatible headset browser over HTTPS.</p>}
    </div>
  </section>
}
