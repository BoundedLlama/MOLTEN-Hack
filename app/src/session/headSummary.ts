import type { SessionEvent } from './SessionClock'

export type HeadZone = 'audience' | 'board'
type Point = { x: number; z: number }
export type HeadSample = {
  zone: HeadZone | null
  source: 'headset' | 'desktop-preview'
  position: number[]
  orientation: number[]
}

/** Divide horizontal heading at the angular bisector of the two actual targets. */
export function classifyHead(position: Point, forward: Point, audience: Point, board: Point, previous: HeadZone | null = null): HeadZone | null {
  const length = Math.hypot(forward.x, forward.z)
  if (length < 0.1) return null
  const angle = (target: Point) => {
    const x = target.x - position.x, z = target.z - position.z
    const distance = Math.hypot(x, z)
    if (distance < 0.01) return NaN
    return Math.acos(Math.max(-1, Math.min(1, (forward.x * x + forward.z * z) / (length * distance))))
  }
  const a = angle(audience), b = angle(board)
  if (!Number.isFinite(a + b)) return null
  // Three degrees of hysteresis avoids counting small boundary jitters as turns.
  if (previous && Math.abs(a - b) < 3 * Math.PI / 180) return previous
  return a <= b ? 'audience' : 'board'
}

export function summarizeHead(events: SessionEvent[], durationMs: number) {
  let audienceMs = 0, boardMs = 0, longestBoardMs = 0, boardRun = 0, returns = 0
  let previous: HeadZone | null = null
  let headsetMs = 0, previewMs = 0
  for (let i = 0; i < events.length; i++) {
    const event = events[i]
    if (['pause', 'resume', 'start', 'end'].includes(event.type)) { boardRun = 0; previous = null }
    if (event.type !== 'head') continue
    const sample = event.data as HeadSample
    let next: SessionEvent | undefined
    for (let j = i + 1; j < events.length; j++) {
      if (events[j].type === 'head' || ['pause', 'end', 'resume'].includes(events[j].type)) { next = events[j]; break }
    }
    const gap = Math.max(0, Math.min(durationMs, next?.timeMs ?? durationMs) - event.timeMs)
    // Never extrapolate a frozen/lost headset across an entire missing interval.
    const dt = Math.min(250, gap)
    if (!sample.zone) { boardRun = 0; previous = null; continue }
    if (sample.source === 'headset') headsetMs += dt
    else previewMs += dt
    if (sample.zone === 'audience') {
      audienceMs += dt
      if (previous === 'board') returns++
      boardRun = 0
    } else {
      boardMs += dt
      boardRun += dt
      longestBoardMs = Math.max(longestBoardMs, boardRun)
    }
    previous = sample.zone
    if (gap > 250) { boardRun = 0; previous = null }
  }
  const trackedMs = audienceMs + boardMs
  return { durationMs, audienceMs, boardMs, longestBoardMs, returns, headsetMs, previewMs,
    untrackedMs: Math.max(0, durationMs - trackedMs),
    audiencePercent: trackedMs ? Math.round(100 * audienceMs / trackedMs) : null }
}
export type HeadSummary = ReturnType<typeof summarizeHead>

export type HeadInterval = { startMs: number; endMs: number; zone: HeadZone | null }

/** A local-only timeline; unknown intervals never inherit the previous heading. */
export function headTimeline(events: SessionEvent[], durationMs: number): HeadInterval[] {
  const boundaries = events.filter(event => ['head', 'start', 'pause', 'resume', 'end'].includes(event.type))
  const intervals: HeadInterval[] = []
  const append = (startMs: number, endMs: number, zone: HeadZone | null) => {
    if (endMs <= startMs) return
    const previous = intervals.at(-1)
    if (previous?.zone === zone && previous.endMs === startMs) previous.endMs = endMs
    else intervals.push({ startMs, endMs, zone })
  }
  let cursor = 0
  for (let i = 0; i < boundaries.length; i++) {
    const event = boundaries[i]
    if (event.type !== 'head') continue
    const start = Math.max(cursor, Math.min(durationMs, event.timeMs))
    const end = Math.min(durationMs, boundaries[i + 1]?.timeMs ?? durationMs, start + 250)
    append(cursor, start, null)
    append(start, end, (event.data as HeadSample).zone)
    cursor = Math.max(start, end)
  }
  append(cursor, durationMs, null)
  return intervals
}

export function coaching(summary: HeadSummary) {
  if (summary.audiencePercent === null) return 'No usable head orientation was recorded. Try another session with headset tracking available.'
  const opening = summary.audiencePercent >= 70
    ? 'You kept your head oriented toward the audience for most of the measured presentation.'
    : summary.audiencePercent >= 40
      ? 'You divided your attention between the audience and the board. Try delivering each main point while facing the audience.'
      : 'Your head was oriented toward the board for most of the measured presentation. Glance at a slide for a cue, then turn back to explain it to the audience.'
  return `${opening} ${summary.longestBoardMs >= 7000 ? `Your longest board-facing stretch was ${(summary.longestBoardMs / 1000).toFixed(1)} seconds. Practice returning to the audience within about 5–8 seconds.` : 'Keep board glances brief and return to the audience between points.'}`
}
