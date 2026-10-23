# Emergency Response Mobile App (Clean)

## Setup

```bash
cd emergency-mobile-clean
npm install
npx expo install --fix
npx expo start -c
```

Press `a` for Android emulator.

## API URL

Edit `services/api.js`:

- Android Emulator: `http://10.0.2.2:5000`
- Physical phone: `http://YOUR_PC_IP:5000`
- Web: `http://localhost:5000`

Backend must be running on port 5000.
