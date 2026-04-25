function normalizeLines(value) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
}

export default function MathRichText({ text, className = '', inline = false }) {
  const Tag = inline ? 'span' : 'div'
  const value = normalizeLines(text)
  const classes = [
    'math-rich-text',
    inline ? 'math-rich-text--inline' : 'math-rich-text--block',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Tag className={classes}>
      {value.split('\n').map((line, index, lines) => (
        <span key={`${index}-${line}`} className="math-rich-text__text">
          {line}
          {index < lines.length - 1 ? <br /> : null}
        </span>
      ))}
    </Tag>
  )
}
