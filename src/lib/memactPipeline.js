import { analyzeCaptureSnapshot } from "../../../inference/src/engine.mjs"
import { detectSchemas } from "../../../schema/src/engine.mjs"
import { detectOriginCandidates } from "../../../origin/src/engine.mjs"
import { analyzeInfluenceSnapshot } from "../../../influence/src/engine.mjs"

function normalize(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function titleCase(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function tokenize(value) {
  return normalize(value)
    .toLowerCase()
    .replace(/[^a-z0-9@#./+-]+/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 3)
}

function intersects(left = [], right = []) {
  const rightSet = new Set((Array.isArray(right) ? right : []).map((value) => normalize(value).toLowerCase()))
  return (Array.isArray(left) ? left : []).some((value) => rightSet.has(normalize(value).toLowerCase()))
}

function countActivityTokens(records = []) {
  const counts = new Map()
  for (const record of Array.isArray(records) ? records : []) {
    for (const token of tokenize([record?.source_label, ...(record?.canonical_themes || [])].join(' '))) {
      counts.set(token, (counts.get(token) || 0) + 1)
    }
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 8)
}

function schemaPrompt(schema) {
  const label = normalize(schema?.label || schema?.id)
  if (!label) return ''
  return `Why does this keep showing up around ${label.toLowerCase()}?`
}

function influencePrompt(chain) {
  const from = normalize(chain?.from_human_label || chain?.from_label || chain?.from)
  const to = normalize(chain?.to_human_label || chain?.to_label || chain?.to)
  if (!from || !to) return ''
  return `How did ${from.toLowerCase()} keep pulling me toward ${to.toLowerCase()}?`
}

export function buildMemactKnowledge(snapshot) {
  const safeSnapshot = snapshot && typeof snapshot === 'object' ? snapshot : { events: [], sessions: [], activities: [] }
  const inference = analyzeCaptureSnapshot(safeSnapshot)
  const schema = detectSchemas(inference, { minSupport: 2 })
  const influence = analyzeInfluenceSnapshot(safeSnapshot, {
    minCount: 2,
    minSourceCount: 2,
    minTrajectoryCount: 2,
    topN: 4,
    topThemes: 4,
    topTrajectories: 3,
    topDrift: 2,
    topFormations: 2,
  })

  const suggestionSeed = []
  const seen = new Set()

  for (const item of schema.schemas || []) {
    const completion = schemaPrompt(item)
    const key = completion.toLowerCase()
    if (!completion || seen.has(key)) continue
    seen.add(key)
    suggestionSeed.push({
      id: `schema-${item.id}`,
      category: item.state_label || 'Schema signal',
      title: completion,
      subtitle: item.summary || 'Repeated pattern forming from captured activity.',
      completion,
    })
  }

  for (const item of influence.valid_chains || []) {
    const completion = influencePrompt(item)
    const key = completion.toLowerCase()
    if (!completion || seen.has(key)) continue
    seen.add(key)
    suggestionSeed.push({
      id: `influence-${item.from}-${item.to}`,
      category: 'Influence pattern',
      title: completion,
      subtitle: item.summary || 'Repeated directional pattern in captured activity.',
      completion,
    })
  }

  for (const [theme, count] of countActivityTokens(inference.records)) {
    const completion = `What kept reinforcing ${theme}?`
    const key = completion.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    suggestionSeed.push({
      id: `theme-${theme}`,
      category: 'Activity theme',
      title: completion,
      subtitle: `${count} captured records touched this theme.`,
      completion,
    })
  }

  return {
    snapshot: safeSnapshot,
    inference,
    schema,
    influence,
    suggestionSeed: suggestionSeed.slice(0, 12),
    stats: {
      eventCount: Number(safeSnapshot?.counts?.events || safeSnapshot?.events?.length || 0),
      activityCount: Number(safeSnapshot?.counts?.activities || safeSnapshot?.activities?.length || 0),
      schemaCount: Number(schema.schemas?.length || 0),
      influenceCount: Number(influence.valid_chains?.length || 0),
    },
  }
}

function buildOriginSummary(query, origin) {
  const primary = origin.candidates?.[0]
  if (!primary) {
    return ''
  }

  const source = normalize(primary?.sources?.[0]?.title || primary?.sources?.[0]?.domain || primary?.source_label)
  if (!source) {
    return `Memact found a direct wording match around "${query}".`
  }

  return `Memact found a strong source candidate around ${source}.`
}

function buildInfluenceSummary(relevantChains) {
  const primary = relevantChains[0]
  if (!primary) {
    return ''
  }

  const from = normalize(primary.from_human_label || primary.from_label || primary.from)
  const to = normalize(primary.to_human_label || primary.to_label || primary.to)
  if (!from || !to) {
    return ''
  }

  return `A repeated pattern also shows movement from ${from.toLowerCase()} toward ${to.toLowerCase()}.`
}

function buildSchemaSummary(relevantSchemas) {
  const primary = relevantSchemas[0]
  if (!primary) {
    return ''
  }

  const label = normalize(primary.label || primary.id)
  if (!label) {
    return ''
  }

  return `${label} is showing up as a ${normalize(primary.state_label || 'schema signal').toLowerCase()}.`
}

function buildRelatedQueries(origin, relevantSchemas, relevantChains) {
  const items = []
  const seen = new Set()
  const push = (value) => {
    const query = normalize(value)
    if (!query || seen.has(query.toLowerCase())) return
    seen.add(query.toLowerCase())
    items.push(query)
  }

  for (const candidate of origin.candidates || []) {
    const source = normalize(candidate?.sources?.[0]?.title || candidate?.source_label)
    if (source) {
      push(`Where did I first pick up "${source}"?`)
    }
  }

  for (const schema of relevantSchemas || []) {
    push(schemaPrompt(schema))
  }

  for (const chain of relevantChains || []) {
    push(influencePrompt(chain))
  }

  return items.slice(0, 6)
}

function relevantSchemaSignals(origin, schemaResult) {
  const themes = new Set((origin.candidates || []).flatMap((candidate) => candidate.canonical_themes || []))
  if (!themes.size) {
    return (schemaResult.schemas || []).slice(0, 2)
  }
  return (schemaResult.schemas || [])
    .filter((schema) => intersects(schema.matched_themes, [...themes]))
    .slice(0, 2)
}

function relevantInfluenceSignals(query, origin, influenceResult) {
  const themeSet = new Set((origin.candidates || []).flatMap((candidate) => candidate.canonical_themes || []))
  const queryTokens = new Set(tokenize(query))

  return (influenceResult.valid_chains || [])
    .filter((chain) => {
      if (themeSet.size && (themeSet.has(chain.from) || themeSet.has(chain.to))) {
        return true
      }
      const haystack = tokenize(
        [
          chain.from,
          chain.to,
          chain.from_label,
          chain.to_label,
          ...(chain.from_examples || []),
          ...(chain.to_examples || []),
        ].join(' ')
      )
      return haystack.some((token) => queryTokens.has(token))
    })
    .slice(0, 2)
}

export function analyzeThoughtQuery(query, knowledge) {
  const normalizedQuery = normalize(query)
  if (!normalizedQuery || !knowledge?.inference) {
    return {
      origin: null,
      relevantSchemas: [],
      relevantInfluence: [],
      answer: null,
    }
  }

  const origin = detectOriginCandidates(normalizedQuery, knowledge.inference, {
    minScore: 0.18,
    top: 4,
  })
  const relevantSchemas = relevantSchemaSignals(origin, knowledge.schema || {})
  const relevantInfluence = relevantInfluenceSignals(normalizedQuery, origin, knowledge.influence || {})

  const summaryParts = [
    buildOriginSummary(normalizedQuery, origin),
    buildInfluenceSummary(relevantInfluence),
    buildSchemaSummary(relevantSchemas),
  ].filter(Boolean)

  const summary =
    summaryParts.join(' ') ||
    'Memact did not find enough repeated evidence yet to explain this thought clearly.'

  const detailItems = [
    { label: 'Origin matches', value: String(origin.candidates?.length || 0) },
    { label: 'Schema signals', value: String(relevantSchemas.length) },
    { label: 'Influence patterns', value: String(relevantInfluence.length) },
    { label: 'Captured events', value: String(knowledge.stats?.eventCount || 0) },
  ]

  const signals = [
    ...relevantSchemas.map((item) => `${item.label} (${item.state_label || 'schema signal'})`),
    ...relevantInfluence.map((item) => `${titleCase(item.from)} -> ${titleCase(item.to)} (${item.count})`),
  ].slice(0, 6)

  return {
    origin,
    relevantSchemas,
    relevantInfluence,
    answer: {
      overview: origin.candidates?.length
        ? `Memact found source candidates around "${normalizedQuery}".`
        : `Memact checked captured activity for "${normalizedQuery}".`,
      answer: normalizedQuery,
      summary,
      detailsLabel: 'Evidence around this thought',
      detailItems,
      signals,
      sessionSummary: summary,
      sessionPrompts: buildRelatedQueries(origin, relevantSchemas, relevantInfluence),
      relatedQueries: buildRelatedQueries(origin, relevantSchemas, relevantInfluence),
      originCandidates: (origin.candidates || []).map((candidate) => ({
        id: candidate.id,
        source_label: candidate.source_label,
        score: candidate.score,
        overlapping_terms: candidate.overlapping_terms,
      })),
      schemaSignals: relevantSchemas.map((schema) => ({
        id: schema.id,
        label: schema.label,
        state: schema.state,
      })),
      influenceSignals: relevantInfluence.map((chain) => ({
        from: chain.from,
        to: chain.to,
        count: chain.count,
        confidence: chain.confidence,
      })),
    },
  }
}
