const SMOLLM_MODEL_ID = 'HuggingFaceTB/SmolLM2-135M-Instruct'
const ANSWER_CACHE = new Map()
const MAX_CACHE_ENTRIES = 32
const generatorsByDevice = new Map()
const failedDevices = new Set()

function normalize(value, maxLength = 0) {
  const text = String(value || '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!text) {
    return ''
  }

  if (maxLength && text.length > maxLength) {
    return `${text.slice(0, maxLength - 3).trim()}...`
  }

  return text
}

function trimCache() {
  while (ANSWER_CACHE.size > MAX_CACHE_ENTRIES) {
    const firstKey = ANSWER_CACHE.keys().next().value
    ANSWER_CACHE.delete(firstKey)
  }
}

function normalizeLabel(value) {
  return normalize(value)
    .replace(/^results?\s+for\s+/i, '')
    .replace(/^local results?\s+for\s+/i, '')
    .replace(/^activity from\s+/i, '')
}

function buildCacheKey({ query, answerMeta, result }) {
  return JSON.stringify([
    normalize(query, 180),
    normalize(answerMeta?.overview, 180),
    normalize(answerMeta?.answer, 180),
    normalize(answerMeta?.summary, 320),
    normalize(result?.title, 180),
    normalize(result?.domain, 120),
    normalize(result?.application, 80),
    normalize(result?.pageTypeLabel || result?.pageType, 80),
    normalize(result?.graphSummary, 180),
  ])
}

function extractAssistantText(output) {
  if (!output) {
    return ''
  }

  const first = Array.isArray(output) ? output[0] : output
  const generated = first?.generated_text

  if (Array.isArray(generated)) {
    const lastMessage = [...generated].reverse().find((entry) => entry?.role === 'assistant')
    return normalize(lastMessage?.content, 1000)
  }

  return normalize(generated, 1000)
}

function extractJsonObject(text) {
  const candidate = String(text || '')
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    return null
  }

  try {
    return JSON.parse(candidate.slice(start, end + 1))
  } catch {
    return null
  }
}

function quotedValues(text) {
  return Array.from(String(text || '').matchAll(/"([^"]+)"/g), (match) => normalize(match[1]))
}

function numericValues(text) {
  return Array.from(String(text || '').matchAll(/\b\d+\b/g), (match) => match[0])
}

function tokenValues(text) {
  return normalize(text)
    .toLowerCase()
    .split(/[^a-z0-9.+#/-]+/)
    .filter((token) => token.length >= 2)
}

function includesAllTokens(candidate, tokens) {
  const lowered = normalize(candidate).toLowerCase()
  return tokens.every((token) => lowered.includes(String(token).toLowerCase()))
}

function clampSentence(value, maxLength) {
  const normalized = normalize(value, maxLength)
    .replace(/^["'`]+|["'`]+$/g, '')
    .trim()

  if (!normalized) {
    return ''
  }

  return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`
}

function cleanHeading(value, maxLength = 140) {
  return normalize(value, maxLength)
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/\.$/, '')
    .trim()
}

function isBannedText(value) {
  return /^(here('| i)?s|i rewrote|rewritten|note:|explanation:|cannot|sorry)/i.test(
    normalize(value)
  )
}

function validateOverview(candidate, fallback, query) {
  const heading = cleanHeading(candidate, 120)
  if (!heading || isBannedText(heading) || heading.length < 8) {
    return cleanHeading(fallback, 120)
  }

  const quotedQuery = quotedValues(query)
  if (quotedQuery.length && !includesAllTokens(heading, quotedQuery)) {
    return cleanHeading(fallback, 120)
  }

  return heading
}

function validateAnswer(candidate, fallback, result) {
  const answer = cleanHeading(candidate, 180)
  if (!answer || isBannedText(answer) || answer.length < 4) {
    return cleanHeading(fallback || result?.title, 180)
  }

  const importantQuotedValues = [
    ...quotedValues(fallback),
    ...quotedValues(result?.title),
  ].filter(Boolean)

  if (importantQuotedValues.length && !includesAllTokens(answer, importantQuotedValues)) {
    return cleanHeading(fallback || result?.title, 180)
  }

  const fallbackTokens = tokenValues(fallback || result?.title).filter((token) => token.length >= 4)
  if (fallbackTokens.length >= 2) {
    const minimumHits = Math.min(2, fallbackTokens.length)
    const candidateHits = fallbackTokens.reduce(
      (total, token) => total + (answer.toLowerCase().includes(token) ? 1 : 0),
      0
    )
    if (candidateHits < minimumHits) {
      return cleanHeading(fallback || result?.title, 180)
    }
  }

  return answer
}

function validateSummary(candidate, fallback, result) {
  const sentence = clampSentence(candidate, 320)
  if (!sentence || isBannedText(sentence) || sentence.length < 18) {
    return clampSentence(fallback, 320)
  }

  const importantQuotedValues = [
    ...quotedValues(fallback),
    ...quotedValues(result?.title),
  ].filter(Boolean)
  if (importantQuotedValues.length && !includesAllTokens(sentence, importantQuotedValues)) {
    return clampSentence(fallback, 320)
  }

  const importantNumbers = [
    ...numericValues(fallback),
    ...numericValues(result?.structuredSummary),
    ...numericValues(result?.graphSummary),
  ].filter(Boolean)
  if (importantNumbers.length && !includesAllTokens(sentence, importantNumbers)) {
    return clampSentence(fallback, 320)
  }

  return sentence
}

function buildMessages({ query, answerMeta, result }) {
  const detailLines = Array.isArray(answerMeta?.detailItems)
    ? answerMeta.detailItems
        .map((item) => `${normalize(item?.label, 40)}: ${normalize(item?.value, 100)}`)
        .filter(Boolean)
        .join('\n')
    : ''

  return [
    {
      role: 'system',
      content:
        'You structure answer cards for a local memory search app. Use only the provided facts. Do not invent or change names, counts, dates, apps, sites, or quoted queries. Return strict minified JSON with exactly these string keys: overview, answer, summary. overview should be a concise heading. answer should be the precise main answer label. summary should be one or two short sentences.',
    },
    {
      role: 'user',
      content: [
        `Query: ${normalize(query, 160) || 'Local search'}`,
        `Current overview: ${normalize(answerMeta?.overview, 180) || 'Local results'}`,
        `Current answer: ${normalize(answerMeta?.answer, 180) || normalize(result?.title, 180) || 'Local memory'}`,
        `Current summary: ${normalize(answerMeta?.summary, 320) || 'Showing local results.'}`,
        `Top result title: ${normalize(result?.title, 180) || 'Local memory'}`,
        `Top result site: ${normalize(result?.domain, 120) || 'Unknown site'}`,
        `Top result app: ${normalize(result?.application, 80) || 'Browser'}`,
        `Top result type: ${normalize(result?.pageTypeLabel || result?.pageType, 80) || 'Web page'}`,
        `Top result structured summary: ${normalize(result?.structuredSummary, 220) || 'Not available'}`,
        `Connected activity summary: ${normalize(result?.graphSummary, 180) || 'None'}`,
        detailLines ? `Evidence details:\n${detailLines}` : 'Evidence details: None',
        'Return only JSON.',
      ].join('\n'),
    },
  ]
}

async function createGenerator(device) {
  const { pipeline, env } = await import('@xenova/transformers')
  env.allowRemoteModels = true
  env.useBrowserCache = true

  if (device === 'webgpu') {
    return pipeline('text-generation', SMOLLM_MODEL_ID, {
      device: 'webgpu',
      dtype: 'q4',
    })
  }

  return pipeline('text-generation', SMOLLM_MODEL_ID, {
    device: 'wasm',
  })
}

async function getGenerator(environment) {
  const preferredDevice = environment?.localLanguageModelDevice === 'webgpu' ? 'webgpu' : 'wasm'
  const devices = preferredDevice === 'webgpu' ? ['webgpu', 'wasm'] : ['wasm', 'webgpu']

  for (const device of devices) {
    if (failedDevices.has(device)) {
      continue
    }

    if (!generatorsByDevice.has(device)) {
      generatorsByDevice.set(
        device,
        createGenerator(device).catch((error) => {
          failedDevices.add(device)
          generatorsByDevice.delete(device)
          console.warn(`Memact local language model is unavailable on ${device}.`, error)
          return null
        })
      )
    }

    const generator = await generatorsByDevice.get(device)
    if (generator) {
      return { generator, device }
    }
  }

  return { generator: null, device: '' }
}

export function supportsLocalLanguageModel(environment) {
  return Boolean(environment?.localLanguageModelSupported)
}

export async function structureAnswerMeta({ query, answerMeta, results, environment }) {
  const primaryResult = results?.[0]
  if (!supportsLocalLanguageModel(environment) || !answerMeta || !primaryResult) {
    return null
  }

  const fallback = {
    overview: cleanHeading(answerMeta.overview, 120) || `Results for "${normalize(query, 72)}"`,
    answer: cleanHeading(answerMeta.answer || primaryResult.title, 180) || 'Local memory',
    summary: clampSentence(answerMeta.summary, 320) || 'Showing local results.',
  }

  const cacheKey = buildCacheKey({ query, answerMeta: fallback, result: primaryResult })
  if (ANSWER_CACHE.has(cacheKey)) {
    return ANSWER_CACHE.get(cacheKey)
  }

  const { generator, device } = await getGenerator(environment)
  if (!generator) {
    return {
      ...fallback,
      model: SMOLLM_MODEL_ID,
      device: '',
      applied: false,
    }
  }

  try {
    const output = await generator(buildMessages({ query, answerMeta: fallback, result: primaryResult }), {
      max_new_tokens: 140,
      do_sample: false,
      repetition_penalty: 1.05,
    })

    const candidate = extractJsonObject(extractAssistantText(output))
    const response = {
      overview: validateOverview(candidate?.overview, fallback.overview, query),
      answer: validateAnswer(candidate?.answer, fallback.answer, primaryResult),
      summary: validateSummary(candidate?.summary, fallback.summary, primaryResult),
      model: SMOLLM_MODEL_ID,
      device,
      applied: Boolean(candidate),
    }

    ANSWER_CACHE.set(cacheKey, response)
    trimCache()
    return response
  } catch (error) {
    console.warn('Memact structured local answer generation failed.', error)
    return {
      ...fallback,
      model: SMOLLM_MODEL_ID,
      device,
      applied: false,
    }
  }
}
