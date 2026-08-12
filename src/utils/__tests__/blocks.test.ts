/**
 * Unit tests for `blocksToMarkdown` (UXW-03).
 *
 * Converts a Strapi 5 blocks array into a markdown string consumed by
 * react-markdown on the product detail page. Covers every block type in the
 * design's conversion table plus the null/undefined/unsupported fallbacks.
 */

import { describe, it, expect } from 'vitest'
import { blocksToMarkdown } from '../blocks'
import type { StrapiBlock } from '@/types'

const text = (value: string, extra: Partial<StrapiBlock['children'][number]> = {}) => ({
  type: 'text',
  text: value,
  ...extra,
})

describe('blocksToMarkdown — block types', () => {
  it('converts a paragraph block to `text\\n\\n`', () => {
    const blocks: StrapiBlock[] = [
      { type: 'paragraph', children: [text('Hello world')] },
    ]
    expect(blocksToMarkdown(blocks)).toBe('Hello world\n\n')
  })

  it('preserves heading level with `#` markers', () => {
    const blocks: StrapiBlock[] = [
      { type: 'heading', level: 2, children: [text('Specs')] },
    ]
    expect(blocksToMarkdown(blocks)).toBe('## Specs\n\n')
  })

  it('converts an unordered list to `- item` lines with a trailing blank line', () => {
    const blocks: StrapiBlock[] = [
      {
        type: 'list',
        format: 'unordered',
        children: [
          { type: 'list-item', children: [text('Item 1')] },
          { type: 'list-item', children: [text('Item 2')] },
        ],
      },
    ]
    expect(blocksToMarkdown(blocks)).toBe('- Item 1\n- Item 2\n\n')
  })

  it('converts an ordered list to numbered lines', () => {
    const blocks: StrapiBlock[] = [
      {
        type: 'list',
        format: 'ordered',
        children: [
          { type: 'list-item', children: [text('First')] },
          { type: 'list-item', children: [text('Second')] },
        ],
      },
    ]
    expect(blocksToMarkdown(blocks)).toBe('1. First\n2. Second\n\n')
  })

  it('converts a quote block to a `> text` line', () => {
    const blocks: StrapiBlock[] = [
      { type: 'quote', children: [text('A timeless quote')] },
    ]
    expect(blocksToMarkdown(blocks)).toBe('> A timeless quote\n\n')
  })

  it('converts a code block to a fenced code block', () => {
    const blocks: StrapiBlock[] = [
      { type: 'code', children: [text('const x = 1')] },
    ]
    expect(blocksToMarkdown(blocks)).toBe('```\nconst x = 1\n```\n\n')
  })

  it('flattens children text for unsupported block types (never throws)', () => {
    const blocks: StrapiBlock[] = [
      { type: 'image', children: [text('Alt text')] },
    ]
    expect(blocksToMarkdown(blocks)).toBe('Alt text')
  })
})

describe('blocksToMarkdown — inline formatting', () => {
  it('wraps bold text with `**`', () => {
    const blocks: StrapiBlock[] = [
      { type: 'paragraph', children: [text('Bold', { bold: true })] },
    ]
    expect(blocksToMarkdown(blocks)).toBe('**Bold**\n\n')
  })

  it('wraps italic text with `*`', () => {
    const blocks: StrapiBlock[] = [
      { type: 'paragraph', children: [text('Italic', { italic: true })] },
    ]
    expect(blocksToMarkdown(blocks)).toBe('*Italic*\n\n')
  })

  it('wraps strikethrough text with `~~`', () => {
    const blocks: StrapiBlock[] = [
      {
        type: 'paragraph',
        children: [text('Strike', { strikethrough: true })],
      },
    ]
    expect(blocksToMarkdown(blocks)).toBe('~~Strike~~\n\n')
  })

  it('wraps inline code with backticks', () => {
    const blocks: StrapiBlock[] = [
      { type: 'paragraph', children: [text('code', { code: true })] },
    ]
    expect(blocksToMarkdown(blocks)).toBe('`code`\n\n')
  })

  it('converts a link child to `[text](url)`', () => {
    const blocks: StrapiBlock[] = [
      {
        type: 'paragraph',
        children: [
          {
            type: 'link',
            url: 'https://example.com',
            children: [{ type: 'text', text: 'Example' }],
          },
        ],
      },
    ]
    expect(blocksToMarkdown(blocks)).toBe(
      '[Example](https://example.com)\n\n',
    )
  })

  it('combines bold and italic into `***text***`', () => {
    const blocks: StrapiBlock[] = [
      {
        type: 'paragraph',
        children: [text('Both', { bold: true, italic: true })],
      },
    ]
    expect(blocksToMarkdown(blocks)).toBe('***Both***\n\n')
  })
})

describe('blocksToMarkdown — empty / nullish input', () => {
  it('returns an empty string for an empty array', () => {
    expect(blocksToMarkdown([])).toBe('')
  })

  it('returns an empty string for null', () => {
    expect(blocksToMarkdown(null)).toBe('')
  })

  it('returns an empty string for undefined', () => {
    expect(blocksToMarkdown(undefined)).toBe('')
  })
})
