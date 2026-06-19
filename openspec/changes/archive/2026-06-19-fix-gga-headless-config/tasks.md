# Tasks: Fix GGA Headless Config

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~130-160 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-always |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Create opencode.json + consolidate AGENT.md + reduce AGENTS.md + document GGA config | PR 1 (single) | All files in one commit; well under 400 lines |

## Phase 1: Foundation — Project Config

- [x] 1.1 Create `opencode.json` at repo root with `$schema`, `instructions: ["AGENT.md"]`, and permission rules (read allow + .env deny, bash allow + git-ask, glob/list/grep/external_directory allow). Leave `edit`/`write` unset.
- [x] 1.2 Validate `opencode.json` against `https://opencode.ai/config.json` — no schema errors.

## Phase 2: Core — AGENT.md Consolidation

- [x] 2.1 Rewrite `AGENT.md` consolidating rules from `.agent/rules/frontend-react.md` (Atomic Design, X-Trace-Id, error mapping, PII, form validation), `.agent/rules/hardware-aware.md` (Vitest --maxWorkers=2), and `.agent/rules/screaming-architecture.md` (features/, thin app/, no circular imports). Strip Antigravity ceremony and backend-internal framing. Translate to English.
- [x] 2.2 Preserve existing sections: Project Scope, Repository Hierarchy, Skills Registry, Branch Naming, Cross-Repo Reference, SDD Workflow.
- [x] 2.3 Add new section: "GGA Pre-commit Setup" documenting `RULES_FILE="AGENT.md"` in `~/.config/gga/config` line 15.

## Phase 3: Cleanup — AGENTS.md Reduction

- [x] 3.1 Replace `AGENTS.md` content with one-line pointer: `→ See [AGENT.md](AGENT.md) for all project rules and coding standards.`

## Phase 4: Verification

- [x] 4.1 Run `opencode` in project directory — confirm no startup errors from new `opencode.json`.
- [x] 4.2 Verify headless permission grant: confirm `external_directory` defaults to `allow` (inspect config load or run headless read outside cwd).
- [x] 4.3 Verify `.env` still denied: confirm read rules include `.env` deny patterns.
- [x] 4.4 Inspect `AGENTS.md` — confirm it contains only the pointer, not the old placeholder text.
- [x] 4.5 Test GGA commit cycle: make trivial change, run `git commit` (no `--no-verify`) — commit succeeds with GGA reviewer output.
- [x] 4.6 Verify reviewer prompt content: GGA verbose/debug output includes Atomic Design, X-Trace-Id, --maxWorkers=2 rules (not placeholder).
