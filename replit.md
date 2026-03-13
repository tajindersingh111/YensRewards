# Yens Thai Ice Cream Loyalty System

## Overview
A multi-interface loyalty management system (Customer App, Barista App, Admin Dashboard) for Yens Thai Ice Cream. Its primary purpose is to enhance customer engagement and streamline operations through loyalty programs, transaction processing, and promotional tools. The system aims to provide a seamless mobile-first experience for customers, efficient transaction processing for baristas with gamification, and comprehensive analytics for administrators. Key ambitions include boosting customer loyalty, motivating employees, and improving business efficiency.

**Current Version: v3.17.32** - **Security Fix**: Moved "First Time Admin Setup" from public login page to secured Settings page (Security tab) to prevent unauthorized user creation now that app is embedded in YensThai.com.

## User Preferences
Preferred communication style: Simple, everyday language.

### Customer App V3 Design (January 27, 2026) - SAVED FOR REFERENCE
Current design elements to preserve:
- **Header**: Yellow banner with high-res Yen's polar bear logo, "Yen's Rewards" text, version number (v3.17.18), language switcher, refresh button
- **Hero Image**: "Double Points Today!" promotional image (Screenshot_2026-01-27_at_22.41.34) showing chocolate/strawberry ice cream - links to Grab ordering URL
- **Points Card**: Orange badge showing "50" with points progress message
- **QR Code Card**: Customer QR code, name, ID, and "Show to barista" button
- **Rewards List**: Product cards without header (removed "Available Rewards" and "View All")
- **Bottom Navigation**: 4 tabs (Home, Menu, Rewards, Profile)
- **Logo file**: Yens_logo_high_res_1766925576641.png (polar bear mascot)
- **Grab URL**: https://r.grab.com/g/6-20260118_164808_8EB3D56733EB46359E49369E57E74885_MEXMPS-3-C6UCJBMJGYDXA2

### Publishing Workflow
**IMPORTANT: Before every publish/deploy, always update the version number:**
1. Increment version in `replit.md` (Current Version line)
2. Update version in `client/src/i18n/locales/en.json` (common.version)
3. Update version in `client/src/i18n/locales/th.json` (common.version)
4. Then publish the app

## System Architecture

### UI/UX Decisions
- **Design System:** Tailwind CSS, custom Yens brand color palette (Yens Yellow, Yens Blue, tier-specific colors), Inter font.
- **Responsiveness:** Mobile-first design, iPhone safe-area padding, 44px minimum touch targets, light mode only.
- **Component Library:** Shadcn UI built on Radix UI primitives.
- **PWAs:** Dedicated PWA manifests and installation flows for Customer, Barista, and Admin apps.
- **Brand Consistency:** Yens yellow (#FCD34D) color scheme across all interfaces.

### Technical Implementations
- **Frontend:** React 18 with TypeScript, Vite, Wouter for routing, TanStack Query for server state management. Utilizes an atomic design pattern.
- **Backend:** Node.js with Express.js, TypeScript, Drizzle ORM, Neon serverless PostgreSQL.
- **Monorepo Structure:** `/client` (React app), `/server` (Express API), `/shared` (common types/schemas).
- **API Design:** RESTful endpoints, centralized error handling, Zod for schema validation.
- **State Management:** React Query for API data, local React hooks for UI state.
- **Authentication & Authorization:** Dual system: Replit Auth (OpenID Connect) for admin, password-based with optional 2FA for Barista/Customer. Session management via `connect-pg-simple`, role-based access control ("admin", "manager", "barista"). Admin self-service account management includes password and 2FA setup.
- **Database Schema:** Tables include `customers`, `transactions`, `promotions`, `products`, `users`, `sites`, `work_schedules`, `weekly_specials`, `barista_performance`, and `customer_reviews`, managed with Drizzle ORM.
- **Object Storage:** Replit App Storage (Google Cloud Storage backend) for product images. Secure upload via presigned URLs and ACL-based access control.
- **User Management:** Admin-only CRUD for user accounts, role assignment, enable/disable functionality, and 2FA management.
- **Messaging System:** Multi-channel messaging with LINE (free, Thailand-focused), Twilio for SMS, Resend for email (with planned SendGrid migration). LINE Official Account integration via @line/bot-sdk enables free unlimited messages (5,000 chars) to Thai customers. Supports admin-managed templates, comprehensive message logging, broadcast/targeted messaging (all/tier/individual), automated messages (e.g., birthday), and **scheduled messaging** (send at specific future times with Bangkok timezone support). Message logs track all channels (sms, email, line, app) with delivery status. Background scheduler (server/scheduler.ts) processes due messages every 60 seconds.
- **Internationalization (i18n):** Full bilingual support (Thai/English) using `react-i18next`, with Thai as default and language persistence.
- **Product Management:** CSV bulk import with photo URLs and category mapping, product codes/costs, secure image storage.
- **Core Features:** Customer loyalty programs (points, tiers), transaction processing, customer management (self-registration, referrals, CSV import/export, duplicate detection), admin analytics (weekly overview, performance tracking), tier-based promotions, product menu, automated birthday messages, sites management (physical locations, mobile vans), Barista App functionalities (Clock In/Out, Work Schedules, Announcements), **Customer Reviews** (5-star rating with feedback tags, Google Maps integration for sharing positive reviews).
- **Gamification System:** Weekly Special Offers (admin-managed), barista performance tracking (points for sales/signups), real-time leaderboards, personal performance widgets, dedicated admin tab for specials, full bilingual support.
- **Sales Tracking & Analytics:** Excel import for daily sales (supports column-less headers via __empty), sales overview dashboard with key metrics (revenue, growth, avg transaction), manual data entry, recent sales table, validation, and real-time UI updates. **Analytics Dashboard (v3.7.2):** Comprehensive 4-tab analytics interface with data visualizations (Monthly Trends, Channels, Day Analysis, Top Performers), Recharts integration, summary metrics (current month revenue, MoM growth, avg transaction), full bilingual support (EN/TH), Yens yellow branding throughout charts, Excel date handling (serial to ISO format conversion), and normalized day-of-week data handling (maps all variations like "Tues"/"Thurs" to canonical "Tue"/"Thu" for accurate aggregation). Sales Tracker form now features yellow-bordered highlight fields (Sales Channel, Net Sales, Other Sales) for improved visual prominence.

### System Design Choices
- **Type Safety:** End-to-end TypeScript with shared Zod schemas.
- **Scalability:** Interface-based storage design, serverless-ready architecture.
- **Progressive Enhancement:** Mock functionality for parallel development.
- **Mobile-First:** All interfaces optimized for mobile devices.

## External Dependencies
- **UI Components:** Radix UI primitives, Shadcn UI, Lucide React, `date-fns`, `react-qr-code`.
- **Database & ORM:** Neon serverless PostgreSQL, Drizzle ORM, Drizzle Kit, Drizzle Zod.
- **Development Tools:** Vite, TypeScript, PostCSS (Tailwind, Autoprefixer).
- **Form & Validation:** React Hook Form, `@hookform/resolvers`, Zod.
- **Session Management:** `connect-pg-simple`.
- **Messaging Services:** LINE Official Account (@line/bot-sdk), Twilio, Resend, `otpauth` (for 2FA).
- **Utilities:** `clsx`, `tailwind-merge`, `class-variance-authority`, `nanoid`, `bcrypt`.
- **Data Visualization:** Recharts for analytics charts and graphs.
- **Internationalization:** `react-i18next`.