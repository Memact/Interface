import http from 'node:http'
import { existsSync, readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')
const DIST_DIR = path.join(ROOT_DIR, 'dist')

function loadEnvFile() {
  const envPath = path.join(ROOT_DIR, '.env')
  if (!existsSync(envPath)) return
  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
    const [key, ...rest] = trimmed.split('=')
    const name = key.trim()
    if (!name || process.env[name]) continue
    process.env[name] = rest.join('=').trim().replace(/^["']|["']$/g, '')
  }
}

loadEnvFile()

const PORT = Number(process.env.PORT || process.env.MEMACT_API_PORT || 8787)
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const MAX_OUTPUT_TOKENS = Number(process.env.GEMINI_MAX_OUTPUT_TOKENS || 180)
const TEMPERATURE = Number(process.env.GEMINI_TEMPERATURE || 0.1)
const MAX_REQUEST_BYTES = Number(process.env.MEMACT_GEMINI_MAX_REQUEST_BYTES || 14000)
const MAX_QUERY_LENGTH = Number(process.env.MEMACT_MAX_QUERY_LENGTH || 240)
const RATE_LIMIT_WINDOW_MS = Number(process.env.MEMACT_RATE_LIMIT_WINDOW_MS || 60000)
const RATE_LIMIT_MAX_REQUESTS = Number(process.env.MEMACT_RATE_LIMIT_MAX_REQUESTS || 30)
const ALLOWED_ORIGINS = new Set(
  String(process.env.MEMACT_ALLOWED_ORIGINS || 'http://localhost:5173,https://memact.com,https://www.memact.com')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
)
const rateLimitBuckets = new Map()

const MIME_TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.ico', 'image/x-icon'],
  ['.webmanifest', 'application/manifest+json'],
  ['.zip', 'application/zip'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
  ['.ttf', 'font/ttf'],
])

function securityHeaders(extra = {}) {
  return {
    'x-frame-options': 'DENY',
    'content-security-policy': [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self'",
      "img-src 'self' data:",
      "font-src 'self'",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      'upgrade-insecure-requests',
    ].join('; '),
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
    'cross-origin-opener-policy': 'same-origin',
    ...extra,
  }
}

function clientKey(request) {
  const forwarded = String(request.headers['x-forwarded-for'] || '').split(',')[0].trim()
  return forwarded || request.socket?.remoteAddress || 'unknown'
}

function checkRateLimit(request) {
  const key = clientKey(request)
  const now = Date.now()
  const current = rateLimitBuckets.get(key)
  if (!current || now - current.startedAt > RATE_LIMIT_WINDOW_MS) {
    rateLimitBuckets.set(key, { startedAt: now, count: 1 })
    return true
  }
  current.count += 1
  if (current.count > RATE_LIMIT_MAX_REQUESTS) {
    return false
  }
  rateLimitBuckets.set(key, current)
  return true
}

function sendJson(response, statusCode, body, origin = '') {
  const headers = securityHeaders({
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers['access-control-allow-origin'] = origin
    headers.vary = 'origin'
  }
  response.writeHead(statusCode, headers)
  response.end(JSON.stringify(body))
}

function normalize(value, maxLength = 0) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (!text) return ''
  if (maxLength && text.length > maxLength) {
    return `${text.slice(0, maxLength - 3).trim()}...`
  }
  return text
}

function compactForPrompt(payload = {}) {
  return {
    query: normalize(payload.query, MAX_QUERY_LENGTH),
    request: payload.request || {},
    sources: Array.isArray(payload.sources) ? payload.sources.slice(0, 4) : [],
  }
}

function isTrustedOrigin(origin = '') {
  if (!origin) {
    return process.env.NODE_ENV !== 'production'
  }
  return ALLOWED_ORIGINS.has(origin)
}

function hasEvidence(payload = {}) {
  const compact = compactForPrompt(payload)
  const evidence = compact.request?.evidence || {}
  return Boolean(
    compact.sources.length ||
      evidence.origin_sources?.length ||
      evidence.memory_signals?.length ||
      evidence.cognitive_schema_memories?.length ||
      evidence.schema_signals?.length ||
      evidence.influence_signals?.length
  )
}

function buildGeminiPrompt(payload) {
  return [
    'You are Memact, a short answer engine that explains where a thought may be formed or shaped from.',
    'Use only the compact evidence packet below.',
    'Answer the user directly. Do not repeat the query as the answer.',
    'Do not invent sources, links, dates, counts, or causes.',
    'Do not claim certainty. Use neutral wording such as "may", "appears", or "the strongest match".',
    'Return strict JSON only with keys: overview, answer, summary.',
    'overview: max 12 words.',
    'answer: max 18 words.',
    'summary: one or two short sentences, max 45 words total.',
    '',
    JSON.stringify(compactForPrompt(payload)),
  ].join('\n')
}

function buildFollowUpPrompt(payload = {}) {
  return [
    'You are Memact. Write short follow-up survey questions for a thought when local evidence is weak.',
    'Use only the user thought below. Do not ask for private details, credentials, medical data, or financial data.',
    'The goal is to clarify where Memact should look next, not to diagnose the user.',
    'Do not repeat any avoid_questions.',
    'If round is greater than 0, ask sharper follow-up questions than the first round.',
    'Return strict JSON only with key: questions.',
    'questions: exactly 3 objects.',
    'Each object must have: id, title, options.',
    'title: max 12 words.',
    'options: exactly 3 short labels, max 5 words each.',
    '',
    JSON.stringify({
      query: normalize(payload.query, MAX_QUERY_LENGTH),
      mode: normalize(payload.mode, 40),
      reason: normalize(payload.reason, 80),
      round: Number(payload.round || 0),
      avoid_questions: (Array.isArray(payload.avoid_questions) ? payload.avoid_questions : [])
        .slice(0, 8)
        .map((question) => normalize(question, 96))
        .filter(Boolean),
    }),
  ].join('\n')
}

function buildHistoryTitlePrompt(payload = {}) {
  const packet = payload.packet && typeof payload.packet === 'object' ? payload.packet : {}
  return [
    'You are Memact. Write a short saved-history title for a guided survey result.',
    'This title appears in a sidebar like a chat history label.',
    'Use plain user language. No technical words like schema, packet, node, edge, RAG, inference, or source candidates.',
    'Prefer the topic and user goal. Do not repeat a full question.',
    'Return strict JSON only with key: title.',
    'title: 2 to 6 words, max 44 characters, no punctuation at the end.',
    '',
    JSON.stringify({
      mode: normalize(payload.mode, 40),
      query: normalize(payload.query, MAX_QUERY_LENGTH),
      candidate_title: normalize(payload.candidate_title, 80),
      topic: normalize(packet.answers?.topic?.label, 80),
      intent: normalize(packet.answers?.intent?.label, 80),
      evidence: normalize(packet.answers?.evidence?.label, 80),
      focus: (Array.isArray(packet.context?.focusLabels) ? packet.context.focusLabels : [])
        .slice(0, 5)
        .map((label) => normalize(label, 50))
        .filter(Boolean),
    }),
  ].join('\n')
}

async function readRequestBody(request) {
  let size = 0
  const chunks = []
  for await (const chunk of request) {
    size += chunk.byteLength
    if (size > MAX_REQUEST_BYTES) {
      throw new Error('request_too_large')
    }
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}

function extractGeminiText(response) {
  const parts = response?.candidates?.[0]?.content?.parts || []
  return parts.map((part) => part?.text || '').join('').trim()
}

function parseJsonText(text) {
  try {
    return JSON.parse(text)
  } catch {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1))
    }
    throw new Error('invalid_model_json')
  }
}

async function handleGeminiAnswer(request, response, origin) {
  if (!isTrustedOrigin(origin)) {
    sendJson(response, 403, { error: 'origin_not_allowed' }, '')
    return
  }

  if (!checkRateLimit(request)) {
    sendJson(response, 429, { error: 'rate_limited' }, origin)
    return
  }

  const contentType = normalize(request.headers['content-type']).toLowerCase()
  if (!contentType.startsWith('application/json')) {
    sendJson(response, 415, { error: 'content_type_must_be_json' }, origin)
    return
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || /replace/i.test(apiKey)) {
    sendJson(response, 503, { error: 'gemini_api_key_missing' }, origin)
    return
  }

  let payload
  try {
    payload = JSON.parse(await readRequestBody(request))
  } catch (error) {
    sendJson(response, error?.message === 'request_too_large' ? 413 : 400, {
      error: error?.message || 'invalid_json',
    }, origin)
    return
  }

  if (!normalize(payload.query, MAX_QUERY_LENGTH)) {
    sendJson(response, 400, { error: 'query_required' }, origin)
    return
  }

  if (!hasEvidence(payload)) {
    sendJson(response, 200, {
      provider: 'gemini',
      model: GEMINI_MODEL,
      applied: false,
      skipped: true,
      reason: 'no_selected_evidence',
    }, origin)
    return
  }

  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: buildGeminiPrompt(payload) }],
          },
        ],
        generationConfig: {
          temperature: TEMPERATURE,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          responseMimeType: 'application/json',
        },
      }),
    }
  )

  const geminiJson = await geminiResponse.json().catch(() => ({}))
  if (!geminiResponse.ok) {
    sendJson(response, geminiResponse.status, {
      error: 'gemini_request_failed',
      detail: normalize(geminiJson?.error?.message, 240),
    }, origin)
    return
  }

  const answer = parseJsonText(extractGeminiText(geminiJson))
  sendJson(response, 200, {
    provider: 'gemini',
    model: GEMINI_MODEL,
    applied: true,
    answer: {
      overview: normalize(answer.overview, 140),
      answer: normalize(answer.answer, 180),
      summary: normalize(answer.summary, 360),
    },
  }, origin)
}

async function handleGeminiFollowUps(request, response, origin) {
  if (!isTrustedOrigin(origin)) {
    sendJson(response, 403, { error: 'origin_not_allowed' }, '')
    return
  }

  if (!checkRateLimit(request)) {
    sendJson(response, 429, { error: 'rate_limited' }, origin)
    return
  }

  const contentType = normalize(request.headers['content-type']).toLowerCase()
  if (!contentType.startsWith('application/json')) {
    sendJson(response, 415, { error: 'content_type_must_be_json' }, origin)
    return
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || /replace/i.test(apiKey)) {
    sendJson(response, 503, { error: 'gemini_api_key_missing' }, origin)
    return
  }

  let payload
  try {
    payload = JSON.parse(await readRequestBody(request))
  } catch (error) {
    sendJson(response, error?.message === 'request_too_large' ? 413 : 400, {
      error: error?.message || 'invalid_json',
    }, origin)
    return
  }

  if (!normalize(payload.query, MAX_QUERY_LENGTH)) {
    sendJson(response, 400, { error: 'query_required' }, origin)
    return
  }

  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: buildFollowUpPrompt(payload) }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 220,
          responseMimeType: 'application/json',
        },
      }),
    }
  )

  const geminiJson = await geminiResponse.json().catch(() => ({}))
  if (!geminiResponse.ok) {
    sendJson(response, geminiResponse.status, {
      error: 'gemini_request_failed',
      detail: normalize(geminiJson?.error?.message, 240),
    }, origin)
    return
  }

  const parsed = parseJsonText(extractGeminiText(geminiJson))
  const questions = (Array.isArray(parsed?.questions) ? parsed.questions : [])
    .slice(0, 3)
    .map((question, index) => ({
      id: normalize(question?.id, 48) || `question_${index + 1}`,
      title: normalize(question?.title, 96),
      options: (Array.isArray(question?.options) ? question.options : [])
        .slice(0, 3)
        .map((option, optionIndex) => ({
          id: normalize(option?.id, 48) || `option_${optionIndex + 1}`,
          label: normalize(option?.label || option, 64),
        }))
        .filter((option) => option.label),
    }))
    .filter((question) => question.title && question.options.length >= 2)

  sendJson(response, 200, {
    provider: 'gemini',
    model: GEMINI_MODEL,
    applied: Boolean(questions.length),
    questions,
  }, origin)
}

async function handleGeminiHistoryTitle(request, response, origin) {
  if (!isTrustedOrigin(origin)) {
    sendJson(response, 403, { error: 'origin_not_allowed' }, '')
    return
  }

  if (!checkRateLimit(request)) {
    sendJson(response, 429, { error: 'rate_limited' }, origin)
    return
  }

  const contentType = normalize(request.headers['content-type']).toLowerCase()
  if (!contentType.startsWith('application/json')) {
    sendJson(response, 415, { error: 'content_type_must_be_json' }, origin)
    return
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || /replace/i.test(apiKey)) {
    sendJson(response, 503, { error: 'gemini_api_key_missing' }, origin)
    return
  }

  let payload
  try {
    payload = JSON.parse(await readRequestBody(request))
  } catch (error) {
    sendJson(response, error?.message === 'request_too_large' ? 413 : 400, {
      error: error?.message || 'invalid_json',
    }, origin)
    return
  }

  if (!normalize(payload.query, MAX_QUERY_LENGTH)) {
    sendJson(response, 400, { error: 'query_required' }, origin)
    return
  }

  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: buildHistoryTitlePrompt(payload) }],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 48,
          responseMimeType: 'application/json',
        },
      }),
    }
  )

  const geminiJson = await geminiResponse.json().catch(() => ({}))
  if (!geminiResponse.ok) {
    sendJson(response, geminiResponse.status, {
      error: 'gemini_request_failed',
      detail: normalize(geminiJson?.error?.message, 240),
    }, origin)
    return
  }

  const parsed = parseJsonText(extractGeminiText(geminiJson))
  const title = normalize(parsed?.title, 56)
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/[?.!]+$/g, '')

  sendJson(response, 200, {
    provider: 'gemini',
    model: GEMINI_MODEL,
    applied: Boolean(title),
    title,
  }, origin)
}

async function serveStatic(request, response) {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)
  let pathname = '/'
  try {
    pathname = decodeURIComponent(url.pathname)
  } catch {
    response.writeHead(400, securityHeaders({ 'content-type': 'text/plain; charset=utf-8' }))
    response.end('Bad Request')
    return
  }
  const safePath = pathname === '/' ? '/index.html' : pathname
  const filePath = path.resolve(DIST_DIR, `.${safePath}`)
  const relative = path.relative(DIST_DIR, filePath)

  if (relative.startsWith('..') || path.isAbsolute(relative) || safePath.includes('\0')) {
    response.writeHead(403, securityHeaders({ 'content-type': 'text/plain; charset=utf-8' }))
    response.end('Forbidden')
    return
  }

  try {
    const content = await readFile(filePath)
    const extension = path.extname(filePath)
    response.writeHead(200, securityHeaders({
      'content-type': MIME_TYPES.get(extension) || 'application/octet-stream',
      'cache-control': pathname.startsWith('/assets/')
        ? 'public, max-age=31536000, immutable'
        : pathname === '/memact-extension.zip'
          ? 'public, max-age=300, must-revalidate'
          : 'no-cache',
    }))
    response.end(content)
  } catch {
    const index = await readFile(path.join(DIST_DIR, 'index.html'))
    response.writeHead(200, securityHeaders({
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-cache',
    }))
    response.end(index)
  }
}

const server = http.createServer(async (request, response) => {
  const origin = normalize(request.headers.origin)
  if (request.method === 'OPTIONS') {
    if (!isTrustedOrigin(origin)) {
      response.writeHead(403, securityHeaders({
        vary: 'origin',
      }))
      response.end()
      return
    }
    response.writeHead(204, securityHeaders({
      'access-control-allow-origin': origin,
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
      vary: 'origin',
    }))
    response.end()
    return
  }

  try {
    if (request.url?.startsWith('/api/gemini-answer') && request.method === 'POST') {
      await handleGeminiAnswer(request, response, origin)
      return
    }

    if (request.url?.startsWith('/api/gemini-followups') && request.method === 'POST') {
      await handleGeminiFollowUps(request, response, origin)
      return
    }

    if (request.url?.startsWith('/api/gemini-history-title') && request.method === 'POST') {
      await handleGeminiHistoryTitle(request, response, origin)
      return
    }

    if (request.method === 'GET' || request.method === 'HEAD') {
      await serveStatic(request, response)
      return
    }

    sendJson(response, 405, { error: 'method_not_allowed' }, origin)
  } catch (error) {
    sendJson(response, 500, { error: normalize(error?.message || error || 'server_error', 180) }, origin)
  }
})

server.listen(PORT, () => {
  console.log(`Memact server listening on http://localhost:${PORT}`)
})
