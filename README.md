# Yen's Rewards — Loyalty & CRM Platform

A full-stack loyalty management system built for **Yen's Thai Ice Cream**, providing a seamless experience across three distinct interfaces: Customer App, Barista App, and Admin Dashboard.

---

## Live App

| Interface | URL |
|---|---|
| Customer App | `/customer` |
| Barista App | `/barista` |
| Admin Dashboard | `/admin` |

---

## Features

### Customer App
- Points & tier loyalty programme (Bronze → Silver → Gold → Platinum)
- QR code check-in
- Rewards catalogue
- Birthday bonuses
- Push notifications (LINE, SMS, Email)
- Bilingual interface (Thai / English)

### Barista App
- Clock In / Clock Out with work schedules
- Transaction processing & points award
- Weekly leaderboard & gamification
- Customer reviews (5-star + Google Maps share)
- Announcements board

### Admin Dashboard
- Full customer CRM (add, edit, import/export CSV, bulk delete)
- Sales tracking with Excel import & PDF export
- Analytics dashboard (monthly trends, channel breakdown, day analysis)
- Multi-channel messaging: LINE, Twilio SMS, Vonage SMS (Thai +66), Resend Email
- Marketing automations with trigger rules and run history
- Promotions, Weekly Specials, Loyalty settings
- User management with roles (Admin / Manager / Barista)
- Sites & van management
- GitHub auto-sync on every checkpoint

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Wouter, TanStack Query |
| Backend | Node.js, Express, TypeScript |
| Database | Neon serverless PostgreSQL, Drizzle ORM |
| Styling | Tailwind CSS, Shadcn UI, Radix UI |
| Messaging | LINE Bot SDK, Twilio, Vonage, Resend |
| Auth | Replit Auth (admin), session-based (barista/customer) |
| Storage | Replit Object Storage (product images) |
| i18n | react-i18next (Thai default, English) |

---

## Project Structure

```
/
├── client/          # React frontend (Vite)
│   └── src/
│       ├── pages/   # Admin dashboard, Customer app, Barista app
│       ├── components/
│       ├── hooks/
│       └── i18n/    # EN + TH translations
├── server/          # Express API
│   ├── routes.ts    # All API endpoints
│   ├── storage.ts   # Database access layer
│   ├── vonage.ts    # Vonage SMS integration
│   ├── twilio.ts    # Twilio SMS integration
│   └── scheduler.ts # Background message scheduler
└── shared/
    └── schema.ts    # Drizzle schema + Zod types
```

---

## Getting Started (Local Dev)

### Prerequisites
- Node.js 20+
- A [Neon](https://neon.tech) PostgreSQL database
- Optional: Vonage, Twilio, Resend, and LINE API keys for messaging

### Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `SESSION_SECRET` | Random string for session signing |
| `VONAGE_API_KEY` | Vonage account key |
| `VONAGE_API_SECRET` | Vonage account secret |
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `RESEND_API_KEY` | Resend email API key |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Official Account token |
| `GITHUB_TOKEN` | GitHub token for auto-sync |

### Install & Run

```bash
npm install
npm run dev
```

The app starts on **port 5000** (backend + Vite frontend via Express proxy).

---

## Branch Strategy

| Branch | Purpose |
|---|---|
| `main` | Production-ready code — auto-deploys on merge |
| `develop` | Integration branch — all features merged here first |
| `feature/*` | Individual feature branches (branch from `develop`) |
| `hotfix/*` | Urgent production fixes (branch from `main`) |

### Workflow
1. Create a `feature/your-feature-name` branch from `develop`
2. Open a Pull Request into `develop`
3. After review and testing, `develop` is merged into `main` for release

---

## Contributing

1. Fork or clone the repository
2. Create your feature branch: `git checkout -b feature/my-feature develop`
3. Commit your changes: `git commit -m "feat: add my feature"`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

### Commit Message Convention
We use [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` — new feature
- `fix:` — bug fix
- `chore:` — maintenance / tooling
- `docs:` — documentation only
- `refactor:` — code restructuring without behaviour change

---

## Version

Current: **v3.18.0**

See `client/src/i18n/locales/en.json` (`common.version`) for the display version, and `client/src/hooks/use-auto-update.ts` for the internal build version.

---

## License

Proprietary — © Yen's Thai Ice Cream. All rights reserved.
