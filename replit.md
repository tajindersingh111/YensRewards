# Yens Thai Ice Cream Loyalty System

## Overview
A multi-interface loyalty management system (Customer App, Barista App, Admin Dashboard) for Yens Thai Ice Cream. Its primary purpose is to enhance customer engagement and streamline operations through loyalty programs, transaction processing, and promotional tools. The system aims to provide a seamless mobile-first experience for customers, efficient transaction processing for baristas with gamification, and comprehensive analytics for administrators. Key ambitions include boosting customer loyalty, motivating employees, and improving business efficiency.

**Current Version: v3.11.0** - Sites-to-Sales Channel Integration: Sales channels are now managed through the Sites system, eliminating hardcoded channel arrays. Each site has a required `channelName` field (1-20 uppercase alphanumeric chars with hyphens/underscores) displayed in yellow badges. Sales Tracker dropdown dynamically populates from active sites, automatically updating when sites are added/edited/disabled. Comprehensive validation enforces data integrity at schema (Zod), backend (POST/PATCH routes), and frontend (client filtering) levels. Full bilingual support for channel management UI (EN/TH). Previous version (v3.10.0): Sales record editing and deletion with CRUD functionality.

## User Preferences
Preferred communication style: Simple, everyday language.

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
- **Database Schema:** Tables include `customers`, `transactions`, `promotions`, `products`, `users`, `sites`, `work_schedules`, `weekly_specials`, and `barista_performance`, managed with Drizzle ORM.
- **Object Storage:** Replit App Storage (Google Cloud Storage backend) for product images. Secure upload via presigned URLs and ACL-based access control.
- **User Management:** Admin-only CRUD for user accounts, role assignment, enable/disable functionality, and 2FA management.
- **Messaging System:** Twilio for SMS, Resend for email (with planned SendGrid migration), multi-channel support, admin-managed templates, logging, and automated messages (e.g., birthday).
- **Internationalization (i18n):** Full bilingual support (Thai/English) using `react-i18next`, with Thai as default and language persistence.
- **Product Management:** CSV bulk import with photo URLs and category mapping, product codes/costs, secure image storage.
- **Core Features:** Customer loyalty programs (points, tiers), transaction processing, customer management (self-registration, referrals, CSV import/export, duplicate detection), admin analytics (weekly overview, performance tracking), tier-based promotions, product menu, automated birthday messages, sites management (physical locations, mobile vans), Barista App functionalities (Clock In/Out, Work Schedules, Announcements).
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
- **Messaging Services:** Twilio, Resend, `otpauth` (for 2FA).
- **Utilities:** `clsx`, `tailwind-merge`, `class-variance-authority`, `nanoid`, `bcrypt`.
- **Data Visualization:** Recharts for analytics charts and graphs.
- **Internationalization:** `react-i18next`.