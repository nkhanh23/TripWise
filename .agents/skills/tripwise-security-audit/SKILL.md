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
- In Supabase RLS, `TO authenticated` alone only restricts against unauthenticated callers; it provides **zero** isolation between different authenticated users unless paired with explicit ownership checks (`(select auth.uid()) = user_id`).

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
- **Ownership Predicates:**
  - `SELECT`: `TO authenticated USING ((select auth.uid()) = user_id)`
  - `INSERT`: `TO authenticated WITH CHECK ((select auth.uid()) = user_id)`
  - `UPDATE`: Requires **both** `USING ((select auth.uid()) = user_id)` and `WITH CHECK ((select auth.uid()) = user_id)` to prevent users from transferring rows to another user.
  - `DELETE`: `TO authenticated USING ((select auth.uid()) = user_id)`
- **SECURITY DEFINER Functions:**
  - Functions executing as `SECURITY DEFINER` run with creator privileges. They MUST explicitly set `SET search_path = public, pg_temp` to prevent search path hijacking.
  - Verify that `SECURITY DEFINER` functions validate the caller's identity via `auth.uid()` internally.
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
