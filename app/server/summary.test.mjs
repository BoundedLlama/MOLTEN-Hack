import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'node:http'
import { createSummaryHandler, validateMetrics } from './summary.ts'
const metrics = { durationMs: 1000, audienceMs: 600, boardMs: 400, longestBoardMs: 400, returns: 1, headsetMs: 1000, previewMs: 0, untrackedMs: 0, audiencePercent: 60 }

test('validate numeric metrics and discard all unsolicited payload fields', () => {
  assert.equal(validateMetrics({ ...metrics, durationMs: -1 }), null)
  assert.equal(validateMetrics({ ...metrics, headsetMs: 0 }), null)
  assert.equal(validateMetrics({ ...metrics, boardMs: '400' }), null)
  assert.equal(validateMetrics({ ...metrics, audienceMs: NaN }), null)
  assert.deepEqual(validateMetrics({ ...metrics, prompt: 'ignored', audiencePercent: 0 }), metrics)
})

test('server protects credentials, caches summaries and returns safe provider failures', async () => {
  let calls = 0
  const handler = createSummaryHandler('test-secret', 'test-model', async (url, options) => {
    calls++
    assert.equal(url, 'https://llm-gateway.assemblyai.com/v1/chat/completions')
    assert.equal(options.headers.authorization, 'test-secret')
    const payload = JSON.parse(options.body)
    assert.equal(payload.max_tokens, 350)
    assert.deepEqual(JSON.parse(payload.messages[1].content), metrics)
    return new Response(JSON.stringify({ choices: [{ message: { content: 'Practice turning back to your audience.' } }] }))
  })
  const server = createServer((req, res) => { void handler(req, res, () => { res.writeHead(404); res.end() }) })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const url = `http://127.0.0.1:${server.address().port}/api/presentation-summary`
  try {
    const post = body => fetch(url, { method: 'POST', body: JSON.stringify(body) })
    assert.equal((await post({})).status, 400)
    assert.equal((await fetch(url)).status, 405)
    const response = await post(metrics)
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { summary: 'Practice turning back to your audience.' })
    assert.equal((await post(metrics)).status, 200)
    assert.equal(calls, 1)
    assert.equal((await fetch(url, { method: 'POST', headers: { 'Sec-Fetch-Site': 'cross-site' }, body: JSON.stringify(metrics) })).status, 403)
  } finally { await new Promise(resolve => server.close(resolve)) }
})
