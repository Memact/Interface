import React from "react"

export function CategoryGrid({ categories, selected, onToggle }) {
  const entries = Object.entries(categories || {})
  if (!entries.length) return <p className="muted">Activity category policy is loading.</p>
  return (
    <div className="category-grid">
      {entries.map(([category, definition]) => (
        <label key={category} className="scope-card category-card">
          <input
            type="checkbox"
            checked={selected.includes(category)}
            onChange={() => onToggle(category)}
          />
          <span>
            <strong>{definition.label || category}</strong>
            <small>{definition.description || category}</small>
          </span>
        </label>
      ))}
    </div>
  )
}
