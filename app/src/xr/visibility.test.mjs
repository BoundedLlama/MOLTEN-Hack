import assert from 'node:assert/strict'
import test from 'node:test'
import { shouldSuspendPage } from './visibility.ts'

test('Quest page visibility changes during entry and VR do not cancel the session', () => {
  assert.equal(shouldSuspendPage(true, false, true), false)
  assert.equal(shouldSuspendPage(true, true, true), false)
  assert.equal(shouldSuspendPage(true, true, false), false)
})

test('desktop backgrounding still suspends practice', () => {
  assert.equal(shouldSuspendPage(true, false, false), true)
  assert.equal(shouldSuspendPage(false, false, false), false)
})
