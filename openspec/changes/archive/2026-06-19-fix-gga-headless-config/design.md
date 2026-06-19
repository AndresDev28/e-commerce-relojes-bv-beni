# Design: Fix GGA Headless Config

## Technical Approach

Two defects block GGA pre-commit: (1) `external_directory` defaults to `ask` → auto-rejected headless → reviewer never completes → no `STATUS:` line; (2) GGA reads `AGENTS.md` (placeholder) not real rules in `AGENT.md`. Fix: project `opencode.json` grants headless-safe permissions + `instructions:["AGENT.md"]`; consolidate rules into `AGENT.md`; reduce `AGENTS.md` to a pointer; repoint GGA `RULES_FILE`. Maps to spec Req 1–4.

## Architecture Decisions

### Decision: Permission syntax — string shorthand vs object form

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `"glob": "allow"` (string) | Valid per docs (`"edit": "deny"` example); concise | **Chosen** |
| `"glob": {"*": "allow"}` (object) | More verbose; equivalent semantics | Rejected |

### Decision: Re-declare read/bash vs global merge

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Re-declare `read` (secret denies) + `bash` (git ask) in project config | Safe under both merge AND replace semantics; ~15 lines duplication | **Chosen** |
| Omit — trust key-level merge | DRY; but if project REPLACES global, `.env`-deny + bash-allow lost → security + headless break | Rejected as sole strategy |

**Rationale**: docs say project config "overrides" global (ambiguous merge vs replace) while agent perms explicitly "merge." `.env` security + headless stability justify defensive re-declaration. If merge confirmed during apply, drop `read`/`bash` for DRY.

### Decision: AGENTS.md — delete vs pointer

| Option | Tradeoff | Decision |
|--------|----------|----------|
| One-line pointer to `AGENT.md` | Safe for tools expecting `AGENTS.md`; minimal diff | **Chosen** |
| Delete entirely | Cleaner; risks broken references | Alternative after repoint confirmed |

## Data Flow

```
git commit ──→ GGA hook ──→ opencode run (headless)
                              ├─ opencode.json → instructions:["AGENT.md"] + read perms=allow
                              ├─ loads AGENT.md rules → reviewer standards
                              └─ reviewer reads files (no prompt) → emits STATUS: → STRICT_MODE accepts
GGA config RULES_FILE="AGENT.md" → injects AGENT.md (not placeholder)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `opencode.json` | Create | Headless permissions + `instructions:["AGENT.md"]` |
| `AGENT.md` | Modify | Consolidate enforceable rules from `.agent/rules/*.md` (English, backend stripped) |
| `AGENTS.md` | Modify | Reduce to one-line pointer |
| `.agent/rules/*.md` | Unchanged | Kept as source/history |
| `~/.config/gga/config` | Modify (documented, not in repo) | `RULES_FILE` line 15: `AGENTS.md`→`AGENT.md` |

## Interfaces / Contracts

### opencode.json (project root — new)

```json
{
  "$schema": "https://opencode.ai/config.json",
  "instructions": ["AGENT.md"],
  "permission": {
    "read": {
      "*": "allow",
      "**/.env": "deny",
      "**/.env.*": "deny",
      "**/credentials.json": "deny",
      "**/secrets/**": "deny",
      "*.env": "deny",
      "*.env.*": "deny"
    },
    "bash": {
      "*": "allow",
      "git commit *": "ask",
      "git push": "ask",
      "git push *": "ask",
      "git push --force *": "ask",
      "git rebase *": "ask",
      "git reset --hard *": "ask"
    },
    "glob": "allow",
    "list": "allow",
    "grep": "allow",
    "external_directory": "allow"
  }
}
```

`edit`/`write` unset → reviewer stays non-mutating.

### AGENT.md structure (consolidated — 9 spec areas)

1. **Project Scope** — tech stack (keep)
2. **Architecture (Screaming Architecture)** — features in `src/features/`, thin `src/app/`, no circular imports, `src/shared/` core
3. **Component Standards (Atomic Design)** — atoms/molecules/organisms; TS interfaces match Backend Watch model
4. **Backend Integration** — `X-Trace-Id` header on every API call; map errors to friendly UI messages
5. **Security & Forms** — no unencrypted PII in `localStorage`; validation mirrors Sequelize constraints
6. **Test Execution (Hardware-Aware)** — `npx vitest run --maxWorkers=2` only; stop background on hang
7. **Cross-Repo SSOT** — backend wins on discrepancy
8. **Branch Naming** — `frontend/{TICKET-ID}-{slug}`
9. **GGA Pre-commit Setup** — documents `RULES_FILE="AGENT.md"` in `~/.config/gga/config` (Req 4)
10. **SDD Workflow** — `/sdd-new`, `/sdd-continue`, `/sdd-ff`

**Stripped**: Antigravity agent ceremony, Strapi backend internals, Spanish → English.

### AGENTS.md (reduced)

```markdown
# AGENTS.md
→ See [AGENT.md](AGENT.md) for all project rules and coding standards.
```

### GGA config change (~/.config/gga/config, line 15)

```diff
- RULES_FILE="AGENTS.md"
+ RULES_FILE="AGENT.md"
```

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Static | `opencode.json` schema validity | Load `opencode` in project; no startup error |
| Integration | Headless permission grant | `opencode run` headless reading file outside cwd → no prompt |
| Security | `.env` still denied | Headless read on `.env` → denied (read rules survive) |
| E2E | GGA commit cycle | `git commit` (no `--no-verify`) trivial change → `STATUS:` emitted → succeeds |
| Manual | Reviewer prompt content | GGA verbose output has Atomic Design, `X-Trace-Id`, `--maxWorkers=2` (not placeholder) |

## Migration / Rollout

No migration. Steps: (1) commit `opencode.json` + `AGENT.md` + `AGENTS.md`; (2) edit `~/.config/gga/config` line 15 → `RULES_FILE="AGENT.md"`; (3) test trivial commit. Rollback: `git revert` + restore `RULES_FILE="AGENTS.md"`. Startup break: delete file or `OPENCODE_DISABLE_PROJECT_CONFIG=1`.

## Open Questions

- [ ] Confirm project-vs-global permission semantics (merge vs replace) during apply — defensive design mitigates either.
- [ ] Scope `external_directory` to `~/.config/**` + sibling repo vs blanket `allow`? Deferred (follow-up).
- [ ] Delete `AGENTS.md` once repoint confirmed? Pointer recommended for now.
