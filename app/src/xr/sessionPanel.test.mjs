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

test('slide rays respect page boundaries, loading, countdown and inactive controls', () => {
  const context = new Proxy({}, { get: () => () => {} })
  const original = globalThis.document
  globalThis.document = { createElement: () => ({ getContext: () => context }) }
  const changes = []
  const panel = createSessionPanel(() => {}, () => {}, delta => changes.push(delta))
  try {
    const [, , , , back, next] = panel.mesh.children
    panel.mesh.position.set(2, 1.6, -3)
    panel.mesh.rotation.set(0.3, 1.8, -0.2)
    const controller = new THREE.Object3D()
    controller.position.copy(panel.mesh.position)
    const click = target => {
      panel.mesh.updateMatrixWorld(true)
      controller.lookAt(controller.position.clone().multiplyScalar(2).sub(target.getWorldPosition(new THREE.Vector3())))
      panel.select(controller)
    }
    panel.update(null, false, true, 0, { page: 1, pageCount: 3, loading: false })
    click(back); click(next)
    assert.deepEqual(changes, [1])
    panel.update(null, true, true, 0, { page: 3, pageCount: 3, loading: false })
    click(back); click(next)
    assert.deepEqual(changes, [1, -1])
    for (const [count, active, loading, pageCount] of [[null, true, true, 3], [3, true, false, 3], [null, false, false, 3], [null, true, false, 1]]) {
      panel.update(count, false, active, 0, { page: 1, pageCount, loading })
      click(back); click(next)
    }
    assert.deepEqual(changes, [1, -1])
  } finally {
    panel.dispose()
    globalThis.document = original
  }
})
