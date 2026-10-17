export type SessionState = 'idle' | 'running' | 'paused' | 'ended'
export type SessionAction = 'start' | 'pause' | 'resume' | 'end'
export type SessionEvent = { type: string; timeMs: number; data?: unknown }
export interface SessionAudio {
  start(): void
  pause(): void
  resume(): void
  stop(): void
}

/** All measurement timestamps are active milliseconds from Start, never wall time. */
export class SessionClock {
  state: SessionState = 'idle'
  events: SessionEvent[] = []
  private accumulated = 0
  private since = 0
  private ready = false
  private audio?: SessionAudio
  private now: () => number
  constructor(now: () => number = () => performance.now()) { this.now = now }
  get elapsedMs() { return this.accumulated + (this.state === 'running' ? this.now() - this.since : 0) }
  setReady(ready: boolean) { this.ready = ready }
  setAudio(audio?: SessionAudio) { this.audio = audio }
  can(action: SessionAction) {
    if (action === 'start') return this.ready && (this.state === 'idle' || this.state === 'ended')
    if (action === 'resume') return this.ready && this.state === 'paused'
    if (action === 'pause') return this.state === 'running'
    return this.state === 'running' || this.state === 'paused'
  }
  act(action: SessionAction) {
    if (!this.can(action)) return false
    // Invoke the recorder first: failed transitions must not advance the clock.
    if (action === 'start') this.audio?.start()
    if (action === 'pause') this.audio?.pause()
    if (action === 'resume') this.audio?.resume()
    if (action === 'end') this.audio?.stop()
    if (action === 'start') { this.accumulated = 0; this.events = [] }
    if (this.state === 'running') this.accumulated = this.elapsedMs
    if (action === 'start' || action === 'resume') { this.since = this.now(); this.state = 'running' }
    else this.state = action === 'pause' ? 'paused' : 'ended'
    this.events.push({ type: action, timeMs: this.elapsedMs })
    return true
  }
  record(type: string, data: unknown) {
    if (this.state !== 'running') return false
    this.events.push({ type, timeMs: this.elapsedMs, data })
    return true
  }
}
export const sessionActions: SessionAction[] = ['start', 'pause', 'resume', 'end']
export function formatTime(ms: number) {
  const seconds = Math.floor(ms / 1000)
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
}
