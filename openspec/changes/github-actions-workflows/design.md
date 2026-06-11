# Design: GitHub Actions Workflows (CI, Security, Release-please)

## Technical Approach

Mirror the backend's proven three-workflow pattern, adapted for Next.js 15 + React 19 + TypeScript frontend. All workflows share `actions/setup-node@v4` with `.node-version` (Node 22 LTS), `npm ci` for deterministic installs, and `actions/checkout@v4`. Release workflow swaps backend's tag-based `softprops/action-gh-release` for `googleapis/release-please-action@v4` to enable automated versioning, CHANGELOG generation, and release PRs — matching the user's explicit request.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Test runner | `npm run test:only -- --project=unit --project=integration` | `npm test` (double-builds), `vitest run` (includes storybook) | Build already runs as separate step. Storybook uses browser-based tests flaky in CI. Unit + integration projects use jsdom/node; deterministic. |
| CodeQL language | `javascript` | `typescript` | CodeQL treats JS/TS as single `javascript` extraction — no TypeScript language query pack exists. Backend uses `typescript` but that's Strapi JS, not TS. Frontend should use `javascript`. |
| Release-please for private pkg | `release-please-config.json` + `.release-please-manifest.json` with `"private": true, "release-type": "node"` | Skip release-please, use tag-based like backend | release-please supports private packages explicitly. Config files give full control over versioning strategy. User explicitly asked for release-please. |
| Action versioning | `@v4` for checkout/setup-node, `@v3` for codeql, `@master` for trivy | Pin to SHA | Major-version tags auto-update minor/patch; pragmatic balance of stability vs maintenance. Trivy has no stable tag — `@master` is the documented path. |
| Node version file | `.node-version` with `22` | Hardcode in workflow YAML, use `engines.node` in package.json | `.node-version` is the standard `setup-node` convention. Keeps version single-sourced. Local machine stays at v25 — CI is independent. |

## Data Flow

```
PR/push to main
       │
       ▼
  ┌─────────┐    push to main    ┌──────────────────┐
  │ ci.yml  │──────────────────▶│ release-please.yml│
  │         │                    │  (release PR +    │
  │ lint    │                    │   tag on merge)   │
  │ build   │                    └──────────────────┘
  │ test    │
  └─────────┘

  Weekly cron ──▶ security.yml
                  (audit → CodeQL → Trivy)
```

CI and release-please share the push-to-main trigger but are independent jobs. Security is fully decoupled — runs on schedule + manual dispatch.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `.github/workflows/ci.yml` | Create | Lint → build → test (unit+integration) on PR/push to main. Timeout: 15 min. `permissions: contents: read`. |
| `.github/workflows/security.yml` | Create | Weekly `npm audit --audit-level=high` + CodeQL + Trivy fs scan. `permissions: contents: read, security-events: write`. |
| `.github/workflows/release-please.yml` | Create | Release-please v4 on push to main. `permissions: contents: write, pull-requests: write`. |
| `.node-version` | Create | Contents: `22`. Single-source for all three workflows' `node-version-file`. |
| `release-please-config.json` | Create | `"release-type": "node"`, `"private": true`, `"include-v-in-tag": true`. |
| `.release-please-manifest.json` | Create | `{".": "0.1.0"}` — tracks current version. |

## Interfaces / Contracts

**release-please-config.json**:
```json
{
  "packages": {
    ".": {
      "release-type": "node",
      "private": true,
      "include-v-in-tag": true
    }
  }
}
```

**.release-please-manifest.json**: `{".": "0.1.0"}`

CI test invocation: `npm run test:only -- --project=unit --project=integration`

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| CI itself | Workflow correctness | PR triggers CI; verify green check on this change's PR. Lint, build, test must pass. |
| Security workflow | Audit/codeql/trivy | Manual dispatch (`workflow_dispatch`) to validate immediately; then weekly cron. |
| Release-please | Release PR creation | Dry-run with `--dry-run` flag locally; validate on merge to main after this change. |
| E2E / Storybook | Deliberately excluded | Browser-based tests need running dev server + browser infra. Deferred to future `e2e.yml` workflow. |

## Migration / Rollout

No migration required. Workflows are additive — no existing CI to migrate from. Rollback: delete `.github/workflows/`, `release-please-config.json`, `.release-please-manifest.json`, and `.node-version`.

## Open Questions

- [ ] Should CI also run on pushes to feature branches, or only PRs? (Proposal says PRs to main + pushes to main only. Confirm this is sufficient.)
- [ ] Should `npm audit` in CI fail the build on HIGH severity? (Security workflow already catches this weekly; CI adding audit adds 20s per run.)
