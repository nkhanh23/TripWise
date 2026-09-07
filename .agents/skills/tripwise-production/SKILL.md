---
name: tripwise-production
description: TripWise production architecture, implementation, refactoring, data flow, and code modification guidelines. Activates on tasks involving React Native implementation, refactoring, mobile features, Supabase integration, data flow boundaries, or behavior changes in TripWise.
license: MIT
metadata:
  author: TripWise
  version: 1.0.0
---

# TripWise Production Standards

This skill governs all code implementation, refactoring, architecture, and feature integration within the TripWise repository. It enforces core production contracts and complements `AGENTS.md`, active ADRs in `DECISIONS.md`, and `docs/05-engineering/react-native-coding-rules.md`.

Always consult current live local project documents and source code for exact contracts before modifying code.

---

## 1. Production Source of Truth & Stack

- **Mobile Client:** React Native + TypeScript (strict) + Expo (`mobile/`).
- **Navigation:** React Navigation. **DO NOT** introduce or switch to Expo Router.
- **Runtime Target:** Android is the current build, target, and runtime verification platform. Keep platform boundaries clean; preserve future iOS compatibility.
- **Production Backend:** Supabase (Managed PostgreSQL + Row Level Security + Supabase Auth + Supabase Edge Functions in Deno/TypeScript).
- **External Providers:**
  - **Secret-bearing APIs:** Google Gemini and Google Places server-side calls MUST be proxied through Supabase Edge Functions with secrets stored in Supabase Vault. Secrets must NEVER be bundled in client code.
  - **Public APIs:** OSRM and Open-Meteo are called directly from mobile client with appropriate timeouts, cancellation (`AbortController`), and fallbacks.
- **Legacy Components (Frozen / Reference Only):**
  - `backend/` (Java 21 + Spring Boot): Legacy reference only. Never add new features or endpoints.
  - `web/` (React + Vite): Legacy visual reference only.
  - Flutter / Dart artifacts: Historical reference only.

---

## 2. Required Data Flow & Boundaries

All data interactions must strictly follow a unidirectional layered pipeline:

```
Screen (UI / Presentation)
  ↓
Hook / Feature Controller (State & Orchestration)
  ↓
Repository (Data access abstraction)
  ↓
Validated Transport Boundary (Schema validation & DTO mapping)
  ↓
Supabase Client / Direct Public Provider
```

### Boundary Rules
- **No Raw Leaks:** Never pass raw PostgREST rows, raw Edge Function payloads, or raw third-party responses directly into JSX components.
- **Validation:** Validate external responses at the transport boundary before transforming into typed domain models.
- **Isolation:** Components must only consume clean, typed domain models or view models.

---

## 3. Production Real-Data Rule

Production runtime must operate on real data.

- **Strictly Forbidden:** Never restore fake, mock, or fixture runtime behavior merely to:
  - Make a marker appear on the map
  - Make an image appear
  - Avoid an empty state
  - Make a test pass
- **Never Fabricate Provider Data:** Never fabricate Google Place IDs, geographical coordinates, user reviews, ratings, provider metadata, or provider image URLs.
- **Allowed Fixtures:** Test fixtures and mock data are strictly confined to test suites (`__tests__/`) or an explicitly isolated fixture/demo mode.
- **Editorial Content:** Curated editorial placeholders must be explicitly designated and clearly distinct from provider-owned real data.

---

## 4. Preserve Accepted Behavior

Never regress existing, tested, and accepted capabilities:

1. **Auth & Session Isolation:** Strict `auth.uid()` ownership, secure token storage via `expo-secure-store`, stale-user state purge on logout or session change.
2. **Database & RLS:** All tables must have Row Level Security enabled. Never bypass RLS or assume authenticated users are authorized.
3. **Integration Contracts:** Map rendering, route calculation via OSRM, weather forecasts via Open-Meteo, saved places, and image caching.
4. **Theme System:** Semantic color tokens only (`background.canvas`, `text.primary`, `brand.primary`, etc.). No raw hex codes (`#FFFFFF`, `#000000`, etc.) in feature components.
5. **Localization:** Centralized English/Vietnamese dictionaries (`en`, `vi`). No inline language conditions in JSX (`lang === 'vi' ? ... : ...`). Layouts must remain resilient to text expansion.
6. **Accessibility:** Minimum touch target 44x44 pt/dp, proper `accessibilityRole` and `accessibilityLabel` on interactive elements.

---

## 5. Git & Workspace Safety

- **Preserve Local Changes:** Always inspect and preserve existing local worktree state.
- **Strictly Forbidden Operations:**
  - `git reset` / `git reset --hard`
  - `git checkout .` / `git restore`
  - `git clean`
  - `git stash`
  - Discarding, reverting, rebasing, committing, or pushing without explicit task instruction.
