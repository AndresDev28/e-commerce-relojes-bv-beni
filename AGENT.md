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

## Architecture (Screaming Architecture)

Structure code so the business domain (Catalog, Checkout, Shipping, Payments) is obvious before the technology.

- **Routes (`src/app/`)**: Thin delivery layer only — page UI, layouts, and metadata. No business logic.
- **Features (`src/features/`)**: Domain-driven vertical slices — `cart/`, `catalog/`, `checkout/`, `favorites/`, `orders/`.
  - Each feature exposes a public API (`index.ts`) and hides internals (`components`, `hooks`, `services`, `utils`).
  - Features MUST NOT have circular imports between each other.
- **UI Components (`src/components/`)**: Shared React components organized with atomic design.
- **Context (`src/context/`)**: React context providers for cross-cutting state.
- **Lib (`src/lib/`)**: Third-party and service integrations (e.g., Stripe, Resend, Strapi clients) plus global config.
- **Emails (`src/emails/`)**: React Email templates.
- **Utils (`src/utils/`)**: Generic helpers and math utilities.
- **Types (`src/types/`)**: Shared TypeScript type definitions.

## Component Standards (Atomic Design)

- Use **atoms → molecules → organisms** structure for component organization.
- **TypeScript interfaces are mandatory** for every component. If a component receives a "Watch" object, its interface MUST match the Backend Watch model.

## Backend Integration

- **X-Trace-Id header**: Every API call (Axios/Fetch) MUST include `X-Trace-Id` in headers for global traceability.
- **Error mapping**: Never show cryptic technical errors (e.g., "500 Internal Server Error") to users. Map backend errors to friendly UI messages.

## Security & Forms

- **PII protection**: Never persist Redux/Zustand state containing personal data in `localStorage` without encryption or a short expiration policy.
- **Form validation**: Client-side validation MUST mirror Sequelize constraints defined in the backend to avoid unnecessary server round-trips.

## Test Execution (Hardware-Aware)

- **Vitest command**: Always use `npx vitest run --maxWorkers=2`. Running `npx vitest` without worker limits is prohibited — it saturates RAM on high-core-count hardware.
- **Hang recovery**: If the system hangs or lags during test execution, stop background processes and check the Node PID before retrying.

## Cross-Repo SSOT

Backend rules are authoritative for integration decisions. On any discrepancy, backend wins.

```
See ../e-commerce-relojes-bv-beni-api/.agents/rules/bv-beni-watch-store.md for:
- API contracts
- Business logic decisions
- Integration patterns
```

## Branch Naming

Follow format: `frontend/{TICKET-ID}-{description-slug}`

## GGA Pre-commit Setup

This project uses Gentleman Guardian Agent (GGA) for automated pre-commit reviews.

**Required global config change** (one-time setup per developer):

Edit `~/.config/gga/config`, line 15:

```
RULES_FILE="AGENT.md"
```

This ensures GGA loads the consolidated rules from `AGENT.md` instead of the placeholder `AGENTS.md`.

**Escape hatch**: If opencode config breaks and won't start, run with `OPENCODE_DISABLE_PROJECT_CONFIG=1` to skip the project's `opencode.json` and load globals only.

## SDD Workflow

Use Spec-Driven Development for substantial features:

- `/sdd-new {change}` → explore + propose
- `/sdd-continue [change]` → next phase
- `/sdd-ff [change]` → fast-track through all phases
