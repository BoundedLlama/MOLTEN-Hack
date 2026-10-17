import { useEffect, useState } from 'react'
import { SessionClock, formatTime, sessionActions } from './SessionClock'

export default function SessionControls({ clock, act, reason }: {
  clock: SessionClock; act: (action: typeof sessionActions[number]) => void; reason: string
}) {
  const [, refresh] = useState(0)
  useEffect(() => {
    const timer = window.setInterval(() => refresh(value => value + 1), 100)
    return () => window.clearInterval(timer)
  }, [])
  return <div className="session-controls" aria-label="Practice session">
    <strong>{clock.state} · <time>{formatTime(clock.elapsedMs)}</time></strong>
    <div>{sessionActions.map(action => <button key={action} disabled={!clock.can(action)} onClick={() => act(action)}>{action[0].toUpperCase() + action.slice(1)}</button>)}</div>
    <p role="status">{reason || 'Ready. Paused time is excluded from all measurements.'}</p>
  </div>
}
