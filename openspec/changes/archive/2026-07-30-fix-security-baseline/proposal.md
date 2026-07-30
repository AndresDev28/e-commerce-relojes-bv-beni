# Proposal: fix-security-baseline (DEBT-10)

## Intent

Close the remaining auto-fixable development-dependency security baseline identified as roadmap item #1 (Engram #1402). This prevents future PRs from repeatedly fighting the same npm audit findings and preserves the mandatory green Trivy gate.

## Scope

### In Scope
- `vitest`, `@vitest/browser`, `@vitest/coverage-v8`: `^3.2.4` → `^3.2.7`.
- Overrides: `"js-yaml": "^4.3.0"` and `"@babel/core": "^7.29.7"`.
- `package.json` updates with alphabetically merged overrides and `package-lock.json` regeneration.

### Out of Scope
- Storybook `@storybook/react-vite` 9.0.16 → 9.1.20 (minor bump, not major — repo already on 9.x) and `@react-email/preview-server` major bump; deferred to `fix-security-baseline-b`.
- Source, test, Vitest configuration, or backend changes.

## Capabilities

### Modified Capabilities
- None. `opencode-headless-config` does not own dependency overrides, and `github-actions-security` requirements remain unchanged.

### New Capabilities
- None — this is dependency hygiene.

## Approach
1. Update the three direct devDependency ranges and two overrides.
2. Run `npm install`; confirm lockfile churn remains approximately 280–350 lines.
3. Run `npx vitest run --maxWorkers=2` and `npx next build`.
4. Run `npm audit`; expect 8 → 3 findings, with all in-scope findings cleared.
5. Commit the dependency manifest and lockfile as one review unit.
6. Open one PR and merge only after `security.yml` passes.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `package.json` | Modified | Three direct bumps and two overrides |
| `package-lock.json` | Modified | Regenerated lockfile (~280–350 lines) |
| `src/` | None | No source changes |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Babel override disrupts transforms | Low | Run Next.js build; revert or isolate follow-up work if incompatible |
| Vitest patch changes reporting | Low | Run the unchanged suite and compare results |
| js-yaml changes ESLint parsing | Low | Validate install, lint/config loading, and build |
| Trivy reveals another production finding | Medium | Audit locally; file separate DEBT-10c |
| Lockfile exceeds review budget | Low | Review churn; keep under 400 lines |

## Rollback Plan

Revert the single PR. Both dependency files revert cleanly; no schema, data, or migration rollback is required.

## Dependencies

- None external.

## Success Criteria

- [ ] All five in-scope findings are absent from `npm audit` (expected total: 3).
- [ ] Vitest and Next.js build pass without regression.
- [ ] PR `security.yml`/Trivy gate passes.
- [ ] Overrides remain alphabetical; lockfile diff stays bounded.
- [ ] No changes to `src/`, tests, or Vitest configuration.

## Open Questions

- None — all scope decisions were resolved before proposing.

## References

- Exploration: `openspec/changes/fix-security-baseline/exploration.md`, Engram #1415.
- Roadmap: Engram #1402.
- Trivy cascade: Engram #1400.
- Project context: Engram #2.
