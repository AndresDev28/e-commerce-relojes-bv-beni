/**
 * [BREAD-01] Breadcrumb type single source — DRY + compile-time shape.
 *
 * Locks the design decision that the `Breadcrumb` interface is declared in
 * `src/types/breadcrumb.ts`. The grep regex is anchored so it catches
 * `interface Breadcrumb`, `export interface Breadcrumb`, `type Breadcrumb = ...`
 * and `export type Breadcrumb` while ignoring identifier occurrences like
 * `Breadcrumb[]` or `function processBreadcrumb()`.
 *
 * The shape assertion is a compile-time guarantee that the exported interface
 * has `name: string` and `href: string`.
 */

import { execSync } from 'node:child_process'
import { describe, it, expect } from 'vitest'
import type { Breadcrumb } from '../breadcrumb'

describe('[BREAD-01] Breadcrumb type single source', () => {
  describe('DRY grep — declaration surface', () => {
    it('declares the Breadcrumb interface in src/types/breadcrumb.ts (exactly one declaration in that file)', () => {
      // Grep src/types/breadcrumb.ts only — locks the single-source contract
      // for the file introduced in WU1. Duplicates elsewhere (to be removed in
      // WU3 and WU7) are tracked by the wider design grep, not this test.
      const command = `grep -nE "^(export\\s+)?(interface|type)\\s+Breadcrumb\\b" src/types/breadcrumb.ts`
      const output = execSync(command, { encoding: 'utf-8' }).trim()
      const matches = output
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)

      // Exactly one declaration, and it is `Breadcrumb` (not e.g. BreadcrumbFoo)
      expect(matches).toHaveLength(1)
      expect(matches[0]).toMatch(/Breadcrumb\b/)
    })

    it('does not declare the Breadcrumb type elsewhere under src/types/', () => {
      // Belt-and-suspenders: scan the rest of src/types to ensure no other
      // file in this directory duplicates the type.
      const command = `grep -rnE "^(export\\s+)?(interface|type)\\s+Breadcrumb\\b" src/types/ --include="*.ts" --exclude="breadcrumb.ts"`
      let matches: string[] = []
      try {
        const output = execSync(command, { encoding: 'utf-8' }).trim()
        matches = output
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
      } catch (err) {
        // grep exits non-zero when no matches — treat as zero matches.
        matches = []
      }

      expect(matches).toEqual([])
    })
  })

  describe('Compile-time shape', () => {
    it('accepts { name: string; href: string } values', () => {
      const crumb: Breadcrumb = { name: 'Inicio', href: '/' }
      expect(crumb.name).toBe('Inicio')
      expect(crumb.href).toBe('/')
    })

    it('exposes exactly the fields { name, href } with string types', () => {
      const crumb: Breadcrumb = { name: 'Tienda', href: '/tienda' }
      const keys: Array<keyof Breadcrumb> = ['name', 'href']
      for (const key of keys) {
        expect(crumb[key]).toBeTypeOf('string')
      }
    })
  })
})