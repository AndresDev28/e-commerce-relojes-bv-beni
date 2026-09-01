// Wiring-audit meta-test (capability C4.S5, spec #1688).
//
// Scans src for stray 127.0.0.1:1337 literals. Only two locations are allowed:
//   1. src/lib/images/url.ts — intentional hardcoded fallback in resolveBaseUrl
//   2. src/lib/api.ts — pre-existing tech debt, out of scope for PR1
//
// Any NEW occurrence fails the test, so a mapper that copy-pastes the
// literal again instead of routing through normalizeImageUrl is caught
// before it reaches review.

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ALLOWED_LITERALS = [
  'src/lib/images/url.ts', // intentional fallback in resolveBaseUrl
  'src/lib/api.ts', // out-of-scope tech debt (verified line 66)
  // PR2 targets — known stragglers that will be routed through normalizeImageUrl
  // in the next chained PR. Listed explicitly so the audit stays green
  // through PR1 and turns RED the moment a NEW stray appears.
  'src/app/tienda/[slug]/page.tsx',
  'src/features/favorites/services/normalizeFavorite.ts',
] as const;

function findLiterals(dir: string, matches: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry.startsWith('__tests__')) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) findLiterals(full, matches);
    else if (/\.(ts|tsx)$/.test(entry)) {
      const content = readFileSync(full, 'utf-8');
      if (content.includes('127.0.0.1:1337')) matches.push(full);
    }
  }
  return matches;
}

describe('wiring audit', () => {
  it('only allowlisted files contain 127.0.0.1:1337 literals', () => {
    const srcDir = join(process.cwd(), 'src');
    const matches = findLiterals(srcDir);
    const allowedSet = new Set(ALLOWED_LITERALS.map((a) => join(process.cwd(), a)));
    const unexpected = matches.filter((m) => !allowedSet.has(m));
    expect({ unexpected, total: matches.length }).toEqual({
      unexpected: [],
      total: ALLOWED_LITERALS.length,
    });
  });
});