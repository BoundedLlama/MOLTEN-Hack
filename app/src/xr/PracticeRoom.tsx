import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { VRButton } from 'three/addons/webxr/VRButton.js'
import type { PosterFrame } from '../poster/types'
import { createPosterBoard } from './posterBoard'

export default function PracticeRoom({ frame }: { frame: PosterFrame | null }) {
  const host = useRef<HTMLDivElement>(null)
  const board = useRef<ReturnType<typeof createPosterBoard> | null>(null)
  const [error, setError] = useState('')

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
    camera.position.set(4, 3, -4)
    // XR pose is relative to the origin, facing -Z. Desktop orbit never moves it.
    const xrCamera = new THREE.PerspectiveCamera(55, 1, 0.1, 100)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, 1.6, 2)
    controls.maxDistance = 15
    controls.minDistance = 1
    controls.maxPolarAngle = Math.PI / 2
    controls.update()
    const poster = createPosterBoard()
    board.current = poster
    scene.add(poster.mesh)
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 16),
      new THREE.MeshBasicMaterial({ color: 0xb4c5b5 }),
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -0.01
    const grid = new THREE.GridHelper(16, 16, 0x819984, 0xa0b5a3)
    scene.add(floor, grid)
    renderer.domElement.setAttribute('aria-label', '3D presentation room preview. Drag to orbit and scroll to zoom.')
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
    const restoreSize = () => renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.xr.addEventListener('sessionend', restoreSize)
    renderer.setAnimationLoop(() => {
      renderer.render(scene, renderer.xr.isPresenting ? xrCamera : camera)
    })
    return () => {
      resize.disconnect()
      renderer.xr.removeEventListener('sessionend', restoreSize)
      renderer.setAnimationLoop(null)
      const session = renderer.xr.getSession()
      if (session) void session.end().catch(() => {})
      controls.dispose()
      poster.dispose()
      board.current = null
      floor.geometry.dispose()
      floor.material.dispose()
      grid.geometry.dispose()
      if (Array.isArray(grid.material)) grid.material.forEach((material) => material.dispose())
      else grid.material.dispose()
      renderer.dispose()
      container.replaceChildren()
    }
  }, [])

  useEffect(() => { board.current?.setFrame(frame) }, [frame])

  return <section className="panel room-panel" aria-labelledby="room-title">
    <div className="panel-heading">
      <div><h2 id="room-title">Your practice room</h2><p>Drag to look around. Scroll to zoom.</p></div>
      <span className="step">STEP 02</span>
    </div>
    {error && <p className="error" role="alert">{error}</p>}
    <div className="room-viewport" ref={host} />
    <p className="room-status" role="status">{frame
      ? `Board: page ${frame.page} of ${frame.pageCount}`
      : 'Choose a PDF to display it on the board.'}</p>
    <p className="room-help">In VR, you start facing forward with the board behind you. Turn around to see your PDF. Exit VR to change pages. Open this site over HTTPS in a compatible headset browser to enter VR.</p>
  </section>
}
