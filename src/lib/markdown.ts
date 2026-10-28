// Minimal safe Markdown renderer: escapes HTML first, then applies a small
// subset of Markdown transformations. No raw HTML passthrough.
function escapeHtml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function renderMarkdown(src: string): string {
  const escaped = escapeHtml(src.replace(/\r\n/g, '\n'))
  const blocks = escaped.split(/\n{2,}/)
  const html = blocks.map((block) => {
    const lines = block.split('\n')
    if (/^###\s/.test(lines[0])) return `<h3>${inline(lines.join(' ').replace(/^###\s/, ''))}</h3>`
    if (/^##\s/.test(lines[0])) return `<h2>${inline(lines.join(' ').replace(/^##\s/, ''))}</h2>`
    if (/^#\s/.test(lines[0])) return `<h1>${inline(lines.join(' ').replace(/^#\s/, ''))}</h1>`
    if (/^[-*]\s/m.test(block)) {
      const items = lines.filter((l) => /^[-*]\s/.test(l)).map((l) => `<li>${inline(l.replace(/^[-*]\s/, ''))}</li>`).join('')
      return `<ul>${items}</ul>`
    }
    if (/^\d+\.\s/m.test(block)) {
      const items = lines.filter((l) => /^\d+\.\s/.test(l)).map((l) => `<li>${inline(l.replace(/^\d+\.\s/, ''))}</li>`).join('')
      return `<ol>${items}</ol>`
    }
    if (/^>\s?/m.test(block)) return `<blockquote>${inline(lines.map((l) => l.replace(/^>\s?/, '')).join(' '))}</blockquote>`
    return `<p>${inline(lines.join('<br/>'))}</p>`
  }).join('')
  return html
}

function inline(text: string) {
  return text
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" rel="noopener noreferrer" target="_blank">$1</a>')
}
