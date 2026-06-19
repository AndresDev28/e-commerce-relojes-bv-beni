# Specification: Project Headless Config & AGENT.md Rules

## Purpose

Define the behavior of the project's headless opencode configuration and consolidated `AGENT.md` rules so that GGA pre-commit reviews complete without human intervention.

## Requirements

### Requirement 1: Project opencode.json

The project MUST contain an `opencode.json` at repository root with:
- `$schema` pointing to `https://opencode.ai/config.json`
- `instructions: ["AGENT.md"]`
- `permission.glob`, `permission.list`, `permission.grep`, and `permission.external_directory` set to `"allow"`
- `permission.edit` set to `"ask"` so a headless reviewer cannot edit files without approval

#### Scenario: Headless permission grant

- GIVEN opencode starts without a TUI
- WHEN the project config loads
- THEN `external_directory` defaults to `allow` instead of `ask`
- AND `glob`, `list`, `grep` default to `allow`

#### Scenario: Non-mutating reviewer

- GIVEN the reviewer agent runs headless
- WHEN it checks write permissions
- THEN `edit` is explicitly set to `"ask"` so the agent cannot edit without approval
- AND `write` remains unset so the agent stays non-mutating

### Requirement 2: AGENT.md Consolidation

`AGENT.md` MUST contain all enforceable rules previously spread across `.agent/rules/*.md`, stripped of backend-internal framing. Minimum covered areas:

| Area | Rule Summary |
|------|-------------|
| Component structure | Atomic Design (atoms/molecules/organisms) |
| Type safety | Component interfaces match Backend Watch model |
| Backend integration | `X-Trace-Id` header on every API call |
| Error handling | Map backend errors to friendly UI messages |
| Security & PII | No unencrypted personal data in `localStorage` |
| Forms | Client validation mirrors Sequelize constraints |
| Test execution | `npx vitest run --maxWorkers=2`; stop background processes on hang |
| Architecture | Features in `src/features/`, thin `src/app/`, no circular imports |
| Cross-repo SSOT | Backend rules win on discrepancy |

#### Scenario: Reviewer rule visibility

- GIVEN GGA runs a headless review
- WHEN the reviewer prompt is built
- THEN it includes the consolidated rules from `AGENT.md`
- AND it does NOT include the placeholder text from the old `AGENTS.md`

### Requirement 3: AGENTS.md Reduction

`AGENTS.md` MUST be reduced to a one-line pointer to `AGENT.md`, or removed entirely.

#### Scenario: Pointer replacement

- GIVEN `AGENTS.md` exists in the repository
- WHEN GGA reads the rules file
- THEN it resolves real rules from `AGENT.md` instead of the placeholder

### Requirement 4: Global GGA Config Documentation

Project documentation MUST state that global GGA config needs `RULES_FILE="AGENT.md"` in `~/.config/gga/config`.

#### Scenario: Developer onboarding

- GIVEN a developer sets up the project
- WHEN they read the setup notes
- THEN they see the exact global config change required for GGA

## Acceptance Criteria

1. `opencode.json` exists at repository root and validates against its `$schema`.
2. `git commit` without `--no-verify` passes GGA review in headless mode.
3. The reviewer prompt contains real `AGENT.md` rules, not the `AGENTS.md` placeholder.
4. Total changed lines in the PR remain under 400.

## Test Plan

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Validate `opencode.json` against `https://opencode.ai/config.json` | No schema errors |
| 2 | Run `opencode` in headless mode (or inspect config load) | No permission prompts for `external_directory` |
| 3 | Execute `git commit` with GGA enabled | Commit succeeds; reviewer outputs `STATUS: PASS` or equivalent |
| 4 | Inspect GGA reviewer prompt or debug output | Contains Atomic Design, `X-Trace-Id`, `--maxWorkers=2`, and Screaming Architecture rules |
| 5 | Check `AGENTS.md` content | Either absent or contains only a pointer to `AGENT.md` |

## Out of Scope

- Fixing the GGA `STRICT_MODE` first-15-lines parsing bug.
- Addressing `api.ts` double-fetch, `X-Trace-Id` instrumentation, or error-mapping debt.
- Refactoring `page.tsx` architecture.
- Modifying the global `~/.config/opencode/opencode.json`.
