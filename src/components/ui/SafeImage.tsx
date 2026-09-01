'use client'

/**
 * SafeImage — capability C2 (spec #1688).
 *
 * Thin wrapper around `next/image` that swaps the source to a central
 * placeholder if the upstream image fails to load (404, CORS, etc.).
 *
 * Why derived state instead of a `useState(normalized)` mirror?
 * -------------------------------------------------------------
 * A naive implementation pins `src` in state to trigger a re-render on
 * error. The mirror (`const [src, setSrc] = useState(normalized)`) does
 * not re-derive when the upstream `src` prop changes — the gallery would
 * keep showing the FIRST image even after the user picks a new one.
 *
 * The corrected pattern below derives `currentSrc` from `failedSrc` and
 * the *fresh* `normalized` value on every render, so a product swap
 * resets the failed-source tracking automatically. C2.S3 (no flip-flop)
 * holds because the second onError is a no-op state update.
 *
 * No useEffect → react-hooks/exhaustive-deps is trivially satisfied.
 */

import { useState } from 'react'
import Image, { type ImageProps } from 'next/image'

import { normalizeImageUrl } from '@/lib/images/url'
import { PLACEHOLDER_SRC } from '@/lib/images/url.constants'

type SafeImageProps = Omit<
  ImageProps,
  'src' | 'onError' | 'onLoad' | 'onLoadingComplete'
> & {
  src: string | null | undefined
  alt: string
}

export function SafeImage({ src, alt, ...rest }: SafeImageProps) {
  const normalized = normalizeImageUrl(src)
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const currentSrc = failedSrc === normalized ? PLACEHOLDER_SRC : normalized

  return (
    <Image
      {...rest}
      src={currentSrc}
      alt={alt}
      onError={() => setFailedSrc(normalized)}
    />
  )
}
