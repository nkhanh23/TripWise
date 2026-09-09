---
name: tripwise-security-audit
description: Security auditing, vulnerability prevention, and authorization review for Supabase, Auth, PostgreSQL RLS, RPC functions, Edge Functions, and external providers. Activates on tasks involving authentication, authorization, RLS policies, migrations, Edge Functions, user profile security, or API secret isolation in TripWise.
license: MIT
metadata:
  author: TripWise
  version: 1.0.0
---

# TripWise Security Audit & Authorization Review

This skill governs security inspections, vulnerability audits, and safe data boundary implementation across TripWise mobile client, Supabase database, Row Level Security (RLS), Edge Functions, and external integrations.

---

## 1. Cardinal Rule: Authenticated ≠ Authorized

- **Never** mark an endpoint, RPC function, query, or screen safe merely because the user possesses a valid authentication session or JWT.
- Every read, update, insert, and delete operation MUST enforce strict identity-based authorization (resource ownership).
- In Supabase RLS, `TO authenticated` alone only restricts against unauthenticated callers; it provides **zero** cross-user isolation unless paired with explicit canonical ownership verification (direct owner checks or trusted parent graph checks).

---

## 2. Supabase Auth & Session Isolation

- **Secure Token Storage:** Mobile client session tokens MUST reside in secure hardware storage via `expo-secure-store`. Plaintext storage in `AsyncStorage` is strictly prohibited.
- **Stale-User Isolation:** On logout, token expiration, or user account switch, all in-memory caches, local query caches, and user-specific storage MUST be completely wiped to prevent data leaking to the next authenticated session.
- **JWT & Metadata Hygiene:**
  - Never trust user-editable `raw_user_meta_data` for authorization decisions.
  - Rely exclusively on validated `auth.uid()` or database-backed role assignments.
  - Keep access token lifetimes short; do not expose refresh tokens to untrusted layers.

---

## 3. Database, RLS & RPC Security Checklist

When inspecting or creating database tables, migrations, and functions:

- **RLS Enforcement:** Verify that every table in the `public` schema has `ENABLE ROW LEVEL SECURITY` turned on.
- **Canonical Ownership Paths & RLS Predicates:**
  - **Follow Canonical Ownership:** Authorization MUST follow the resource's actual canonical ownership relationship in the current LIVE LOCAL schema:
    - **Primary / Direct Identity Resources (e.g. `profiles`):** Ownership matches `(select auth.uid()) = id`.
    - **Direct-Owner Root Resources (e.g. `trips`, `saved_places`):** Ownership matches `(select auth.uid()) = user_id`.
    - **Child Resources (e.g. `itinerary_days`, `trip_expenses`):** Ownership must be derived through their trusted parent relationship to the owner trip (e.g. `exists (select 1 from public.trips where trips.id = itinerary_days.trip_id and trips.user_id = (select auth.uid()))`).
    - **Deeper Child Resources (e.g. `itinerary_items`, `itinerary_item_source_links`):** Ownership must be derived through the canonical parent graph (e.g. item -> day -> trip or item -> trip).
  - **No Duplicated Ownership State:** Never add a `user_id`, owner column, or parallel ownership field to a child table merely to simplify an RLS expression. Do not denormalize ownership unless an explicitly authorized architecture/data task proves it necessary. Duplicated ownership fields can drift out of sync with the parent record and do not increase security.
  - **RLS Operation Semantics:**
    - `SELECT`: Requires an owner-scoped `USING` predicate matching the table's canonical ownership path.
    - `INSERT`: Requires an owner-scoped `WITH CHECK` predicate matching the table's canonical ownership path.
    - `UPDATE`: Requires correct owner scoping in **both** `USING` and `WITH CHECK` whenever caller-modifiable ownership or relationship context exists (preventing row reassignment across users or parent trips).
    - `DELETE`: Requires an owner-scoped `USING` predicate matching the table's canonical ownership path.
    - For child resources, an `EXISTS` ownership check through trusted parent relationships is valid and expected when matching current schema contracts.
  - **Preserve Accepted RLS Contracts:** Never rewrite an accepted RLS policy or migration merely to normalize it to an alternative stylistic ownership form. Applied migrations remain forward-only. If current production policy is already correct and tested, preserve it unless concrete evidence identifies a security defect.
- **SECURITY DEFINER Functions & Search Path Hardening:**
  - Functions executing as `SECURITY DEFINER` run with elevated/creator privileges. They MUST explicitly set a safe, pinned `search_path` appropriate to the function contract to prevent search path hijacking. Never rely on an attacker-controlled, mutable, or default search path.
  - **Recognized Safe Pinned Patterns:** TripWise migrations legitimately use explicitly pinned forms matching the function contract, including:
    - `SET search_path = ''` with fully-qualified object references (e.g. `public.profiles`, `auth.users`) — as seen in accepted profile/account deletion hardening functions.
    - `SET search_path = pg_catalog`
    - `SET search_path = pg_catalog, public`
    - Another explicitly justified safe pinned path matching the current function contract.
  - **No Universal Syntax Mandate:** Do not prescribe one universal `search_path` syntax across all routines. Preserve already accepted hardened function contracts unless concrete evidence requires a forward-only corrective migration. Never rewrite an accepted migration merely to normalize syntax.
  - **Comprehensive Privilege Review:** Review function body qualification, grants, internal caller ownership checks (`auth.uid()`), RLS interactions, and privilege scope together.
  - Verify that `SECURITY DEFINER` functions validate the caller's identity via `auth.uid()` internally whenever user-scoped data or mutations are involved.
- **RPC Grants & Exposure:**
  - Do not grant execute on RPC functions to `PUBLIC` or `anon` unless the routine is explicitly designed for unauthenticated public use.
  - Revoke default public execute privileges where appropriate.

---

## 4. Edge Functions & API Secrets Isolation

- **Zero Secret Exposure:**
  - `GEMINI_API_KEY`, Google Maps/Places server keys, and `SUPABASE_SERVICE_ROLE_KEY` must NEVER exist in client-side code, Expo bundles, or `EXPO_PUBLIC_*` environment variables.
  - All secret-bearing operations must be mediated by Supabase Edge Functions with keys injected via Supabase Vault/Secrets.
- **Provider Provenance & Client Spoof Prevention:**
  - Edge Functions must validate the incoming authorization header (`jwt`) before executing costly AI or external provider requests.
  - Never allow clients to spoof IDs, cost quotas, or user metadata in Edge Function payloads.
- **Error Sanitization:**
  - Catch and sanitize all external API and database errors at the function boundary.
  - Never return stack traces, internal database schema details, SQL statements, or raw upstream provider error messages to the client.

---

## 5. Input Validation & Data Boundaries

- **Input Validation:**
  - All Edge Function payloads and RPC arguments must undergo strict schema validation (types, bounds, enum checks, required fields).
  - Reject unexpected fields.
- **Output Scrubbing:**
  - Never return password hashes, internal secret tokens, or audit metadata belonging to other users.
- **Destructive Operations:**
  - Account deletion, trip deletion, or bulk data purge operations must strictly affect the caller's own records (`auth.uid()`).

---

## 6. Logging & Telemetry Hygiene

- **Log Sanitization:**
  - Never log passwords, tokens, API keys, authorization headers, refresh tokens, or personally identifiable information (PII).
  - Outgoing external request logs must mask query parameters and headers containing credentials.

---

## 7. Audit Evidence Requirement

- Do not claim an operation or change is "secure" based solely on visual inspection.
- Require concrete verification evidence:
  - Negative test case proving that an unauthorized user receives an authorization error (e.g. 403 Forbidden or 0 rows).
  - Positive test case proving that the legitimate owner can access their resource.
