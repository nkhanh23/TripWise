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

Copy `.env.example` to `.env` and set the API address for the target runtime. Do not put server secrets or tokens in this file.

```powershell
Copy-Item .env.example .env
```

`EXPO_PUBLIC_API_BASE_URL` must point to the shared backend. For the Android emulator, use `http://10.0.2.2:8080/api/v1`; a physical device needs a reachable LAN address instead.

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

M1 intentionally contains only five navigation placeholders: Home, Explore, Plan Trip, My Trips, and Profile. Authentication, token persistence, maps, places, and business API integrations are deferred to their assigned mobile phases.
