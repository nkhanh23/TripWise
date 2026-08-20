# TripWise Mobile (Personal AI Travel Mobile App)

React Native + TypeScript + Expo personal travel companion client for TripWise (theo [ADR-017](../DECISIONS.md#adr-017-react-native--typescript-as-primary-mobile-client) & [ADR-018](../DECISIONS.md#adr-018-simplify-tripwise-into-a-personal-mobile-app-using-supabase)).

**Current implementation/runtime target: Android.** The architecture remains iOS-compatible, but iOS runtime is not currently verified on the Windows development environment. Active roadmap: [`../PHASES_FE.md`](../PHASES_FE.md).

Kiến trúc mục tiêu tích hợp:
- **Supabase** (Auth + PostgreSQL + Edge Functions proxy cho Gemini AI).
- **Google Maps SDK** & **Google Places API** cho bản đồ và tra cứu địa điểm.
- **Open-Meteo API** & **OSRM** cho dự báo thời tiết và định tuyến.
- Không còn phụ thuộc vào Spring Boot monolith sau khi hoàn tất Phase P1.

## Prerequisites

- Node.js 24.x LTS and npm 11.x
- Android Studio, Android SDK, and an Android emulator or device for Android development
- macOS with Xcode is required only for future local iOS build/runtime verification

## Install

```powershell
cd mobile
npm install
```

## Environment

Copy `.env.example` to `.env` and set the Supabase public client configuration. Do not put server secrets or tokens in this file.

```powershell
Copy-Item .env.example .env
```

Set these values from the Supabase project's Connect panel:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

The publishable key is designed for client use only with RLS enabled. Never add a service-role key, Gemini key, Google server key, or database password to `mobile/.env`.

## Authentication

P2 uses Supabase Email/Password Auth. Sessions persist through Expo SecureStore
and are restored before the app renders the authenticated tab navigator.

Profiles are created by the database trigger in
`supabase/migrations/20260819010000_auth_profile_foundation.sql`. The client
also uses an idempotent, RLS-protected upsert only when a profile is missing.

After confirming the intended linked Supabase project, apply the P2 migration
from the repository root:

```powershell
npx supabase db push
```

## Start development server

```powershell
npm start
```

## Run Android

Start an emulator or connect a device, then run:

```powershell
npm run android
```

## Future iOS verification

The Expo config keeps iOS compatibility, but iOS is not the current implementation target. Local Simulator builds require macOS and Xcode. When an iOS verification task is explicitly scheduled:

```bash
npm run ios
```

## Quality checks

```powershell
npm run lint
npm run typecheck
npm test
```

## Project structure

```text
src/
├── app/          # App bootstrap and providers
├── api/          # Typed fetch client, config, and backend error mapping
├── components/   # Minimal shared primitives
├── features/     # End-user feature screens
├── navigation/   # Typed bottom-tab navigation
└── theme/        # TripWise design tokens
tests/            # Foundation tests
```

Current navigation uses React Navigation (not Expo Router) with Home, Explore, Plan, Trips and Profile tabs.

Legacy Dart/Flutter artifacts (`pubspec.*`, `lib/`, `test/`, `.dart_tool/`) may still be present in the shared worktree. They are not used by the Expo entry point or npm scripts and must only be removed by a separately approved cleanup task.

P2 persists Supabase sessions through Expo SecureStore. P3 adds a typed
`generateTrip` service under `src/features/planner/data/`; it invokes the
authenticated Supabase `generate-trip` function through the existing singleton
client. P3 intentionally does not add planner UI or persist generated trips.

The schema, Edge Function, and deployment instructions are documented in
[`../supabase/README.md`](../supabase/README.md).
