# Threat Model

## Project Overview

Yens Rewards is a full-stack TypeScript loyalty system for a retail food business. It has a React/Vite frontend and an Express backend backed by SQLite (better-sqlite3) via Drizzle ORM. Production traffic reaches a single Node server (`server/index.ts`) that serves both the frontend and REST API. The system stores customer loyalty profiles, purchase history, staff accounts, schedules, message templates, outbound message logs, and review data. It integrates with standalone email/password + optional TOTP for staff, local/GCS object storage, LINE, Twilio, Resend, and a background scheduler.

Production assumptions for this scan:
- Only production-reachable code matters.
- `NODE_ENV` is `production` in deployments.
- TLS is handled by the reverse proxy or platform.
- Mockup / sandbox-only code is out of scope unless production reachability is shown.

## Assets

- **Customer records and loyalty data** — names, phone numbers, email addresses, birthdays, tiers, points, spending, LINE identifiers, and promotion state. Exposure harms customer privacy and can enable fraud.
- **Staff accounts and sessions** — admin, manager, and barista identities, passwords, session cookies, and TOTP secrets. Compromise can lead to full business takeover.
- **Operational business data** — transactions, schedules, performance metrics, sites, sales imports, promotions, automations, and analytics.
- **Outbound messaging capability** — LINE, SMS, and email credentials plus the ability to target customer audiences. Abuse could lead to spam, phishing, privacy incidents, and reputational damage.
- **Object storage contents** — product images and public email assets, plus signed-upload capability for admin workflows.
- **Application secrets** — database credentials, session secret, API credentials, LINE webhook secret, and admin bootstrap secret.

## Trust Boundaries

- **Browser / mobile client to API** — all `/api/*` input is untrusted and must be authenticated, authorized, validated, and rate-limited where sensitive.
- **API to Database** — the backend can read and write all business data; broken authorization or injection here can expose or corrupt the entire dataset.
- **API to external providers** — the server sends messages through LINE, Twilio, and Resend and receives LINE webhooks. Provider credentials and webhook authenticity must be protected.
- **API to object storage** — admin flows generate signed upload URLs and proxy public asset delivery. Only intended objects should become public.
- **Public / authenticated / admin boundaries** — public customer-facing endpoints, staff-authenticated endpoints, and admin-only endpoints must remain clearly separated server-side.
- **Production / dev-only boundary** — development helpers, Vite-only behavior, and local experimental flows are out of scope unless they are reachable in production.

## Scan Anchors

- **Production entry points:** `server/index.ts`, `server/routes.ts`
- **Highest-risk areas:** public customer routes in `server/routes.ts`, auth/session logic in `server/auth.ts` and auth routes, LINE webhook and account-linking flows, admin messaging endpoints, object storage helpers, scheduler logic
- **Public surfaces:** `/api/customers/*`, `/api/products*`, `/products/*`, `/email-assets/*`, `/api/sites`, `/api/line/webhook`, review submission
- **Authenticated surfaces:** `/api/auth/*`, `/api/barista/*`, `/api/transactions`, `/api/work-schedules/me`, `/api/weekly-special/active`
- **Admin surfaces:** `/api/admin/*`
- **Usually dev-only / lower-priority areas:** Vite setup, local asset helpers, test endpoints guarded by deployment mode, static public files

## Threat Categories

### Spoofing

The system supports password-based staff login with optional TOTP. Staff authentication must not be bypassable through weak bootstrap flows, weak session handling, or easily brute-forced login and verification endpoints. LINE webhook requests must be accepted only when their signatures verify correctly. Customer account-linking flows must prove real control of the target account and not rely on guessable identifiers alone.

### Tampering

Barista and admin actions modify customer points, transactions, promotions, schedules, message templates, and automations. The server must validate all user-controlled input and enforce role checks server-side so clients cannot alter business data or message targets they should not control. Background jobs and import paths must remain bounded and must not process attacker-chosen files or records outside intended scope.

### Information Disclosure

Customer loyalty data is highly sensitive in this app because phone numbers are also used as lookup and linking identifiers. Public endpoints must not expose customer profiles, purchase history, promotions, or internal identifiers without strong proof of ownership. API errors and logs must not leak secrets, cookies, or full sensitive records. Public object delivery must expose only explicitly public files.

### Denial of Service

Public and auth endpoints can be abused for brute force, enumeration, or resource exhaustion if they lack throttling and bounded work. Login, 2FA verification, customer lookup, webhook handling, imports, and messaging triggers must resist repeated abuse. Scheduled jobs and mass-send features must remain idempotent and avoid duplicate processing under concurrent execution.

### Elevation of Privilege

Admin-only capabilities include user management, mass messaging, data import/export, promotions, automations, and analytics. The application must ensure these paths are reachable only by authorized admins. Any bootstrap or promotion mechanism, IDOR-style customer access, or weak linkage between public identity data and privileged actions can let attackers gain broader control than intended.
