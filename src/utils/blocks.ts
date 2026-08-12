/**
 * Converts a Strapi 5 rich-text blocks array into a markdown string.
 *
 * Single choke point between the raw Strapi payload and the react-markdown
 * renderer on the product detail page. Pure function: same input → same
 * output, no I/O, no shared mutable state.
 */

import type { StrapiBlock, StrapiBlockChild } from '@/types'

/**
 * Render a single inline child node to its markdown fragment.
 *
 * Link children (`type: 'link'`) carry their text in `children` and their
 * destination in `url`. Everything else reads `text` and applies the
 * formatting flags (bold, italic, strikethrough, code).
 */
function renderInline(child: StrapiBlockChild): string {
  let text = child.text ?? ''

  // Link nodes nest their label inside `children`.
  if (child.children && child.children.length > 0) {
    const nested = child.children.map((c) => c.text ?? '').join('')
    if (!text) text = nested
  }

  if (child.type === 'link' && child.url) {
    return `[${text}](${child.url})`
  }

  if (child.code) text = `\`${text}\``
  if (child.bold) text = `**${text}**`
  if (child.italic) text = `*${text}*`
  if (child.strikethrough) text = `~~${text}~~`

  return text
}

/**
 * Render a single block to its markdown fragment (with trailing blank line
 * where the markdown syntax requires a block break).
 */
function renderBlock(block: StrapiBlock): string {
  switch (block.type) {
    case 'paragraph': {
      const text = block.children.map(renderInline).join('')
      return `${text}\n\n`
    }
    case 'heading': {
      const level = block.level ?? 1
      const text = block.children.map(renderInline).join('')
      return `${'#'.repeat(level)} ${text}\n\n`
    }
    case 'list': {
      const ordered = block.format === 'ordered'
      const items = block.children
        .filter((child) => child.type === 'list-item')
        .map((item, index) => {
          const text = (item.children ?? []).map(renderInline).join('')
          return ordered ? `${index + 1}. ${text}` : `- ${text}`
        })
      return `${items.join('\n')}\n\n`
    }
    case 'quote': {
      const text = block.children.map(renderInline).join('')
      return `> ${text}\n\n`
    }
    case 'code': {
      const text = block.children.map((child) => child.text ?? '').join('')
      return `\`\`\`\n${text}\n\`\`\`\n\n`
    }
    default: {
      // Unknown block type: flatten its children text rather than throwing.
      return block.children.map(renderInline).join('')
    }
  }
}

/**
 * Convert a Strapi blocks array (or null/undefined) into a markdown string.
 *
 * @param blocks - The Strapi 5 `description` blocks array.
 * @returns A markdown string, or `''` for nullish/empty input.
 */
export function blocksToMarkdown(
  blocks: StrapiBlock[] | null | undefined,
): string {
  if (!blocks) return ''
  return blocks.map(renderBlock).join('')
}
