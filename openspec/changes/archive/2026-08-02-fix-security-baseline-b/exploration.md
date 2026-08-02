## Exploration: fix-security-baseline-b

### Current State

`npm audit --json` confirms the post-DEBT-10 baseline: **3 high findings, 0 critical, 0 low/moderate**. All three are development-dependency findings.

| Audit key | Current resolution and path | Vulnerable range / fixed version |
|---|---|---|
| `@react-email/preview-server` | Direct devDependency declared as `^5.1.0`; lockfile resolves `5.2.11`. It depends on exact nested `next@16.2.3` and `esbuild@0.27.4`. | Package range `>=5.0.0-canary.0`; audit recommends `4.3.2` with `isSemVerMajor: true`. |
| `next` | Transitive only at `node_modules/@react-email/preview-server/node_modules/next`; top-level application `next` is `15.5.21` and is not the vulnerable node. | Nested `16.2.3` is in the vulnerable `16.0.0 - 16.2.10` range. The audit fix path is the `@react-email/preview-server` change, not the top-level Next dependency. |
| `storybook` | Direct devDependency resolved at `9.0.16`. | Advisories affect `>=9.0.0 <9.1.17` and `>=8.7.0-alpha.0 <9.1.19`; audit recommends `9.1.20` with `isSemVerMajor: false`. |

The roadmap wording is slightly inaccurate: the audit key is `storybook`, not `@storybook/react-vite`. The repository has no direct `@storybook/react-vite` entry; it is nested under `@storybook/nextjs-vite`. The direct Storybook family is pinned at `9.0.16` (`storybook`, `@storybook/addon-a11y`, `addon-docs`, `addon-onboarding`, `addon-vitest`, `@storybook/nextjs-vite`, and `eslint-plugin-storybook`), and `@storybook/nextjs-vite` pins `@storybook/react-vite`, `@storybook/react`, and `@storybook/builder-vite` to `9.0.16`. A safe Storybook update should therefore preserve family alignment rather than change only one nested package.

`package.json` currently contains the DEBT-10 override block, already alphabetized:

```text
@babel/core, brace-expansion, esbuild, fast-uri, js-yaml, postcss, sharp, ws
```

The six canonical `security-baseline` requirements are unchanged: the Vitest trio floor, `js-yaml` override, `@babel/core` override, Trivy gate, manifest-only scope, and alphabetical overrides. They remain applicable to this follow-up. New delta requirements are needed for the Storybook baseline and the React Email preview dependency path. The purpose text's phrase "five in-scope packages" should be generalized if the capability is being broadened; none of the six existing pass conditions needs to be weakened or replaced.

The Storybook configuration is conventional and small:

- `.storybook/main.ts` uses `@storybook/nextjs-vite`, addons for Chromatic, docs, onboarding, a11y, and Vitest, and discovers `src/**/*.stories.*`.
- `.storybook/preview.ts` imports the global stylesheet and uses standard controls/a11y parameters.
- `.storybook/vitest.setup.ts` calls `setProjectAnnotations` with the a11y and project annotations.
- Seven story files exist. The framework stories import `Meta`/`StoryObj` from `@storybook/nextjs-vite`; UI stories import them from `@storybook/react`; interaction and spy APIs come from `storybook/test`. They use standard CSF, autodocs, controls, and one interaction test. No story imports `@storybook/react-vite` directly or uses a package-specific internal API. This makes the 9.0.16 to 9.1.20 transition low-risk at the source level, but the framework/addon/peer package family must be upgraded coherently and then smoke-tested.

The email preview workflow is less complete than the documentation suggests:

- `package.json` has no `email:dev` or `dev:email` script, and no `storybook` script either.
- `CLAUDE.md` and `docs/email-system.md` refer to `npm run email:dev`, but that command is not currently defined. The project templates live under `src/emails/`, while the React Email CLI defaults to `./emails`.
- `react-email@5.1.0` exposes the `email` binary. Its `email dev` command resolves `@react-email/preview-server` from the user project, imports its exported version, and requires exact equality with the CLI's own version; a mismatch prompts to install the matching preview-server and exits. This is a runtime compatibility check, not a peer dependency.
- The installed `@react-email/preview-server@5.2.11` has no peerDependencies and hard-depends on `next@16.2.3`; the installed `react-email` CLI is `5.1.0`, so the current caret ranges already resolve to a CLI/server version mismatch. Moving the server to the audit-recommended `4.3.2` without aligning the CLI would trigger the same guard and is not a verified working preview workflow. The proposal must first confirm whether the supported fixed pair is `react-email@4.3.2` plus `@react-email/preview-server@4.3.2`, or another supported pair that removes the vulnerable nested Next.

`.github/workflows/security.yml` runs npm audit as a non-blocking report (`continue-on-error: true`) and runs Trivy with `severity: HIGH,CRITICAL` and `exit-code: "1"`. The workflow does not modify dependency resolution and has no explicit cascade workaround. The three current audit nodes are all marked `dev: true`; the top-level production Next node is clean. Consistent with Engram #1400 and the merged DEBT-10 CI evidence, these findings are expected not to produce a new production-dependency Trivy cascade. The Trivy job must still be rerun on each PR because it is the blocking security gate.

The archived DEBT-10 precedent remains useful: manifest/lockfile-only implementation, alphabetized overrides, and the ordered six-step local gate (`npm audit` -> Vitest with `--maxWorkers=2` -> Next build -> lint -> diff scope -> alphabetical check), followed by the remote Trivy gate. No tests were run during this read-only exploration.

### Affected Areas

- `package.json` — likely synchronized Storybook family version changes and the React Email CLI/preview-server compatibility decision; preserve the existing alphabetical override block.
- `package-lock.json` — regenerated dependency graph; expected to remove the nested vulnerable Next path and update Storybook packages.
- `.storybook/main.ts`, `.storybook/preview.ts`, `.storybook/vitest.setup.ts` — read-only compatibility surface for the Storybook minor update; no source edit is currently indicated.
- `src/**/*.stories.*` — seven standard CSF stories and one interaction test; verify after the Storybook family bump, especially framework/addon loading and `storybook/test` APIs.
- `src/emails/`, `docs/email-system.md`, `CLAUDE.md` — preview workflow evidence. The docs claim a script that the manifest does not define; this is a pre-existing workflow/documentation mismatch, not an implementation change to assume in this security slice.
- `.github/workflows/security.yml` — unchanged blocking Trivy gate; verify remotely rather than modifying the workflow.
- `openspec/specs/security-baseline/spec.md` — existing six requirements remain valid. Add delta requirements for the `storybook` high-finding baseline and the React Email preview-server/nested-Next baseline; consider a small purpose-text generalization from five packages to the full in-scope set.
- Delivery controls — GH013 blocks direct pushes to `main`; use PR-based delivery with the repository branch convention and the branch-pr issue/type-label checks. Do not mix the two delivery strategies after selection.

### Approaches

1. **Single-PR manifest-only bump** — update the synchronized Storybook family and the React Email preview dependency path together, regenerate `package-lock.json`, and run one verification gate as in DEBT-10.
   - Pros: one dependency graph transition and rollback; one PR/CI cycle; follows the successful DEBT-10 precedent; no source or workflow changes.
   - Cons: couples a low-risk Storybook minor update to a high-risk React Email major-line transition; the current CLI/server version guard is an unresolved compatibility boundary; synchronized Storybook packages may create substantial lockfile churn; a failure makes the whole PR harder to review and bisect.
   - Complexity: Medium-High.
   - Change-line forecast: approximately 8-12 manifest lines plus roughly 350-650 lockfile lines, or about 360-660 authored changed lines. This is a medium/high risk against the 400-line review budget and must be measured after dependency resolution.

2. **Split PRs (chained work units)** — first update the aligned Storybook family to `9.1.20`; then update the React Email CLI/preview-server pair and remove the nested vulnerable Next path. Keep the second PR dependent on the first only if the selected branch strategy requires it.
   - Pros: isolates the Storybook minor and React Email major risk; allows the Storybook finding to land independently; each PR has a focused rollback and verification surface; a preview-server failure does not block the already-safe Storybook update; each slice is more likely to stay below 400 changed lines.
   - Cons: two lockfile/CI cycles and two reviews; the first PR temporarily leaves the React Email findings; shared dependency resolution may be repeated; the second PR still needs a product decision about the CLI/server version pair and the currently undocumented/undefined email script.
   - Complexity: Medium overall, with the second slice High risk.
   - Change-line forecast: Storybook approximately 160-350 lines (manifest plus lockfile); React Email approximately 120-300 lines if CLI/server alignment is a small manifest change. Combined authored churn may be 280-650 lines, but each PR has a separate review and rollback boundary.

### Recommendation

Recommend **Approach B, split into two focused PR work units**. This is not because a break has already been observed—the exploration is read-only—but because the repository exposes a real compatibility boundary: `react-email` checks exact runtime version equality with `@react-email/preview-server`, while the audit fix crosses from the current 5.x line to `4.3.2`. The Storybook audit finding is independent and can be handled as a synchronized 9.1.20 family update with low source-level risk.

The proposal phase should lock these corrections before implementation:

1. Treat `storybook` as the audited package and update the complete direct Storybook family, not only the nested `@storybook/react-vite` package.
2. Verify the supported React Email fixed pair before editing the manifest. Do not ship `@react-email/preview-server@4.3.2` alone while `react-email@5.1.0` enforces exact version matching.
3. Keep implementation manifest-only unless the preview smoke test proves that the existing documentation/script mismatch requires a separately scoped workflow repair.
4. Reuse the DEBT-10 six-step gate for each PR, with focused Storybook and React Email preview smoke checks added after the dependency graph is regenerated. Use the mandatory `npx vitest run --maxWorkers=2` command; never run raw Vitest.
5. Run the remote Trivy gate on both PRs. No additional production-dependency fix is currently indicated by the audit paths, but the blocking gate remains authoritative.

### Risks

- The audit-recommended `@react-email/preview-server@4.3.2` is a major-line transition relative to the declared 5.x range and may be semantically a downgrade; its compatibility with `react-email@5.1.0` is not established.
- The current installed CLI/server pair is already mismatched (`react-email` 5.1.0 versus preview-server 5.2.11), so a failing preview smoke test may expose pre-existing workflow debt rather than a regression from this change.
- `npm run email:dev` is documented but absent from `package.json`; the actual CLI invocation and correct template directory are not wired as repository scripts.
- Storybook packages have exact inter-package version pins and peer ranges. Updating only `storybook` or only `@storybook/nextjs-vite` risks a mixed 9.0/9.1 graph; update the family consistently and verify annotations, addons, autodocs, and the interaction story.
- Lockfile churn may exceed the 400-line budget, particularly if the preview-server major change alters the nested Next/SWC tree. If a slice exceeds the budget or cannot be independently reviewed, retain the chained strategy rather than forcing a single PR.
- Trivy's dev-dependency filtering behavior is historical/project-observed rather than encoded explicitly in `security.yml`; a new Trivy database result could still expose a finding, so CI verification cannot be skipped.
- The existing manifest-only requirement should not be interpreted as permission to edit source or workflows to compensate for a dependency incompatibility. If the email CLI requires a workflow repair, that is a separate change boundary.

### Ready for Proposal

Yes. The change is ready for `sdd-propose` with **split delivery recommended**, provided the proposal explicitly resolves the React Email CLI/preview-server version pair and scopes the Storybook update to the aligned package family. The proposal should add delta requirements for the two new audit baselines (and a preview CLI/server compatibility scenario if the workflow is treated as in-scope), while retaining the six existing requirements unchanged. No source-code, workflow, or test-config modification is justified by the current evidence.

skill_resolution: "paths-injected"
