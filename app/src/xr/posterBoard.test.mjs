import assert from 'node:assert/strict'
import test from 'node:test'
import { SRGBColorSpace, Vector3 } from 'three'
import { createPosterBoard } from './posterBoard.ts'

test('published canvas is used directly, pages retain their aspect ratio, board faces presenter', () => {
  const board = createPosterBoard()
  const canvas = { width: 1024, height: 2048 }
  for (const ratio of [0.5, 16 / 9, 4]) {
    board.setFrame({ canvas, aspectRatio: ratio, page: 2, pageCount: 3 })
    assert.equal(board.mesh.material.map.image, canvas)
    assert.equal(board.mesh.material.map.colorSpace, SRGBColorSpace)
    assert.ok(Math.abs(board.mesh.scale.x / board.mesh.scale.y - ratio) < 1e-10)
    assert.ok(board.mesh.scale.x <= 3.2 && board.mesh.scale.y <= 2.4)
    assert.equal(board.mesh.userData.page, 2)
  }
  const normal = new Vector3(0, 0, 1).applyQuaternion(board.mesh.quaternion)
  assert.ok(normal.z < -0.999)
  assert.equal(board.mesh.position.z, 3)
  board.dispose()
})

test('replacement, removal and teardown dispose their GPU resources', () => {
  const board = createPosterBoard()
  const frame = { canvas: {}, aspectRatio: 1, page: 1, pageCount: 1 }
  let disposedTextures = 0
  for (let i = 0; i < 2; i++) {
    board.setFrame(frame)
    board.mesh.material.map.addEventListener('dispose', () => disposedTextures++)
  }
  assert.equal(disposedTextures, 1)
  board.setFrame(null)
  assert.equal(disposedTextures, 2)
  assert.equal(board.mesh.material.map, null)
  assert.equal(board.mesh.userData.page, undefined)
  board.setFrame(frame)
  board.mesh.material.map.addEventListener('dispose', () => disposedTextures++)
  let disposedGeometry = false
  let disposedMaterial = false
  board.mesh.geometry.addEventListener('dispose', () => { disposedGeometry = true })
  board.mesh.material.addEventListener('dispose', () => { disposedMaterial = true })
  board.dispose()
  assert.equal(disposedTextures, 3)
  assert.ok(disposedGeometry && disposedMaterial)
})
