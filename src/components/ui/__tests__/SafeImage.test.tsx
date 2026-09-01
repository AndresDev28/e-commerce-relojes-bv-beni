/**
 * Tests for SafeImage (capability C2, spec #1688).
 *
 * SafeImage wraps next/image so a broken `src` falls back to the central
 * placeholder via onError. These tests verify:
 *   C2.S1 — valid src renders unchanged
 *   C2.S2 — onError swaps src to PLACEHOLDER_SRC
 *   C2.S3 — subsequent onError does not flip-flop (idempotent fallback)
 *   C2.S4 — alt is preserved across the swap
 *
 * IMPORTANT: we deliberately do NOT blanket-mock next/image. SafeImage
 * declares `src: string | null | undefined`, so a `null`/`undefined` input
 * must normalize to the placeholder at render time (no onError needed).
 * Mocking next/image would hide that branch. We render the actual <Image>
 * and use fireEvent.error on the underlying <img> element so the real
 * React tree fires onError and the parent's setState runs.
 *
 * Note on assertions: `next/image` rewrites the rendered <img> src to an
 * absolute URL (jsdom's window.location.origin) or to its optimizer URL,
 * so we assert the placeholder PATH appears in the rendered src rather
 * than byte-equal equality.
 */

import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SafeImage } from '@/components/ui/SafeImage'
import { PLACEHOLDER_SRC } from '@/lib/images/url.constants'

// Inline data URI — avoids any network call so the test is hermetic.
// A 1x1 transparent PNG.
const TINY_PNG_DATA_URI =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

describe('SafeImage — capability C2', () => {
  it('C2.S1 — renders a valid src unchanged', () => {
    render(<SafeImage src={TINY_PNG_DATA_URI} alt="A watch" width={64} height={64} />)

    const img = screen.getByAltText('A watch')
    // next/image forwards src to <img> as-is for absolute/data URLs in jsdom.
    expect(img.getAttribute('src')).toBe(TINY_PNG_DATA_URI)
  })

  it('C2.S2 — onError swaps src to PLACEHOLDER_SRC', () => {
    render(<SafeImage src={TINY_PNG_DATA_URI} alt="Broken" width={64} height={64} />)

    const img = screen.getByAltText('Broken')
    expect(img.getAttribute('src')).toBe(TINY_PNG_DATA_URI)

    // Simulate the browser firing the error event on the rendered <img>.
    fireEvent.error(img)

    // After the error swap, src must point at the canonical placeholder.
    // next/image rewrites the rendered src to an absolute URL (or its
    // optimizer URL), so we assert the path is present.
    expect(img.getAttribute('src')).toContain(PLACEHOLDER_SRC)
  })

  it('C2.S3 — subsequent onError does not flip-flop (idempotent)', () => {
    render(<SafeImage src={TINY_PNG_DATA_URI} alt="Stable" width={64} height={64} />)

    const img = screen.getByAltText('Stable')

    fireEvent.error(img)
    expect(img.getAttribute('src')).toContain(PLACEHOLDER_SRC)

    // Second error event must NOT swap back to the original src.
    // React bails on identical state updates, so the placeholder stays put.
    fireEvent.error(img)
    expect(img.getAttribute('src')).toContain(PLACEHOLDER_SRC)
    // And explicitly: it must NOT be the original data URI anymore.
    expect(img.getAttribute('src')).not.toBe(TINY_PNG_DATA_URI)
  })

  it('C2.S4 — alt is preserved across the onError swap', () => {
    render(<SafeImage src={TINY_PNG_DATA_URI} alt="Rolex Submariner" width={64} height={64} />)

    const img = screen.getByAltText('Rolex Submariner')
    fireEvent.error(img)

    // alt is preserved so screen readers keep announcing the real product name
    // even when the image fails over to the placeholder SVG.
    expect(img).toHaveAttribute('alt', 'Rolex Submariner')
    expect(img.getAttribute('src')).toContain(PLACEHOLDER_SRC)
  })

  it('renders the placeholder immediately when src is null (no onError needed)', () => {
    // Defensive contract: SafeImage accepts `src: string | null | undefined`.
    // The normalize step must produce PLACEHOLDER_SRC at render time so the
    // layout does not shift after a network error.
    render(<SafeImage src={null} alt="No image" width={64} height={64} />)

    const img = screen.getByAltText('No image')
    expect(img.getAttribute('src')).toContain(PLACEHOLDER_SRC)
  })
})
