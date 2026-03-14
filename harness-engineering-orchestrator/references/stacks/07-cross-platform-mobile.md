# 07 Cross-Platform Mobile — Expo + React Native

## Init

```bash
npx create-expo-app@latest [NAME]
```

Requires Expo SDK 52+. The template produces a working app with file-based routing out of the box.

## Routing

**Expo Router** — file-based routing from the `app/` directory. Supports nested layouts, dynamic segments, and typed routes.

## State Management

**Zustand** — lightweight, hook-based stores. One store per domain concern under `stores/`.

## UI Framework

Choose one:
- **NativeWind** (Tailwind CSS for React Native) — familiar utility classes, compiles to native styles
- **Tamagui** — optimizing compiler for cross-platform UI with theme tokens

## Navigation

Tab / Stack / Drawer layouts via **Expo Router layout groups**:
- `(tabs)/` — tab navigator
- `(drawer)/` — drawer navigator
- Stack is the default for non-grouped routes

## Storage

| Use case | Package |
|----------|---------|
| Sensitive tokens | `expo-secure-store` |
| General persistence | `@react-native-async-storage/async-storage` |
| Local relational data | `expo-sqlite` |

## Networking

**TanStack Query** + `fetch` for data fetching, caching, and background sync.

## Auth

**Expo AuthSession** combined with:
- **Clerk** (managed auth with social login, MFA)
- **Supabase Auth** (open-source alternative)

## Push Notifications

**expo-notifications** + **EAS Push** for cross-platform push delivery.

## Images

**expo-image** — performant image component with caching, blurhash placeholders, and content-fit modes.

## Project Structure

```
app/                    # Expo Router file-based routing
├── (tabs)/             # Tab layout group
│   ├── index.tsx
│   ├── explore.tsx
│   └── _layout.tsx     # Tab config
├── [id].tsx            # Dynamic route
├── _layout.tsx         # Root layout
└── +not-found.tsx
components/
hooks/
stores/                 # Zustand stores
services/               # API layer
constants/              # Theme, config
assets/
```

## Build & Deploy

- **EAS Build** — cloud builds for iOS and Android
- **EAS Submit** — automated App Store / Play Store submission
- **OTA Updates** — `eas update` for instant JS bundle updates without store review

## Testing

| Layer | Tool |
|-------|------|
| Unit / Component | Jest + `@testing-library/react-native` |
| E2E | Detox |

## Platform-Specific Files

Use `.ios.tsx` / `.android.tsx` suffixes for platform-specific implementations. The bundler resolves the correct file at build time.

## Configuration

- `app.config.ts` — dynamic Expo config (replaces `app.json`)
- `expo-constants` — access config values at runtime
- Environment variables via `expo-constants` or `react-native-dotenv`

## Dependency Direction

Follow the standard Harness layer order within the mobile surface:

```
types -> constants -> hooks -> stores -> services -> components -> app/
```
