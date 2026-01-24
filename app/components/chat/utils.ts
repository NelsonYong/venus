/**
 * Utility functions for message rendering
 */

// Parse HTML/SVG/Markdown code blocks from markdown text
export function parseHtmlCodeBlocks(text: string): Array<{
  type: 'text' | 'html' | 'svg' | 'markdown'
  content: string
  id?: string
  filename?: string
}> {
  const blocks: Array<{
    type: 'text' | 'html' | 'svg' | 'markdown'
    content: string
    id?: string
    filename?: string
  }> = []

  const regex = /```(html|svg|markdown|md)(?::([^\n]+))?\n([\s\S]*?)```/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const textContent = text.slice(lastIndex, match.index).trim()
      if (textContent) {
        blocks.push({ type: 'text', content: textContent })
      }
    }

    let blockType = match[1] as 'html' | 'svg' | 'markdown' | 'md'
    if (blockType === 'md') {
      blockType = 'markdown'
    }
    const filename = match[2]?.trim()
    const blockContent = match[3].trim()
    blocks.push({
      type: blockType as 'html' | 'svg' | 'markdown',
      content: blockContent,
      filename,
      id: `${blockType}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    })

    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    const textContent = text.slice(lastIndex).trim()
    if (textContent) {
      blocks.push({ type: 'text', content: textContent })
    }
  }

  if (blocks.length === 0 && text.trim()) {
    blocks.push({ type: 'text', content: text })
  }

  return blocks
}
