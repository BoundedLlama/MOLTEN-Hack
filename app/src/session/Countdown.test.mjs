import assert from 'node:assert/strict'
import test from 'node:test'
import { Countdown } from './Countdown.ts'
import { SessionClock } from './SessionClock.ts'

test('3, 2, 1 countdown completes before any measured time begins', () => {
  let now = 0
  const countdown = new Countdown(() => now)
  const clock = new SessionClock(() => now)
  clock.setReady(true)
  countdown.start()
  assert.equal(countdown.remaining, 3)
  now = 1000
  assert.equal(countdown.remaining, 2)
  now = 2000
  assert.equal(countdown.remaining, 1)
  assert.equal(clock.elapsedMs, 0)
  assert.equal(clock.record('head', {}), false)
  now = 3000
  assert.equal(countdown.remaining, 0)
  clock.act('start')
  assert.equal(clock.elapsedMs, 0)
  now = 3500
  assert.equal(clock.elapsedMs, 500)
})

test('cancel prevents a delayed start and a new countdown starts at three', () => {
  let now = 0
  const countdown = new Countdown(() => now)
  countdown.start()
  now = 1500
  countdown.cancel()
  now = 10000
  assert.equal(countdown.remaining, null)
  countdown.start()
  assert.equal(countdown.remaining, 3)
})
