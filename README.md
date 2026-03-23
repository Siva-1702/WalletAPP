# WalletAPP API

Production-ready Node.js MVC API for registration/login via mobile OTP, wallet operations, passbook history, KYC verification, JWT auth, and optional Google OAuth.

## Features
- OTP-first onboarding for registered and new users.
- JWT authentication and Google OAuth support.
- Wallet add money / withdraw with atomic balance updates.
- Passbook history with SQL aggregate summaries.
- KYC submission and verification simulation using a UIDAI-style adapter abstraction.
- Normalized relational schema using native SQLite tables and SQL constraints for a ready-to-run setup.
- Mobile-style frontend screens included for registration, OTP, profile, wallet, passbook, and KYC.
- Mobile-style frontend screens included for registration, OTP, profile, wallet, passbook, and KYC.
- Postman collection included.

## Quick Start
```bash
cp .env.example .env
npm run migrate
npm start
```

## API Base URL
`/api/v1`

## Important Notes
- OTPs are returned in non-production mode for QA/demo convenience.
- Google OAuth is enabled only when OAuth env vars are configured.
- The KYC service is built as an adapter so a real UIDAI-compliant partner API can replace the current simulator safely.


## UI
- Open `http://localhost:3000/` to use the mobile UI screens that match the shared reference images.
- The UI calls the same `/api/v1` endpoints used by Postman.

