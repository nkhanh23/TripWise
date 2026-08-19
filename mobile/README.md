# TripWise Mobile (Personal AI Travel Mobile App)

React Native + TypeScript + Expo personal travel companion client for TripWise (theo [ADR-017](../DECISIONS.md#adr-017-react-native--typescript-as-primary-mobile-client) & [ADR-018](../DECISIONS.md#adr-018-simplify-tripwise-into-a-personal-mobile-app-using-supabase)).

Kiến trúc mục tiêu tích hợp:
- **Supabase** (Auth + PostgreSQL + Edge Functions proxy cho Gemini AI).
- **Google Maps SDK** & **Google Places API** cho bản đồ và tra cứu địa điểm.
- **Open-Meteo API** & **OSRM** cho dự báo thời tiết và định tuyến.
- Không còn phụ thuộc vào Spring Boot monolith sau khi hoàn tất Phase P1.

## Prerequisites

- Node.js 24.x LTS and npm 11.x
- Android Studio, Android SDK, and an Android emulator or device for Android development
- macOS with Xcode for local iOS Simulator development

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

## Start development server

```powershell
npm start
```

## Run Android

Start an emulator or connect a device, then run:

```powershell
npm run android
```

## Run iOS

Local iOS Simulator builds require macOS and Xcode. On macOS:

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

P1 deliberately disables client session persistence. P2 will add a SecureStore-backed session adapter before login and session UX are implemented. The schema and RLS policies are in [`../supabase/migrations`](../supabase/migrations); use [`../supabase/README.md`](../supabase/README.md) after a real project is available to link it, apply migrations, and generate database types.
