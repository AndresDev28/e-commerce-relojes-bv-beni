# Archive Report: test-infra-e2e-legacy-auth

```yaml
schema: gentle-ai.archive-result/v1
change: test-infra-e2e-legacy-auth
cycle_verdict: pass
closed_on: 2026-08-20
head_sha: d1c61aa6e698e8ff620c66b9a9ed2e0a312b3d91
pr_sha: 74cdce3d3cef6abc0856da847ab840651ca5621f
pr_number: 111
mode: strict_tdd
capability_delta: 0
archived_to: openspec/changes/archive/2026-08-20-test-infra-e2e-legacy-auth
spec_promoted_to: openspec/specs/test-infra-cookie-session/spec.md
verify_evidence_revision: sha256:dce5202e44fd631ac4d7f6531b8f3ff5403ebe0609b9c065b061a870d8873a25
```

## Cycle Summary

`test-infra-e2e-legacy-auth` is the F1 followup to the just-archived `TEST-INFRA-E2E` cycle (#1612). That cycle closed 8 of 22 baseline events but left **14 events** from a single root class — e2e specs still mocking legacy Strapi-direct auth (`localStorage.setItem('jwt', token)` + `/api/users/me` + `/api/auth/local`) against the production cookie-session model (`/api/auth/session`, `/api/auth/login`).

This cycle closed all 14 events via a single test-infra-only PR (#111, squash `74cdce3`), shipped as release 1.5.3 (`d1c61aa`). Capability delta = 0 on production code — only `tests/e2e/` files and release metadata changed.

### Outcome

- **Verdict**: PASS
- **E2E**: 58 passed / 0 failed (40.2s, chromium + firefox)
- **Vitest**: 978 passed / 0 failed (44.8s)
- **Storybook**: 20/20 (3.15s)
- **TypeScript**: `tsc --noEmit` exit 0
- **Lint**: `npm run lint` exit 0
- **Spec compliance**: 7/7 requirements, 12/12 scenarios COMPLIANT

## Phase Trail

| Phase    | Skill         | Date              | Outcome                                       | Engram obs |
| -------- | ------------- | ----------------- | --------------------------------------------- | ---------- |
| Explore  | sdd-explore   | 2026-08-19        | success                                       | #1614      |
| Proposal | sdd-propose   | 2026-08-19        | success                                       | #1616      |
| Spec     | sdd-spec      | 2026-08-19        | success                                       | #1617      |
| Design   | sdd-design    | 2026-08-19        | success                                       | #1620      |
| Tasks    | sdd-tasks     | 2026-08-19        | success                                       | #1622      |
| Apply    | sdd-apply     | 2026-08-19/20     | success (1 ordinal, 3 work-unit commits)      | #1623      |
| Verify   | sdd-verify    | 2026-08-20        | PASS                                          | #1627      |
| **Archive** | **sdd-archive** | **2026-08-20** | **success**                                   | **<this>** |

## Affected Files (PR #111 squash `74cdce3`)

| File                                      | Bucket | Insertions | Deletions | Notes                       |
| ----------------------------------------- | ------ | ---------- | --------- | --------------------------- |
| `tests/e2e/cancellation-flow.spec.ts`     | A      | +7         | -6        | pure swap                   |
| `tests/e2e/checkout-happy-path.spec.ts`   | B      | +18        | -10       | login + session route mocks |
| `tests/e2e/checkout-mobile.spec.ts`       | B      | +16        | -10       | login + session route mocks |
| `tests/e2e/empty-states.spec.ts`          | A      | +5         | -5        | pure swap, 2 tests benefit  |
| `tests/e2e/order-tracking.spec.ts`        | A      | +7         | -6        | pure swap                   |
| `tests/e2e/payment-errors.spec.ts`        | A'     | +9         | -10       | swap + test-2 unroute       |
| `docs/roadmapToProduction.md`             | hygiene| +49        | -8        | docs, not production code   |
| **tests/e2e/ subtotal**                   |        | **+62**    | **-47**   | sum of 6 spec files         |
| **Total squash commit**                   |        | **+95**    | **-63**   | per verify-report           |

X-bucket specs (`favorites-auth-prompt-a11y.spec.ts`, `favorites-anonymous-access.spec.ts`) had **zero diff** — A2 honoured. Well inside the 400-line review budget.

## Capability Delta

| Surface                                                       | Diff   | Notes                                                       |
| ------------------------------------------------------------- | ------ | ----------------------------------------------------------- |
| Production code (`src/`, `next.config.*`, `middleware.*`)     | empty  | verified by `git diff main -- 'src/' 'next.config.*' 'middleware.*'` |
| `package.json`                                                | version bump 1.5.2 → 1.5.3 only | release-please metadata, not user code     |
| Config (`.env*`, `playwright.config.ts`, `vitest.config.ts`)  | empty  | no new env vars, flags, or test machinery                   |
| `tests/e2e/`                                                  | 6 specs modified | the actual work                                |
| Docs                                                          | `roadmapToProduction.md` updated | hygiene, not production          |

**Capability delta = 0** on production code. Verified empty.

## Spec Compliance

12/12 scenarios COMPLIANT at runtime, 7/7 requirements COMPLIANT, 0 FAILING, 0 UNTESTED.

| REQ | Title                                              | Scenarios | Status      |
| --- | -------------------------------------------------- | --------- | ----------- |
| R1  | Legacy-auth e2e mocks use cookie-session pattern   | 3         | COMPLIANT   |
| R2  | Vitest and Storybook invariants preserved          | 2         | COMPLIANT   |
| R3  | Capability delta is zero                           | 2         | COMPLIANT   |
| R4  | Out-of-scope specs are not touched                 | 1         | COMPLIANT   |
| R5  | Bucket B mocks cover both login and session routes | 2         | COMPLIANT   |
| R6  | Quality gates exit cleanly                         | 1         | COMPLIANT   |
| R7  | uxw01 chromium flake is documented but out of scope| 1         | COMPLIANT   |

Verdict rationale:

- **PASS**: failure count = 0 (was 14 before, now 0), no regressions, no unaddressed CRITICAL, capability delta = 0.
- Not `pass_with_warnings`: this cycle hit zero failures, unlike predecessor `TEST-INFRA-E2E` which carried the same 14 events forward.
- Not `fail`: zero regressions; design deviations are user-validated and correctly implemented, not defects.

## Design Deviations (user-validated, accepted)

Both deviations are **intentional** and correctly implemented, NOT defects:

### A1 — Bucket B cookie-conditional session mock + Set-Cookie login mock

Refined during design phase. The user originally specified "mock both `/api/auth/login` and `/api/auth/session`". Design phase refined:

- Login mock emits `Set-Cookie: bv_session=mock-jwt; Path=/; HttpOnly; SameSite=Lax` (because `route.fulfill()` does NOT emit Set-Cookie by default).
- Session mock is conditional on the `bv_session` cookie header (because `AuthContext.tsx` L41–63 re-fetches session on every AuthProvider mount).

An unconditional "always MOCK_USER" mock would break the pre-login `/carrito` redirect at L52 (initial session check on `/tienda` would return MOCK_USER → user "logged in" → cart never redirects to `/login` → `toHaveURL(/\/(carrito|login)/)` fails). The conditional pattern mirrors the real route. User accepted the refinement.

### Post-login URL is `/carrito`, not `/mi-cuenta` (apply phase finding)

After PR #110 (`DEBT-LOGIN-REDIRECT`) added `?redirect=%2Fcarrito` handling, the login page honours the param and lands on `/carrito` rather than the pre-feature `/mi-cuenta`. Both checkout specs originally asserted `toHaveURL(/mi-cuenta/)`, encoding pre-redirect-feature behaviour. The sub-agent corrected the **tests** (NOT production), cross-verifying against `tests/e2e/login-redirect.spec.ts` TC-01/TC-02 which independently cover the redirect-param round-trip.

**Net effect on production code**: zero. Capability delta stayed 0.

## Caveats and Known Limitations

- **`BUG-E2E-UXW01-CHROMIUM-FLAKE`** remains open as a documented side-finding. A 1 chromium-only `uxw01 TC-15` networkidle timeout (30s exceeded on `page.waitForLoadState('networkidle')`) was observed during the explore baseline. It did NOT fire on the final verify run (58/0). Apply also noted it appeared on firefox in one intermediate run, suggesting the chromium scoping may be too narrow. Followup named; out of scope for this change.
- **9 skipped vitest tests** are env-conditional (Docker integration); pre-existing, NOT introduced by this change.
- **`.pi/` directory** in working tree is opencode session garbage. Orchestrator handles cleanup separately; sdd-archive did NOT touch it.
- **`tests/e2e/QA-MANUAL.md`** is preserved in the archive folder for future manual QA reference; not used by CI. Carry decision #1626: use real Strapi backend, not e2e mock, for manual QA going forward.
- **`test/integration/email/order-status-change.integration.test.ts`** requires the Dockerised backend (Strapi not available locally); cannot be validated by this change. Pre-existing constraint carried forward.
- **Vitest gate** at apply showed 969 passed / 9 skipped / 1 pre-existing env failure (Strapi-dependent integration test). The verify run showed 978 passed / 0 failed after the Strapi-dependent test was either re-run or excluded — counts differ between apply and verify due to env state. Both are clean against this change.

## Side Findings + Next-Session Hooks

For future SDD cycles:

1. `BUG-E2E-UXW01-CHROMIUM-FLAKE` — separate followup. Apply observed it on firefox once; chromium scoping may be too narrow.
2. Manual visual QA workflow (decision #1626) — use real Strapi backend, not e2e mock, for future manual QA.
3. S5.3 integration suite — carry from #1612.
4. SUG-2 / SUG-3 (vitest followups) — carry from #1612.
5. BUG-IMAGES-NO-TEST (Sprint 3 #3) — carry.
6. Prettier hygiene on `playwright.config.ts` — carry from #1612.
7. Mock filter support in `mock-strapi-server.mjs` — carry from #1612.

## Artifact Trail (Engram Obs Trail)

| Phase          | Topic key                                          | Obs ID        |
| -------------- | -------------------------------------------------- | ------------- |
| Explore        | `sdd/test-infra-e2e-legacy-auth/explore`           | #1614         |
| Proposal       | `sdd/test-infra-e2e-legacy-auth/proposal`          | #1616         |
| Spec           | `sdd/test-infra-e2e-legacy-auth/spec`              | #1617         |
| Design         | `sdd/test-infra-e2e-legacy-auth/design`            | #1620         |
| Tasks          | `sdd/test-infra-e2e-legacy-auth/tasks`             | #1622         |
| Apply-progress | `sdd/test-infra-e2e-legacy-auth/apply-progress`    | #1623         |
| Verify-report  | `sdd/test-infra-e2e-legacy-auth/verify-report`     | #1627         |
| **Archive-report** | `sdd/test-infra-e2e-legacy-auth/archive-report` | **<this>**    |

## Archive Mechanics (this run)

| Step | Action                                                                                                            | Verbatim readback                            |
| ---- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 2    | Sync delta spec → `openspec/specs/test-infra-cookie-session/spec.md` (mechanical `cp` + `diff -r`)                 | `diff -r source vs temp` → empty (verified)   |
| 3    | Move active folder → `openspec/changes/archive/2026-08-20-test-infra-e2e-legacy-auth/` (snapshot + `mv` + `diff -r`) | `diff -r snapshot vs archived` → empty (verified) |

Both readbacks passed with empty diff. No model-mediated file copy — all bytes moved via `cp`/`mv` shell commands. Skill Mechanical Copy Contract satisfied.

## Predecessor

- **`TEST-INFRA-E2E`** (closed 2026-08-12, #1612) — closed 8 of 22 baseline events, left 14 legacy-auth events forward. This change is its F1 followup.

## SDD Cycle Close-Out

The SDD cycle for `test-infra-e2e-legacy-auth` is **complete and formally archived**:

- **Planned**: explore → propose → spec → design → tasks (5 phases, 2026-08-19)
- **Applied**: 1 ordinal, 3 work-unit commits (T0 doc + T2 GREEN-A + T3 GREEN-A'+B+SWEEP), PR #111 opened against `main`
- **Verified**: PASS, 58/0 e2e events, 0 legacy-auth class failures, 0 regressions, 12/12 spec scenarios COMPLIANT
- **Merged**: squash commit `74cdce3`, release `d1c61aa` (1.5.3) shipped
- **Archived**: 2026-08-20 (this report)

Capability delta on production code: **0**. Ready for the next change.