# Spec Deltas — security-hardening-review-cleanup

## Status: No deltas required

This change is a **test-only cleanup** with zero new requirements and zero modified requirements at the spec level.

The `proposal.md` Capabilities section is explicitly:

- **New Capabilities**: None.
- **Modified Capabilities**: None.

## Why no deltas

The four new test cases pin the public Spanish error strings of **existing** requirements:

| New test case | Pins existing requirement |
|---|---|
| `[FAV-W-7]` (PUT too_many) | `secure-route-authorization` -> `JWT Validation` chain (route-level 400 with the route-defined message) |
| GET-502 (`requireUser` returns 500) | `secure-route-authorization` -> `Consistent Authorization Errors` (502 + friendly message) |
| GET-network-throw (`requireUser` rejects) | `secure-route-authorization` -> `Consistent Authorization Errors` (502 + friendly message) |
| PUT-502 (`requireUser` returns 500) | `secure-route-authorization` -> `Consistent Authorization Errors` (502 + friendly message) |
| All four new cases (X-Trace-Id assertions) | `api-traceability` -> `Trace Id in Route Handlers` + `Trace Id on Errors` |

No requirement text changes. The byte-identical Spanish string pinning is an enforcement of the existing contract, not a new contract.

## Verification commands (for archive-time audit)

- `ls openspec/changes/2026-08-07-security-hardening-review-cleanup/specs/` should show ONLY `README.md` after archive.
- `openspec/specs/secure-route-authorization/spec.md` and `openspec/specs/api-traceability/spec.md` are NOT touched by this change.
