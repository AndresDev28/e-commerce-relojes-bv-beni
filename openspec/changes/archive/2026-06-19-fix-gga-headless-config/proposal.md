# Proposal: Fix GGA Headless Config

## Intent

GGA pre-commit runs `opencode run` headless (no TUI). Two defects block every commit:
1. `external_directory` defaults to `ask` → auto-rejected without a human → reviewer cannot complete → no `STATUS:` line → `STRICT_MODE` treats it as ambiguous and blocks the commit.
2. GGA injects `AGENTS.md` as `=== CODING STANDARDS ===`. The tracked `AGENTS.md` is a placeholder pointer, so the reviewer validates code against a pointer, not real rules. Real rules live in `AGENT.md` + `.agent/rules/*.md` and never reach the reviewer.

## Scope

### In Scope
- Create project-level `opencode.json` with headless-safe permissions and `instructions: ["AGENT.md"]`.
- Consolidate critical enforceable rules from `.agent/rules/*.md` into `AGENT.md`.
- Reduce `AGENTS.md` to a one-line pointer (or remove if GGA repoint is accepted).
- Document global GGA config change: `RULES_FILE="AGENT.md"` in `~/.config/gga/config`.

### Out of Scope
- Fixing GGA `STRICT_MODE` first-15-lines parsing bug.
- `api.ts` double-fetch / `X-Trace-Id` / error-mapping debt.
- `page.tsx` architecture refactor.
- Changing global `~/.config/opencode/opencode.json`.
- Deleting `.agent/rules/*.md` (kept as source/history).

## Capabilities

### New Capabilities
None — this is a tooling/config change with no product behavior changes.

### Modified Capabilities
None — no existing spec requirements change.

## Approach

1. **Project `opencode.json`** (new):
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
- `read`/`bash` are NOT redefined → global `.env`-deny rules preserved.
- `edit`/`write` left unset → reviewer stays non-mutating in headless.

2. **AGENT.md consolidation**: Migrate enforceable rules from `.agent/rules/*.md`, stripping Antigravity framing and backend internals. Key additions:
   - **Component structure** (Atomic Design: atoms/molecules/organisms)
   - **Type safety** (interfaces match Backend Watch model)
   - **Backend integration** (`X-Trace-Id` header on every API call)
   - **Error handling** (map backend errors to friendly UI messages)
   - **Security & PII** (no unencrypted personal data in `localStorage`)
   - **Forms** (client validation mirrors Sequelize constraints)
   - **Test execution** (`--maxWorkers=2` on i7-HX; stop background processes on hang)
   - **Architecture** (features in `src/features/`, thin `src/app/`, no circular imports)
   - **Cross-repo SSOT** (backend wins on discrepancy)

3. **AGENTS.md**: Reduce to a one-line pointer or remove entirely.

4. **Global GGA config**: One-line change in `~/.config/gga/config`: `RULES_FILE="AGENT.md"`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `opencode.json` | New | Headless permission model + instruction loading |
| `AGENT.md` | Modified | Consolidated rules from `.agent/rules/*.md` |
| `AGENTS.md` | Modified/Removed | Reduced to pointer or removed |
| `~/.config/gga/config` | Modified (documented) | `RULES_FILE="AGENT.md"` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `external_directory: "allow"` broadens read access for all agents in this project | Med | Mutation still gated (`edit`/`write` unset); scope to `personal-projects/**` in follow-up once reviewer surface is known |
| `instructions: ["AGENT.md"]` may drop other auto-loaded defaults | Low | Only `AGENT.md` matters; global persona is loaded separately and unaffected |
| Invalid `opencode.json` key prevents opencode startup | Low | Use `"$schema"`; if broken, remove file or set `OPENCODE_DISABLE_PROJECT_CONFIG=1` |
| GGA `RULES_FILE` global change affects all GGA projects | Low | User-approved decision; single-line revert |

## Rollback Plan

All changes are config/docs. Rollback is `git revert` or branch deletion back to base commit (`f94feb9`). If `opencode.json` breaks startup, delete it or use `OPENCODE_DISABLE_PROJECT_CONFIG=1`.

## Dependencies

None.

## Success Criteria

- [ ] `git commit` without `--no-verify` passes GGA review in headless mode.
- [ ] Reviewer prompt contains real consolidated rules from `AGENT.md`, not the `AGENTS.md` placeholder.
- [ ] `opencode.json` validates against declared `$schema`.
- [ ] Changed lines remain under 400.
