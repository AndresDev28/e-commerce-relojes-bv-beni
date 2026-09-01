/**
 * Image URL normalization (capability C1, spec #1688).
 *
 * Pure helper used by every catalog mapper and (PR2) by SafeImage.
 * Centralizes the decision tree so the codebase stops scattering
 * `127.0.0.1:1337` literals.
 *
 * Rules:
 *   1. null | '' | whitespace-only         → PLACEHOLDER_SRC
 *   2. /^(https?|data):/i                  → pass through (idempotent)
 *   3. /^(javascript|file|vbscript):/i     → PLACEHOLDER_SRC (security)
 *   4. startsWith('/uploads')              → `${base}${path}`
 *   5. startsWith('uploads/')              → `${base}/${path}` (leading slash added)
 *   6. other root-relative ('/images/…')   → pass through (same-origin asset)
 *   7. anything else                       → PLACEHOLDER_SRC
 *
 * `resolveBaseUrl` reads `API_URL` at call time (mirrors
 * `normalizeFavorite.ts:43-50`) so a `vi.mock('@/lib/constants')` always wins
 * over env vars — the contract established by #1677.
 */

import { API_URL } from '@/lib/constants';
import { PLACEHOLDER_SRC } from './url.constants';

function resolveBaseUrl(): string {
  return (
    API_URL ||
    process.env.NEXT_PUBLIC_STRAPI_API_URL ||
    process.env.STRAPI_API_URL ||
    'http://127.0.0.1:1337'
  ).replace(/\/+$/, '');
}

export function normalizeImageUrl(input: string | null | undefined): string {
  if (!input) return PLACEHOLDER_SRC;

  const trimmed = input.trim();
  if (trimmed === '') return PLACEHOLDER_SRC;

  // Rule 2: absolute http(s) and data: URIs pass through unchanged.
  if (/^(https?:|data:)/i.test(trimmed)) return trimmed;

  // Rule 3: dangerous schemes never reach a DOM src attribute.
  if (/^(javascript:|file:|vbscript:)/i.test(trimmed)) return PLACEHOLDER_SRC;

  // Rules 4 & 5: relative uploads paths get the API base prefix.
  if (/^uploads\//i.test(trimmed)) {
    return `${resolveBaseUrl()}/${trimmed}`;
  }
  if (trimmed.startsWith('/uploads')) {
    return `${resolveBaseUrl()}${trimmed}`;
  }

  // Rule 6: other root-relative paths are same-origin assets — pass through.
  if (trimmed.startsWith('/')) return trimmed;

  // Rule 7: anything else is garbage.
  return PLACEHOLDER_SRC;
}