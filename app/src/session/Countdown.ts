/** Countdown uses wall time; the measurement clock starts only after it finishes. */
export class Countdown {
  private deadline: number | null = null
  constructor(privateNow?: () => number) { this.now = privateNow ?? (() => performance.now()) }
  private now: () => number
  start() { this.deadline = this.now() + 3000 }
  cancel() { this.deadline = null }
  get remaining() { return this.deadline === null ? null : Math.max(0, Math.ceil((this.deadline - this.now()) / 1000)) }
}
