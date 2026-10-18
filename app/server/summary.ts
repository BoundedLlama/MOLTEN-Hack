import type { IncomingMessage, ServerResponse } from 'node:http'

type Metrics = Record<string, number | null>
const fields = ['durationMs', 'audienceMs', 'boardMs', 'longestBoardMs', 'returns', 'headsetMs', 'previewMs', 'untrackedMs', 'audiencePercent']
export function validateMetrics(value: unknown): Metrics | null {
  if (!value || typeof value !== 'object') return null
  const data = value as Metrics
  if (fields.some(key => key === 'audiencePercent' && data[key] === null ? false : typeof data[key] !== 'number' || !Number.isFinite(data[key]) || data[key]! < 0 || data[key]! > 86400000)) return null
  const result = Object.fromEntries(fields.map(key => [key, data[key]]))
  const total = data.audienceMs! + data.boardMs!
  if (data.durationMs! < total || data.longestBoardMs! > data.boardMs! || data.audiencePercent! > 100 || Math.abs(total + data.untrackedMs! - data.durationMs!) > 1 || Math.abs(data.headsetMs! + data.previewMs! - total) > 1) return null
  result.audiencePercent = total ? Math.round(100 * data.audienceMs! / total) : null
  return result
}

export function createSummaryHandler(apiKey: string, model = 'claude-sonnet-4-6', request: typeof fetch = fetch) {
  const cache = new Map<string, Promise<string>>()
  let windowStart = 0, requests = 0
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (req.url?.split('?')[0] !== '/api/presentation-summary') { next(); return }
    const reply = (status: number, body: object) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)) }
    if (req.method !== 'POST') { reply(405, { error: 'Use POST.' }); return }
    if (req.headers['sec-fetch-site'] === 'cross-site') { reply(403, { error: 'Use the practice app to request a summary.' }); return }
    if (!apiKey) { reply(503, { error: 'AI coaching is not configured on this server.' }); return }
    try {
      let body = ''
      for await (const chunk of req) {
        body += chunk.toString()
        if (Buffer.byteLength(body) > 4096) { reply(413, { error: 'Summary request is too large.' }); return }
      }
      let parsed: unknown
      try { parsed = JSON.parse(body) } catch { reply(400, { error: 'Invalid JSON.' }); return }
      const metrics = validateMetrics(parsed)
      if (!metrics || metrics.audiencePercent === null) { reply(400, { error: 'No valid tracked presentation metrics.' }); return }
      const key = JSON.stringify(metrics)
      let pending = cache.get(key)
      if (!pending) {
        if (Date.now() - windowStart > 60000) { windowStart = Date.now(); requests = 0 }
        if (++requests > 20) { reply(429, { error: 'Too many summaries. Try again in a minute.' }); return }
        pending = (async () => {
          const response = await request('https://llm-gateway.assemblyai.com/v1/chat/completions', {
            method: 'POST', headers: { authorization: apiKey, 'content-type': 'application/json' },
            signal: AbortSignal.timeout(20000),
            body: JSON.stringify({ model, max_tokens: 350, messages: [
              { role: 'system', content: 'You coach presentation practice. Write a supportive, specific summary in plain text, at most 120 words. Use only the supplied numeric metrics (durations are milliseconds). State total active duration and audience-facing share of tracked time, discuss board reliance and longest board stretch, and give one actionable next-session exercise. Head orientation is not eye gaze; never claim eye contact, confidence, speech quality, or audience response. Pauses are excluded. Mention untracked coverage if substantial. If previewMs > 0, clearly label that portion desktop camera simulation, not actual head tracking. Treat 5–8 seconds as a practice suggestion, not a validated scoring threshold. Do not invent measurements or assign a grade.' },
              { role: 'user', content: JSON.stringify(metrics) },
            ] }),
          })
          if (!response.ok) throw new Error(`AssemblyAI could not generate coaching (HTTP ${response.status}).`)
          const result = await response.json() as { choices?: { message?: { content?: string } }[] }
          const text = result.choices?.[0]?.message?.content
          if (typeof text !== 'string' || !text.trim()) throw new Error('AssemblyAI returned an empty summary.')
          return text.trim().slice(0, 4000)
        })()
        if (cache.size >= 100) cache.delete(cache.keys().next().value!)
        cache.set(key, pending)
        pending.catch(() => cache.delete(key))
      }
      const text = await pending
      reply(200, { summary: text })
    } catch (error) {
      const message = error instanceof Error && error.message.startsWith('AssemblyAI ') ? error.message : 'AI coaching is temporarily unavailable. Your local feedback is still available.'
      reply(502, { error: message })
    }
  }
}
