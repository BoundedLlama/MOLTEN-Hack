import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import { createSessionPanel } from './sessionPanel.ts'

test('view-following buttons remain ray-selectable after rotation and translation; overlays are not targets', () => {
  const texts = []
  const context = new Proxy({}, { get: (_, key) => key === 'fillText' ? text => texts.push(text) : () => {} })
  const original = globalThis.document
  globalThis.document = { createElement: () => ({ getContext: () => context }) }
  let toggles = 0
  let stops = 0
  const panel = createSessionPanel(() => toggles++, () => stops++)
  try {
    panel.update(null, false, true, 65000)
    assert.ok(texts.includes('01:05'))
    const [toggle, stop, countdown, timer] = panel.mesh.children
    assert.equal(toggle.material.depthTest, true)
    assert.equal(stop.material.depthTest, true)
    assert.equal(countdown.material.depthTest, false)
    assert.equal(timer.material.depthTest, false)
    panel.mesh.position.set(2, 1.6, -3)
    panel.mesh.rotation.set(0.3, 1.8, -0.2)
    panel.mesh.updateMatrixWorld(true)
    const controller = new THREE.Object3D()
    controller.position.copy(panel.mesh.position)
    for (const target of [toggle, stop, timer]) {
      controller.lookAt(controller.position.clone().multiplyScalar(2).sub(target.getWorldPosition(new THREE.Vector3())))
      panel.select(controller)
    }
    assert.equal(toggles, 1)
    assert.equal(stops, 1)
    panel.update(3, false, true, 65000)
    assert.equal(toggle.visible, false)
    assert.equal(countdown.visible, true)
    assert.ok(texts.includes('00:00'))
    assert.ok(texts.includes('3'))
  } finally {
    panel.dispose()
    globalThis.document = original
  }
})
