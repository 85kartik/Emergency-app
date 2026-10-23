# Emergency Response & Citizen Safety System

A production-ready full-stack emergency response system with real-time Socket.IO dispatching, offline location caching, automated safety guidance, and dedicated responder/admin dashboards.

```
emergency-app-full/
├── server/          # Hardened Node.js + Express + MongoDB + Socket.IO API
├── mobile/          # Expo SDK 55 React Native mobile app (iOS & Android)
├── admin/           # React 18 Admin & Responder Dispatch Web Dashboard
├── docker-compose.yml # Orchestrated production-ready container stack
└── README.md
```

---

## 🚀 Quick Start with Docker (Production Stack)

Start all services (MongoDB, Server API, and Admin Web Dashboard) with a single command:

```bash
docker compose up --build -d
```

* **API Health Check:** `http://localhost:5000/health`
* **Admin Dashboard:** `http://localhost:3000`
* **MongoDB:** `localhost:27017`

---

## 🛠️ Service Setup & Development

### 1. Backend Server (`/server`)

#### Configuration
```bash
cd server
cp .env.example .env
```

Edit `server/.env`:
```ini
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb://127.0.0.1:27017/emergency_db
JWT_SECRET=use_a_secure_random_string_at_least_32_characters_long
JWT_EXPIRES_IN=7d
CORS_ORIGINS=http://localhost:3000,http://localhost:8081
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=200
TRUST_PROXY=1
BCRYPT_SALT_ROUNDS=12
```

#### Run & Test
```bash
# Install dependencies
npm install

# Run automated test suite (Jest + Supertest + In-Memory MongoDB)
npm test

# Start server in development mode
npm run dev

# Start server in production mode
npm start
```

---

### 2. Mobile Citizen App (`/mobile`)

Built on **Expo Router (SDK 55)** for iOS and Android.

#### Configuration
```bash
cd mobile
cp .env.example .env
```
Set `EXPO_PUBLIC_API_URL=https://api.yourdomain.com` for production, or leave empty in development for automatic local emulator/simulator detection.

#### Run App
```bash
# Install dependencies
npm install

# Start Expo development server with cache clearing
npx expo start -c
```
* Press `a` to run on Android Emulator (`http://10.0.2.2:5000`).
* Press `i` to run on iOS Simulator (`http://localhost:5000`).
* Press `w` to run on Web.
* Scan the QR code with the Expo Go app on a physical device.

#### Production Build (EAS)
```bash
# Build Android APK / App Bundle
npx eas build --platform android --profile production

# Build iOS Archive
npx eas build --platform ios --profile production
```

---

### 3. Admin & Responder Dashboard (`/admin`)

React 18 single-page application with real-time incident polling and status dispatching.

```bash
cd admin
npm install
npm start
```
Runs at `http://localhost:3000`.

---

## 🛡️ Production & Security Features

* **Security Headers:** Strict Helmet configuration with CSP and CORP policies.
* **Rate Limiting:** Multi-tiered rate limiters for authentication (`15m / 20 reqs`), SOS alerts (`5m / 10 reqs`), and global API endpoints (`15m / 200 reqs`).
* **Reverse Proxy Aware:** `app.set('trust proxy', 1)` for accurate client IP resolution behind AWS ALB, Cloudflare, or Nginx.
* **Resilient GPS & Offline Support:** Automatic reverse geocoding with fallback to `getLastKnownPositionAsync` and SecureStore local cache when mobile signal is lost.
* **Socket.IO Transport Fallback:** Dual `['websocket', 'polling']` transports ensure real-time alerts function on restrictive cellular data networks.
* **Graceful Process Shutdown:** Handles `SIGTERM` and `SIGINT` signals, closing open socket channels and MongoDB connections cleanly without dropping in-flight requests.
* **Containerized Deployment:** Multi-stage Dockerfiles with non-root security contexts (`node:20-alpine`) and Nginx production caching.
