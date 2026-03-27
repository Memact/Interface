function formatTime(value) {
  if (!value) return ''
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value))
  } catch {
    return value
  }
}

export default function EpisodeGraph({ memory }) {
  if (!memory) return null

  const parts = [
    memory.application,
    memory.domain,
    memory.interactionType,
    memory.session?.label || memory.session_label,
    formatTime(memory.occurred_at),
  ].filter(Boolean)

  if (!parts.length) return null

  return (
    <div className="episode-graph" aria-label="Memory context">
      <div className="episode-graph__nodes">
        {parts.slice(0, 4).map((part, index) => (
          <span key={`${part}-${index}`} className="episode-node">
            {part}
          </span>
        ))}
      </div>
    </div>
  )
}
