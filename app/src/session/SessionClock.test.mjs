import assert from 'node:assert/strict'
import test from 'node:test'
import { SessionClock } from './SessionClock.ts'

test('readiness gates start/resume; invalid and duplicate actions are harmless', () => {
  const clock = new SessionClock(() => 0)
  assert.equal(clock.act('start'), false)
  assert.equal(clock.act('resume'), false)
  clock.setReady(true)
  assert.equal(clock.act('start'), true)
  assert.equal(clock.act('start'), false)
  clock.act('pause')
  clock.setReady(false)
  assert.equal(clock.act('resume'), false)
  assert.equal(clock.act('end'), true)
})

test('audio, head samples and page changes share active time across repeated pauses', () => {
  let now = 100
  const clock = new SessionClock(() => now)
  const audio = []
  clock.setAudio(Object.fromEntries(['start', 'pause', 'resume', 'stop'].map(action => [action, () => audio.push(action)])))
  clock.setReady(true)
  clock.act('start')
  now += 1000
  clock.record('head', {})
  clock.act('pause')
  now += 30000
  assert.equal(clock.record('head', {}), false)
  assert.equal(clock.record('page', 2), false)
  assert.equal(clock.elapsedMs, 1000)
  clock.act('resume')
  clock.record('page', 3)
  now += 500
  clock.act('pause')
  now += 2000
  clock.act('resume')
  now += 250
  clock.act('end')
  now += 10000
  assert.equal(clock.elapsedMs, 1750)
  assert.equal(clock.events.find(event => event.type === 'page').timeMs, 1000)
  assert.deepEqual(audio, ['start', 'pause', 'resume', 'pause', 'resume', 'stop'])
  clock.act('start')
  assert.equal(clock.elapsedMs, 0)
  assert.deepEqual(clock.events, [{ type: 'start', timeMs: 0 }])
})

test('failed audio transitions leave clock unchanged', () => {
  const clock = new SessionClock(() => 0)
  clock.setReady(true)
  clock.setAudio({ start() { throw new Error('device unavailable') } })
  assert.throws(() => clock.act('start'))
  assert.equal(clock.state, 'idle')
})
