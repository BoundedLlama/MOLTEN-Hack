import { useEffect, useRef, useState } from 'react'
import { ConversationProvider, useConversation } from '@elevenlabs/react'
import { setAudienceSpeaking } from '../audience/audience'

const agentId = import.meta.env.VITE_ELEVENLABS_AGENT_ID?.trim()

export default function VoiceQA(props: { immersive: boolean; endSignal: number }) {
  return <ConversationProvider><VoiceCard {...props} /></ConversationProvider>
}

function VoiceCard({ immersive, endSignal }: { immersive: boolean; endSignal: number }) {
  const [error, setError] = useState('')
  const requested = useRef(false)
  const { startSession, endSession, status, isSpeaking } = useConversation({
    onModeChange: ({ mode }) => setAudienceSpeaking(requested.current && mode === 'speaking'),
    onDisconnect: () => {
      requested.current = false
      setAudienceSpeaking(false)
    },
    onError: (message) => {
      requested.current = false
      setAudienceSpeaking(false)
      setError(`Voice Q&A failed: ${message}. Allow microphone access in this browser and check the public agent’s allowed domains, then retry.`)
      endSession()
    },
  })

  useEffect(() => {
    // Stop/End practice also ends Q&A; leaving the room unmounts the provider.
    requested.current = false
    setAudienceSpeaking(false)
    endSession()
    return () => {
      requested.current = false
      setAudienceSpeaking(false)
      endSession()
    }
  }, [endSignal, endSession])

  const toggle = () => {
    if (requested.current || status === 'connected' || status === 'connecting') {
      requested.current = false
      setAudienceSpeaking(false)
      endSession()
      return
    }
    setError('')
    if (!agentId) { setError('Set VITE_ELEVENLABS_AGENT_ID and restart the app to enable voice Q&A.'); return }
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError('Voice Q&A needs microphone access over HTTPS (or localhost for desktop testing).')
      return
    }
    requested.current = true
    // The SDK requests the browser's default microphone only from this click.
    // On Quest Browser this is the headset microphone; no PDF data is supplied.
    try {
      startSession({ agentId, connectionType: 'webrtc' })
    } catch {
      requested.current = false
      setAudienceSpeaking(false)
      endSession()
      setError('Could not start voice Q&A. Check microphone permission and try again.')
    }
  }
  const connected = status === 'connected'
  const connecting = status === 'connecting'
  return <aside className="voice-qa" hidden={immersive} aria-labelledby="voice-qa-title">
    <h2 id="voice-qa-title">Want live questions?</h2>
    <p>Rehearse with a curious audience member.</p>
    <button className="primary voice-qa-button" onClick={toggle} aria-describedby="voice-qa-privacy voice-qa-vr">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.4 2.1L8.1 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.6 1.9Z" /></svg>
      {connected ? 'End voice Q&A' : connecting ? 'Cancel connection' : 'Start voice Q&A'}
    </button>
    <p className="voice-qa-status" role="status" aria-live="polite">{connecting ? 'Connecting… Allow microphone access when prompted.' : connected ? isSpeaking ? 'Audience member speaking' : 'Listening to you' : 'Voice Q&A is off'}</p>
    <p id="voice-qa-privacy">Your voice goes to ElevenLabs. The agent hears you, not your PDF.</p>
    <p id="voice-qa-vr">On Quest, start here before entering VR. Audio continues in VR; exit VR to use this card. Stop practice also ends Q&A. Pausing practice leaves Q&A live.</p>
    {(!agentId || error) && <p className="voice-qa-error" role="alert">{error || 'Voice Q&A needs VITE_ELEVENLABS_AGENT_ID configured.'}</p>}
  </aside>
}
