import * as THREE from 'three'
import type { PageNavigation } from '../poster/types'

/** View-following 3D buttons plus non-interactive countdown/timer overlays. */
export function createSessionPanel(onToggle: () => void, onStop: () => void, onNavigate: (delta: number) => void = () => {}) {
  const group = new THREE.Group()
  const resources: { geometry: THREE.PlaneGeometry; material: THREE.MeshBasicMaterial; texture: THREE.CanvasTexture }[] = []
  function plane(width: number, height: number, pixels: number, overlay = false) {
    const canvas = document.createElement('canvas')
    canvas.width = pixels; canvas.height = pixels
    const context = canvas.getContext('2d')!
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    const geometry = new THREE.PlaneGeometry(width, height)
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthTest: !overlay, depthWrite: !overlay })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.renderOrder = overlay ? 1000 : 0
    group.add(mesh)
    resources.push({ geometry, material, texture })
    return { mesh, context, texture }
  }
  const toggle = plane(0.09, 0.09, 128)
  const stop = plane(0.09, 0.09, 128)
  toggle.mesh.position.set(-0.43, 0.29, -1)
  stop.mesh.position.set(-0.32, 0.29, -1)
  const number = plane(0.55, 0.55, 512, true)
  number.mesh.position.z = -1.2
  const timer = plane(0.26, 0.13, 256, true)
  timer.mesh.position.set(0.36, 0.29, -1)
  const back = plane(0.09, 0.09, 128)
  const next = plane(0.09, 0.09, 128)
  back.mesh.position.set(-0.21, 0.29, -1)
  next.mesh.position.set(-0.10, 0.29, -1)
  let canBack = false
  let canNext = false
  let previousTime = ''
  let previous = ''
  function update(count: number | null, paused: boolean, active: boolean, elapsedMs: number, navigation?: Pick<PageNavigation, 'page' | 'pageCount' | 'loading'>) {
    timer.mesh.visible = active
    const seconds = Math.floor((count !== null ? 0 : elapsedMs) / 1000)
    const time = `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
    if (time !== previousTime) {
      previousTime = time
      const ctx = timer.context
      ctx.clearRect(0, 0, 256, 256)
      ctx.fillStyle = 'rgba(242,246,236,0.9)'
      ctx.beginPath(); ctx.roundRect(0, 48, 256, 160, 32); ctx.fill()
      ctx.fillStyle = '#385443'
      ctx.font = '600 72px monospace'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(time, 128, 132)
      timer.texture.needsUpdate = true
    }
    canBack = !!navigation && !navigation.loading && navigation.page > 1
    canNext = !!navigation && !navigation.loading && navigation.page < navigation.pageCount
    const key = `${count}/${paused}/${active}/${canBack}/${canNext}`
    if (key === previous) return
    previous = key
    toggle.mesh.visible = active && count === null
    stop.mesh.visible = active
    number.mesh.visible = count !== null
    back.mesh.visible = next.mesh.visible = active && count === null
    for (const [index, item] of [toggle, stop].entries()) {
      const ctx = item.context
      ctx.clearRect(0, 0, 128, 128)
      ctx.fillStyle = 'rgba(242,246,236,0.9)'
      ctx.beginPath(); ctx.arc(64, 64, 60, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#385443'
      if (index === 1) { ctx.beginPath(); ctx.roundRect(45, 45, 38, 38, 6); ctx.fill() }
      else if (paused) { ctx.beginPath(); ctx.moveTo(51, 41); ctx.lineTo(89, 64); ctx.lineTo(51, 87); ctx.closePath(); ctx.fill() }
      else { ctx.fillRect(44, 43, 13, 42); ctx.fillRect(71, 43, 13, 42) }
      item.texture.needsUpdate = true
    }
    for (const [item, direction, enabled] of [[back, -1, canBack], [next, 1, canNext]] as const) {
      const ctx = item.context
      ctx.clearRect(0, 0, 128, 128)
      ctx.fillStyle = 'rgba(242,246,236,0.9)'
      ctx.beginPath(); ctx.arc(64, 64, 60, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = enabled ? '#385443' : '#a5b0a7'
      ctx.lineWidth = 9
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      ctx.beginPath(); ctx.moveTo(64 - direction * 12, 42); ctx.lineTo(64 + direction * 12, 64); ctx.lineTo(64 - direction * 12, 86); ctx.stroke()
      item.texture.needsUpdate = true
    }
    number.context.clearRect(0, 0, 512, 512)
    if (count !== null) {
      number.context.fillStyle = 'rgba(255,255,255,0.65)'
      number.context.font = '200 380px sans-serif'
      number.context.textAlign = 'center'; number.context.textBaseline = 'middle'
      number.context.fillText(String(count), 256, 275)
    }
    number.texture.needsUpdate = true
  }
  const raycaster = new THREE.Raycaster()
  const rotation = new THREE.Matrix4()
  function select(controller: THREE.Object3D) {
    if (!group.visible) return
    controller.updateWorldMatrix(true, false)
    group.updateWorldMatrix(true, true)
    rotation.extractRotation(controller.matrixWorld)
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld)
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(rotation)
    const hit = raycaster.intersectObjects([toggle.mesh, stop.mesh, ...(canBack ? [back.mesh] : []), ...(canNext ? [next.mesh] : [])].filter(mesh => mesh.visible))[0]
    if (hit?.object === toggle.mesh) onToggle()
    if (hit?.object === stop.mesh) onStop()
    if (hit?.object === back.mesh) onNavigate(-1)
    if (hit?.object === next.mesh) onNavigate(1)
  }
  return { mesh: group, update, select, dispose() { resources.forEach(({ geometry, material, texture }) => { geometry.dispose(); material.dispose(); texture.dispose() }) } }
}
