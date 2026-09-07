---
name: tripwise-runtime-closure
description: Task closure, verification protocol, quality gate execution, and runtime evidence collection for TripWise. Activates on closing implementation tasks, resolving regressions, finalizing integrations, validating Android runtime, or preparing completion reports.
license: MIT
metadata:
  author: TripWise
  version: 1.0.0
---

# TripWise Runtime Closure & Verification Protocol

This skill defines the mandatory verification gates, evidence standards, and closure protocols before any implementation, refactoring, or bug-fix task in TripWise can be marked complete.

---

## 1. Cardinal Verification Rule

- **Evidence Over Assumption:** Never mark a task complete or claim a bug is resolved based merely on static source inspection or unverified assumption.
- **Strict Evidence Standard:** Never convert an unverified hypothesis or speculative fix into "VERIFIED" without concrete execution output.

---

## 2. Quality Gates Execution

### Mobile Frontend Quality Gates
When code inside `mobile/` is modified, run the standard suite:

```powershell
cd mobile
npm run lint
npm run typecheck
npm test -- --runInBand
npx expo-doctor
```

If the task alters native configuration, permissions, or native dependencies, verify the Android build:

```powershell
cd mobile
npm run android
```

### Supabase Edge Functions Quality Gates
When Edge Functions (`supabase/functions/`) are within task scope:

```powershell
deno check <entrypoint.ts>
deno lint <directory>
deno test <test-file.ts>
```

Do NOT execute unrelated paid third-party provider smoke tests (e.g. Gemini paid tiers, Google Places paid calls) unless the task explicitly requires live provider smoke testing.

---

## 3. Runtime Verification Requirement

When acceptance criteria require functional runtime behavior, static code inspection and unit tests are insufficient. Live runtime verification must be gathered:

- **Android Runtime:** Verify that the current local JavaScript bundle compiles and loads cleanly in Metro without red screens or unhandled exceptions.
- **UI & Navigation:** Confirm user interactions (touches, form inputs, sheet presentations, transitions) succeed and that navigation stacks remain intact.
- **Backend / Edge Functions:** Confirm live RPCs and Edge Functions respond with expected schemas and valid HTTP status codes.
- **Evidence Capture:** Collect log traces, Metro bundler outputs, terminal execution results, or screenshots adequate to prove the acceptance criteria.

---

## 4. Evidence Classification Standard

All verification statements in final reports MUST classify the level of evidence using these exact tags:

| Evidence Tag | Definition |
| :--- | :--- |
| **`VERIFIED FROM SOURCE`** | Confirmed through static TypeScript typing, file inspection, and AST analysis. |
| **`VERIFIED FROM TEST EVIDENCE`** | Confirmed by automated test suites (`npm test`, `deno test`) with passing output. |
| **`VERIFIED FROM ANDROID RUNTIME`** | Confirmed by live execution on Android emulator/device, Metro bundle loading, or native interaction. |
| **`VERIFIED FROM LIVE PROVIDER`** | Confirmed by direct responses from live Supabase, OSRM, or Open-Meteo services. |
| **`NOT RUN`** | Not executed because it was out of scope for the current task. |
| **`BLOCKED`** | Execution was prevented by environment, toolchain, or external dependency failure (detailed in report). |
| **`INSUFFICIENT EVIDENCE`** | Evidence collected was partial or inconclusive to fully substantiate completion. |

---

## 5. Mandatory Task Closure Checklist

Before concluding:
1. Verify no unintended files or dirty states exist in `git status`.
2. Confirm no secrets, API keys, or personal tokens are present in committed or changed files.
3. Confirm all active project rules (`AGENTS.md`, ADRs, and React Native coding rules) are respected.
4. Format the final output strictly following the `AGENTS.md` reporting structure (Summary, Files changed, Database migration, Endpoints, How to test, Scalability check, Test result).
