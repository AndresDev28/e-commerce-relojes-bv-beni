# AGENT.md — BV Beni Watch Store Frontend

## Project Scope

Next.js 15 App Router + React 19 + Strapi CMS + Stripe + Resend

## Repository Hierarchy

1. **Backend → SSOT**: `../e-commerce-relojes-bv-beni-api/.agents/`
2. **Frontend → Consumer**: This project inherits rules from backend
3. **Global → Foundation**: `~/.config/opencode/AGENTS.md` + skills/

## Skills Registry

| Skill         | Location                   | When to Use                          |
| ------------- | -------------------------- | ------------------------------------ |
| sdd-init      | ~/.config/opencode/skills/ | Initialize SDD in project            |
| sdd-explore   | ~/.config/opencode/skills/ | Explore features before implementing |
| sdd-propose   | ~/.config/opencode/skills/ | Create change proposals              |
| sdd-spec      | ~/.config/opencode/skills/ | Write specifications                 |
| sdd-design    | ~/.config/opencode/skills/ | Create technical design              |
| sdd-tasks     | ~/.config/opencode/skills/ | Break down implementation tasks      |
| sdd-apply     | ~/.config/opencode/skills/ | Implement changes                    |
| sdd-verify    | ~/.config/opencode/skills/ | Verify implementations               |
| sdd-archive   | ~/.config/opencode/skills/ | Archive completed changes            |
| skill-creator | ~/.config/opencode/skills/ | Create new AI skills                 |

## Override Rules (Frontend-Specific)

These rules extend global config and take precedence for this project:

- `.agent/rules/frontend-react.md`: Atomic design, PII protection, X-Trace-ID headers
- `.agent/rules/hardware-aware.md`: Vitest maxWorkers=2 for i7-HX stability
- `.agent/rules/screaming-architecture.md`: Features in `src/features/`, thin routes in `src/app/`

## Branch Naming (per Backend SSOT)

Follow format: `frontend/{TICKET-ID}-{description-slug}`
As defined in: `../e-commerce-relojes-bv-beni-api/.agents/rules/bv-beni-watch-store.md`

## Cross-Repo Reference

Backend rules are authoritative for integration decisions:

```
See ../e-commerce-relojes-bv-beni-api/.agents/rules/bv-beni-watch-store.md for:
- API contracts
- Business logic decisions
- Integration patterns
```

## SDD Workflow

Use Spec-Driven Development for substantial features:

- `/sdd-new {change}` → explore + propose
- `/sdd-continue [change]` → next phase
- `/sdd-ff [change]` → fast-track through all phases
