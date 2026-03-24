# WalletAPP API

Production-ready Node.js MVC API for registration/login via mobile OTP, wallet operations, passbook history, KYC verification, JWT auth, and optional Google OAuth.

## Features
- OTP-first onboarding for registered and new users.
- JWT authentication and real Google OAuth support with separate register/login validation rules.
- Wallet add money / withdraw with atomic balance updates.
- Passbook history with SQL aggregate summaries.
- KYC submission and verification simulation using a UIDAI-style adapter abstraction.
- Normalized relational schema using native SQLite tables and SQL constraints for a ready-to-run setup.
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


## KYC Provider Modes
- `KYC_PROVIDER=simulator` keeps the project runnable locally and uses the built-in UIDAI-style simulator.
- `KYC_PROVIDER=uidai-dev` switches the KYC service to the official UIDAI developer endpoint format and uses the configured `UIDAI_KYC_*` settings.
- The UIDAI developer section publishes test endpoint patterns such as `https://developer.uidai.gov.in/uidkyc/kyc/2.5` and test codes like `ac=public`; however, successful live requests still depend on the required UIDAI cryptographic setup and license key configuration.


## Google OAuth
- Configure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_CALLBACK_URL` in `.env` or export them as environment variables. The app now falls back to `.env.example` when `.env` is not present.
- The UI uses `/api/v1/auth/google?mode=register` for first-time sign-up and `/api/v1/auth/google?mode=login` for returning users.
- Register mode rejects existing Google accounts, and login mode rejects users who have not registered with Google yet.


## OAuth Troubleshooting
- After changing `.env` or `.env.example`, restart the Node server so new values are loaded.
- If you accidentally pasted the env block as one line with literal `\n`, the loader now normalizes it automatically.
- The runtime also checks `.env.examp` as a compatibility fallback, but empty values from fallback files will not overwrite valid loaded credentials.
