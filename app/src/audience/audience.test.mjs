import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import { createAudience, setAudienceSpeaking, updateAudience, disposeAudience } from './audience.ts'

test('one front-facing mouth animates while speaking and closes immediately on listening/end', () => {
  const audience = createAudience(12)
  try {
    const mouth = audience.getObjectByName('Audience speaker mouth')
    assert.ok(mouth)
    const mouths = []
    audience.traverse(object => { if (object.name === mouth.name) mouths.push(object) })
    assert.equal(mouths.length, 1)
    assert.ok(mouth.position.z > 0.15)
    assert.equal(mouth.scale.y, 0.008)
    // From the presenter's position, a ray aimed at the mouth reaches it before skin.
    audience.updateMatrixWorld(true)
    const position = mouth.getWorldPosition(new THREE.Vector3())
    const origin = new THREE.Vector3(-2.2, 1.65, 1.6)
    const ray = new THREE.Raycaster(origin, position.clone().sub(origin).normalize())
    assert.equal(ray.intersectObject(audience, true)[0].object, mouth)
    updateAudience(1)
    const otherRotations = audience.children.slice(1).map(person => person.children.at(-1).quaternion.clone())
    setAudienceSpeaking(true)
    updateAudience(1)
    const firstOpen = mouth.scale.y
    assert.ok(firstOpen > 0.008)
    audience.children.slice(1).forEach((person, i) => assert.ok(person.children.at(-1).quaternion.equals(otherRotations[i])))
    // Reduced-motion mode suppresses idle motion, but keeps the voice indicator working.
    updateAudience(1.1, false)
    assert.notEqual(mouth.scale.y, firstOpen)
    setAudienceSpeaking(false)
    assert.equal(mouth.scale.y, 0.008)
    updateAudience(2)
    assert.equal(mouth.scale.y, 0.008)
  } finally { disposeAudience() }
})

test('disposing/recreating the audience clears speaking state', () => {
  const first = createAudience(12)
  const oldMouth = first.getObjectByName('Audience speaker mouth')
  setAudienceSpeaking(true)
  updateAudience(1)
  disposeAudience()
  assert.equal(oldMouth.scale.y, 0.008)
  const second = createAudience(12)
  try {
    updateAudience(1)
    assert.equal(second.getObjectByName('Audience speaker mouth').scale.y, 0.008)
  } finally { disposeAudience() }
})
