import test from 'node:test'
import assert from 'node:assert/strict'
import { classifyHead, summarizeHead, coaching, headTimeline } from './headSummary.ts'

const origin = { x: 0, z: 0 }
const heading = degrees => ({ x: Math.sin(degrees * Math.PI / 180), z: -Math.cos(degrees * Math.PI / 180) })
const sample = (timeMs, zone, source = 'headset') => ({ type: 'head', timeMs, data: { zone, source } })

test('40-degree targets split at their midpoint, with jitter tolerance', () => {
  const board = heading(40), audience = heading(0)
  assert.equal(classifyHead(origin, heading(0), audience, board), 'audience')
  assert.equal(classifyHead(origin, heading(40), audience, board), 'board')
  assert.equal(classifyHead(origin, heading(18), audience, board), 'audience')
  assert.equal(classifyHead(origin, heading(22), audience, board), 'board')
  assert.equal(classifyHead(origin, heading(20.5), audience, board, 'audience'), 'audience')
  assert.equal(classifyHead(origin, heading(19.5), audience, board, 'board'), 'board')
})

test('targets follow presenter translation and unusable vertical headings are untracked', () => {
  const position = { x: -2.2, z: 1.6 }, audience = { x: 0, z: -4 }, board = { x: 0, z: 3 }
  assert.equal(classifyHead(position, { x: 2.2, z: -5.6 }, audience, board), 'audience')
  assert.equal(classifyHead(position, { x: 2.2, z: 1.4 }, audience, board), 'board')
  assert.equal(classifyHead(position, origin, audience, board), null)
})

test('time accounting excludes pauses and breaks continuous board stretches', () => {
  const result = summarizeHead([
    { type: 'start', timeMs: 0 }, sample(0, 'board'), sample(100, 'board'),
    { type: 'pause', timeMs: 200 }, { type: 'resume', timeMs: 200 },
    sample(200, 'board'), sample(300, 'audience'), { type: 'end', timeMs: 400 },
  ], 400)
  assert.equal(result.audienceMs, 100)
  assert.equal(result.boardMs, 300)
  assert.equal(result.longestBoardMs, 200)
  assert.equal(result.returns, 1)
  assert.equal(result.audiencePercent, 25)
  assert.equal(result.untrackedMs, 0)
})

test('tracking losses are not extrapolated and sources remain distinct', () => {
  const result = summarizeHead([sample(0, 'board'), sample(5000, null), sample(5100, 'audience', 'desktop-preview'), { type: 'end', timeMs: 5200 }], 5200)
  assert.equal(result.headsetMs, 250)
  assert.equal(result.previewMs, 100)
  assert.equal(result.untrackedMs, 4850)
  assert.equal(result.returns, 0)
  assert.equal(result.longestBoardMs, 250)
})

test('long board glances produce specific coaching and empty sessions avoid a false score', () => {
  const result = summarizeHead(Array.from({ length: 80 }, (_, i) => sample(i * 100, 'board')), 8000)
  assert.equal(result.longestBoardMs, 8000)
  assert.match(coaching(result), /8.0 seconds/)
  assert.equal(summarizeHead([], 0).audiencePercent, null)
  assert.match(coaching(summarizeHead([], 5000)), /No usable/)
})

test('timeline covers the entire session and agrees with measured zone totals', () => {
  const events = [
    { type: 'start', timeMs: 0 }, sample(50, 'audience'), sample(150, 'audience'),
    { type: 'page', timeMs: 180 }, sample(250, 'board'),
    { type: 'pause', timeMs: 350 }, { type: 'resume', timeMs: 350 },
    sample(400, 'board'), sample(900, null), sample(1000, 'audience'),
    { type: 'end', timeMs: 1100 },
  ]
  const timeline = headTimeline(events, 1100)
  const summary = summarizeHead(events, 1100)
  const total = zone => timeline.filter(interval => interval.zone === zone).reduce((sum, interval) => sum + interval.endMs - interval.startMs, 0)
  assert.equal(total('audience'), summary.audienceMs)
  assert.equal(total('board'), summary.boardMs)
  assert.equal(total(null), summary.untrackedMs)
  assert.deepEqual(timeline[0], { startMs: 0, endMs: 50, zone: null })
  assert.deepEqual(timeline[1], { startMs: 50, endMs: 250, zone: 'audience' })
  assert.equal(timeline.at(-1).endMs, 1100)
})

test('empty recording and zero-length sessions have honest timelines', () => {
  assert.deepEqual(headTimeline([], 500), [{ startMs: 0, endMs: 500, zone: null }])
  assert.deepEqual(headTimeline([], 0), [])
})
