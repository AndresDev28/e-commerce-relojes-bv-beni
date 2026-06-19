# Exploration: Fix GGA Headless Config

**Change**: fix-gga-headless-config
**Type**: Tooling/config bug fix
**Date**: 2026-06-19
**Base commit**: `f94feb9`
**Artifact store**: hybrid (OpenSpec + Engram)

## Current State

The GGA (Gentleman Guardian Angel) pre-commit hook (`.git/hooks/pre-commit` → `gga run`)
invokes `opencode run "$prompt"` as a **headless subprocess** (no TUI, no human to approve
permissions). GGA config (`~/.config/gga/config`): `PROVIDER="opencode"`,
`RULES_FILE="AGENTS.md"`, `STRICT_MODE="true"`, `TIMEOUT="300"`. Under `STRICT_MODE`, a
review that fails to emit `STATUS: PASSED|FAILED` is treated as **ambiguous and blocks the
commit**. During the previous change (`fix-catalog-duplicate-keys`) every commit had to be
made with `--no-verify` for this reason.

Three separate defects combine to block headless commits. Only the first two are in scope;
the third is documented as out-of-scope infra.

### Defect 1 — No project-level `opencode.json` (permission gap, IN scope)
No `opencode.json` exists in the project (confirmed: `git log -- opencode.json` is empty;
the file created in prior session #375 was discarded by the reset to `03f206d`). The global
`~/.config/opencode/opencode.json` sets `permission.bash` and `permission.read` (with `.env`
deny rules) but sets **nothing else**. Per the official opencode docs
(https://opencode.ai/docs/permissions):

> OpenCode uses permissive defaults if no permissions are specified: most permissions default
> to `"allow"`, while `doom_loop` and `external_directory` default to `"ask"`.

**Correction to the prior diagnostic (session #377):** that session claimed `glob`, `list`,
and `external_directory` all defaulted to `ask`. The docs show **only `external_directory`**
(and `doom_loop`) default to `ask`; `glob`/`list`/`grep` default to `allow`. The verified
headless blocker is therefore `external_directory` defaulting to `ask` → auto-rejected with
no TUI → reviewer cannot complete → no `STATUS:` line → `STRICT_MODE` blocks. Prior session
#375 observed exactly such an `external_directory` rejection. Setting `glob`/`list`/`grep`
explicitly to `allow` is harmless defense-in-depth but is **not** the root cause.

### Defect 2 — Reviewer reads a placeholder, not the real rules (IN scope)
`RULES_FILE="AGENTS.md"`. The tracked `AGENTS.md` is a placeholder whose entire content is
"This file is a placeholder… the real config is `AGENT.md`". GGA injects `AGENTS.md` as
`=== CODING STANDARDS ===` in the review prompt (visible in recent prompt history). So the
reviewer is asked to validate code against a pointer, not against standards. Meanwhile the
real project rules live in `AGENT.md` (58 lines) + `.agent/rules/*.md` (4 files, ~83 lines),
which the GGA reviewer never receives. Additionally, whether opencode auto-loads `AGENT.md`
(singular) as an instruction file is uncertain; the documented convention file is
`AGENTS.md`. Consolidating rules into `AGENT.md` only takes effect if opencode is told to
load it.

### Defect 3 — GGA STRICT_MODE parsing bug (OUT of scope, infra)
GGA expects `STATUS: PASSED|FAILED` within the first 15 lines of reviewer output, but the
opencode reviewer emits markdown preamble before the status line. This is a bug in GGA
itself, separate from this change. Documented only.

## Affected Areas

- `opencode.json` (project root, NEW) — headless permission model + instruction loading.
- `AGENT.md` — consolidate critical enforceable rules from `.agent/rules/*.md` into the
  single source of truth that opencode loads.
- `AGENTS.md` — currently a placeholder; becomes redundant once opencode loads `AGENT.md`
  and (optionally) GGA points at `AGENT.md`. Reduce to a one-line pointer or remove.
- `.agent/rules/*.md` — source material for consolidation. Kept (not deleted) to preserve
  author intent/history; AGENT.md becomes the authoritative digest.
- `~/.config/gga/config` — OPTIONAL one-line `RULES_FILE="AGENT.md"` change (global file,
  borderline scope — flagged as a decision point, see Approaches).
- `src/` (read-only verification only) — confirmed `src/features/{cart,catalog,checkout,
  favorites,orders}` and thin `src/app/` match the screaming-architecture rules. No
  `src/shared`/`src/core` exists (shared code lives in `src/components`, `src/lib`,
  `src/utils`). `vitest.config.ts` has no `maxWorkers` setting — the `--maxWorkers=2` rule
  is only enforced by agent convention, not config.

## Critical rules to migrate into AGENT.md

Consolidation principle (cognitive-doc-design): lead with enforceable statements, strip
Antigravity-specific framing and specialized-agent personas, keep meanings, drop backend
internals that belong in the backend repo. Source: `.agent/rules/*.md`.

| Rule (source file) | Migrate? | Consolidated as |
| --- | --- | --- |
| Atomic Design: atoms/molecules/organisms (`frontend-react.md`) | Yes | "Component structure" |
| TypeScript interfaces must match Backend Watch model (`frontend-react.md`) | Yes | "Type safety" |
| `X-Trace-Id` header on every API service call (`frontend-react.md`) | Yes | "Backend integration" |
| Map backend errors to friendly UI messages; no cryptic 500s (`frontend-react.md`) | Yes | "Error handling" |
| No PII in localStorage without encryption or short expiry (`frontend-react.md`) | Yes | "Security & PII" |
| Client validation mirrors backend Sequelize constraints (`frontend-react.md`) | Yes | "Forms" |
| `UI-Performance-Observer` / `Ecom-Flow-Validator` agents (`frontend-react.md`) | Fold | Convert to review checkpoints (memo/useCallback correctness; immutable cart state; price-change invalidates checkout) |
| Vitest `--maxWorkers=2` mandatory on i7-HX (`hardware-aware.md`) | Yes | "Test execution" (concrete, prevents crashes) |
| Stop background processes on system hang/lag (`hardware-aware.md`) | Yes | "Test execution" |
| Features vertical slices; thin `src/app/`; `src/features/` public `index.ts`; no circular imports (`screaming-architecture.md`) | Yes | "Architecture" — but reflect ACTUAL shared dirs (`src/components`, `src/lib`, `src/utils`), not the idealized `src/shared`/`src/core` |
| Strapi backend layering: controllers/services/lifecycles/domain (`screaming-architecture.md`) | No | Backend internals belong in the backend repo; keep only the cross-repo SSOT pointer (already in AGENT.md) |
| `Screaming-Architect-Sentinel` agent (`screaming-architecture.md`) | Fold | Convert to an architecture review checkpoint: block spaghetti in global dirs, force extraction into the matching feature |
| Backend repo is SSOT for API contracts; backend wins on discrepancy (`bv-beni-watch-store-ref.md`) | Yes | "Cross-repo source of truth" (already partially in AGENT.md — deduplicate into one section) |

**Nothing is lost**: every enforceable rule is preserved as a concise statement; the
Antigravity "specialized agent" personas become review checkpoints (the Gentle AI harness has
no such separate agents — their concerns are enforced via rules + judgment-day reviewers);
backend internals are deliberately kept in the backend SSOT, not duplicated here.

## Approaches

### 1. Project `opencode.json` (permission + instructions) + AGENT.md consolidation
Create a minimal project `opencode.json` that (a) allows the read-only tools the headless
reviewer needs, (b) explicitly loads `AGENT.md`, and consolidate the critical rules above into
`AGENT.md`. `AGENTS.md` is reduced to a one-line pointer. GGA `RULES_FILE` left as-is
(`AGENTS.md`) — the reviewer still receives the real rules via opencode `instructions`
(system prompt), so this is optional, not essential.

Recommended `opencode.json`:
```json
{
  "$schema": "https://opencode.ai/config.json",
  "instructions": ["AGENT.md"],
  "permission": {
    "glob": "allow",
    "list": "allow",
    "grep": "allow",
    "external_directory": "allow"
  }
}
```
- `read` and `bash` are NOT redefined → global `.env`-deny and `git`-ask rules are preserved.
- `external_directory: "allow"` is the verified fix (it defaults to `ask`).
- `glob`/`list`/`grep` explicit `allow` = defense-in-depth (docs say they already default to
  `allow`).
- `edit`/`write` left unset → reviewer stays non-mutating in headless (auto-reject on `ask`);
  interactive editing is unaffected.

- **Pros**: Smallest change that unblocks headless commits; preserves global safety rules;
  single source of truth in `AGENT.md`; no global file changes required.
- **Cons**: `external_directory: "allow"` is broad (any path readable without asking) —
  acceptable for a read-only reviewer but permissive for interactive sessions. GGA prompt
  still carries the redundant `AGENTS.md` placeholder as "standards" (harmless noise).
- **Effort**: Low
- **Estimated changed lines**: ~70-110 (opencode.json ~8, AGENT.md rewrite ~70-90, AGENTS.md
  pointer ~2). Well under the 400-line budget.

### 2. Approach 1 + scoped `external_directory` (hardening)
Same as Approach 1 but scope `external_directory` to the sibling-projects area so the
cross-repo backend rules (`../e-commerce-relojes-bv-beni-api/...`) remain readable while
everything else stays `ask`:
```json
"external_directory": { "*": "ask", "/home/adreidev/dev/personal-projects/**": "allow" }
```
(opencode evaluates the LAST matching rule, so broad `*: ask` first, narrow allow last.)

- **Pros**: Least privilege; safer for interactive sessions.
- **Cons**: If the reviewer ever needs a path outside `personal-projects` (e.g. a temp dir or
  the prior session's unexplained external path), headless auto-rejects again → commit
  re-blocked. The exact external-read surface of the reviewer is not fully known.
- **Effort**: Low
- **Estimated changed lines**: ~72-112.

### 3. Approach 1 + repoint GGA `RULES_FILE` to `AGENT.md` (full alignment)
Approach 1 plus a one-line change to `~/.config/gga/config`: `RULES_FILE="AGENT.md"`. Now
GGA injects the real consolidated rules as `=== CODING STANDARDS ===`, and `AGENTS.md` can be
removed entirely. `AGENT.md` becomes the single source read by both opencode and GGA.

- **Pros**: True single source of truth; reviewer gets real standards in the prompt body, not
  just via system instructions; `AGENTS.md` placeholder is eliminated.
- **Cons**: Touches a GLOBAL file (`~/.config/gga/config`) that affects every project using
  GGA — borderline scope (the out-of-scope list excludes only the global `opencode.json`, not
  the GGA config, but it is still a global change). Must be confirmed by the user.
- **Effort**: Low
- **Estimated changed lines**: ~70-112 (same as Approach 1; the GGA line is outside the repo).

## Recommendation

**Approach 1 as the baseline, with the `external_directory` scope (Approach 2) and the GGA
repoint (Approach 3) presented to the user as two independent opt-in decisions** (delivery
strategy is ask-always).

- Approach 1 alone unblocks headless commits (the verified blocker is `external_directory`).
- Approach 2 is a security-hardening choice (least privilege vs. robustness) — recommend
  **broad `allow` first to guarantee the unblock**, then harden to scoped in a follow-up once
  the reviewer's real external-read surface is observed.
- Approach 3 is the clean long-term alignment but touches a global file — recommend doing it
  only with explicit user confirmation, since it changes GGA behavior for all projects.

## Scope

### IN scope
1. New project-level `opencode.json`: permission model (`glob`/`list`/`grep`/`external_directory`)
   and `instructions: ["AGENT.md"]`.
2. `AGENT.md` consolidation: migrate the critical enforceable rules listed above; strip
   Antigravity framing; reflect actual `src/` structure; deduplicate the cross-repo pointer.
3. `AGENTS.md` reduced to a one-line pointer (or removed if Approach 3 is accepted).

### OUT of scope (hard guardrails)
- Fixing the GGA `STRICT_MODE` first-15-lines parsing bug (infra, Defect 3).
- Fixing `page.tsx` architecture.
- Fixing `api.ts` double-fetch / `X-Trace-Id` / error-mapping debt.
- Changing the global `~/.config/opencode/opencode.json`.
- Deleting `.agent/rules/*.md` (kept as source/history; AGENT.md is the digest).
- Backend `Strapi` layering rules (belong in the backend repo).

## Risks

- **`external_directory: "allow"` broadens read access** for all agents in this project
  (interactive + headless). Mutation is still gated (`edit`/`write`), but any path becomes
  readable without asking. Mitigation: Approach 2 scopes it; or accept as read-only reviewer
  posture.
- **`instructions: ["AGENT.md"]` may change which files opencode auto-loads.** If opencode's
  default auto-loads project `AGENTS.md`, setting `instructions` explicitly drops the
  placeholder (desirable). Risk: if opencode also auto-loads other defaults, they are
  replaced by the explicit list. Verified mitigation: the only project instruction file that
  matters is `AGENT.md`; the global persona (`~/.config/opencode/AGENTS.md`) is loaded
  separately and is unaffected.
- **GGA `RULES_FILE` global change (Approach 3) affects all GGA projects**, not just this
  one. Must be user-approved.
- **Config-validation hard failure.** opencode refuses to start on an invalid `opencode.json`
  field. Mitigation: declare `"$schema"` and keep to documented keys; if startup breaks, use
  `OPENCODE_DISABLE_PROJECT_CONFIG=1` to recover and edit.
- **Review quality, not commit blocking, is what consolidation fixes.** Even without
  consolidation, once permissions are fixed the reviewer emits `STATUS: PASSED` and commits
  unblock — but it reviews against a placeholder, so it rubber-stamps. Consolidation +
  `instructions` makes the review meaningful.
- **`opencode run` timeout (300s) is a separate, unresolved risk** (prior session #375 point
  4): the permission fix did NOT resolve a 300s timeout with the default model + 2 MCP
  servers. This change does not address timeout; if it recurs, commits will still block on
  timeout (not ambiguity). Out of scope here; track as a follow-up.

## Rollback Plan

All changes are config/docs on a dedicated branch. Rollback is `git revert` or branch
deletion back to `f94feb9`. No code, no migrations, no env changes, no irreversible state.
If `opencode.json` breaks startup, remove the file (or `OPENCODE_DISABLE_PROJECT_CONFIG=1`)
and restart; the project runs fine with global config only, as it does today.

## Ready for Proposal

**Yes.** Root cause is verified against official docs, the minimal fix boundary is clear, the
blast radius is small (~70-110 lines), and scope guardrails are explicit. The orchestrator
should ask the user two yes/no decisions before `sdd-propose`:
1. `external_directory`: broad `allow` (robust, recommended to guarantee unblock) or scoped to
   `~/dev/personal-projects/**` (least privilege, small re-block risk)?
2. Repoint GGA `RULES_FILE` from `AGENTS.md` to `AGENT.md` (global `~/.config/gga/config`,
  one line, affects all GGA projects) — yes or no?
