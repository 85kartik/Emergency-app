# Emergency Response & Citizen Safety App

Full project structure:

```
emergency-app-full/
├── server/          # Backend (Node + Express + MongoDB + Socket.IO)
├── mobile/          # Expo React Native app (cleaned for SDK 55)
├── admin/           # React admin dashboard (partial)
├── docker-compose.yml
└── README.md
```

## 1. Backend Setup

```bash
cd server
cp .env.example .env
```

Edit `.env`:
```
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/emergency_db
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters_long
JWT_EXPIRES_IN=7d
NODE_ENV=development
CORS_ORIGINS=http://localhost:3000,http://localhost:8081
BCRYPT_SALT_ROUNDS=12
```

Then:
```bash
npm install
npm run dev
```

Make sure MongoDB is running locally (or use Docker: `docker compose up mongo -d`).

## 2. Mobile App Setup

```bash
cd mobile
npm install
npx expo install --fix
npx expo start -c
```

Press `a` for Android emulator.

### API URL (important)

Open `mobile/services/api.js`:

- Android Emulator → `http://10.0.2.2:5000`
- Physical phone → `http://YOUR_PC_IP:5000`
- Web → `http://localhost:5000`

## 3. Admin Dashboard (partial)

```bash
cd admin
npm install
npm start
```

## Features Working

### Backend
- Auth (register / login / JWT)
- SOS emergency create
- My emergencies / all emergencies
- Status update / assign / cancel
- Role-based access
- Socket.IO real-time
- Rate limiting, validation, security headers

### Mobile
- Login / Register
- Home + SOS button
- Full SOS flow
- Location handling
- Emergency history & details
- Profile

## Note

Admin dashboard UI is only partially built (login page exists). Backend fully supports admin/responder roles.
