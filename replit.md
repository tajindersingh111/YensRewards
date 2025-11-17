# Yens Thai Ice Cream Loyalty System v3.1.0

## Overview
A multi-interface loyalty management system for Yens Thai Ice Cream, comprising a Customer App, Barista App, and Admin Dashboard. Its purpose is to enhance customer engagement and streamline operations by managing loyalty points, transactions, and promotions. The system aims to provide a seamless, mobile-first experience for customers to earn and redeem points, empower baristas with efficient transaction processing through gamification, and offer administrators comprehensive analytics and promotional tools, ultimately boosting customer loyalty, employee motivation, and business efficiency. Key capabilities include customer loyalty programs, transaction processing, customer and user management, sites management, messaging, barista gamification with weekly challenges and performance tracking, and a comprehensive admin dashboard with business health metrics and reporting.

## Latest Release (v3.1.1)
**Product Image Upload Fix:**
- 🖼️ **Object Storage Integration:** Proper Replit object storage for product images using Google Cloud Storage
- 🔒 **Secure Upload Flow:** Three-step presigned URL upload (get URL → upload to GCS → set ACL)
- 🛡️ **ACL-Based Access Control:** Server-side proxy enforces visibility policies before serving images
- 📁 **Path Validation:** Ensures uploaded images are in products/ directory
- ✅ **Fixed Upload Issues:** Resolved filesystem path errors and Public Access Prevention constraints

**Previous (v3.1.0) - Gamification System:**
- ✨ Weekly Special Offers for barista motivation
- 📊 Performance Tracking with automatic point calculation
- 🏆 Real-time Leaderboards
- 📈 Personal Performance Widget
- 🌐 Full Bilingual Support (Thai/English)
- 🎯 Admin Weekly Specials Management
- 🎨 Enhanced Barista UI

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
- **Design System:** Tailwind CSS, custom Yens brand color palette (Yens Yellow, Yens Blue, tier-specific colors), Inter font.
- **Responsiveness:** True mobile-first design, iPhone safe-area padding, 44px minimum touch targets, light mode only.
- **Component Library:** Shadcn UI built on Radix UI primitives.
- **PWAs:** Dedicated PWA manifests and installation flows for Customer, Barista, and Admin apps.
- **Brand Consistency:** Yens yellow (#FCD34D) color scheme.

### Technical Implementations
- **Frontend:** React 18 with TypeScript, Vite, Wouter for routing, TanStack Query for server state management. Atomic design pattern.
- **Backend:** Node.js with Express.js, TypeScript, Drizzle ORM, Neon serverless PostgreSQL for production.
- **Monorepo Structure:** `/client` (React app), `/server` (Express API), `/shared` (common types/schemas).
- **API Design:** RESTful endpoints, centralized error handling, Zod for schema validation.
- **State Management:** React Query for API data, local React hooks for UI state.
- **Authentication & Authorization:** Dual authentication system - Replit Auth (OpenID Connect) for admin dashboard and password-based authentication with optional 2FA for operational apps (Barista/Customer). Session management with `connect-pg-simple`, role-based access control ("admin", "manager", "barista"), auto-user creation from OIDC claims. Password hashing via bcrypt (10 salt rounds), TOTP-based 2FA via otpauth. Admin self-service account management allows admins to set passwords and enable 2FA for Barista app access via Settings tab.
- **Database Schema:** `customers`, `transactions`, `promotions`, `products`, `referrals`, `users`, `message_templates`, `message_log`, `sites`, `clock_sessions`, `work_schedules`, `barista_announcements`, `weekly_specials`, `barista_performance` tables managed with Drizzle ORM. Users table includes password (hashed), twoFactorSecret, and twoFactorEnabled fields.
- **Object Storage:** Replit App Storage (Google Cloud Storage backend) for product images. Images stored in `public/products/` directory with ACL metadata, served via proxy endpoint (`/products/:filePath`) with visibility enforcement. Upload flow uses presigned URLs for direct-to-GCS uploads, followed by server-side ACL policy setting.
- **User Management:** Admin-only user account management (CRUD) with enable/disable functionality, three-role system (admin/manager/barista), role assignment and editing, user deletion, bilingual UI (Thai/English), email-based user creation, password management, and 2FA setup/management.
- **Messaging System:** Twilio for SMS, Resend for email (pending SendGrid migration), multi-channel support (including in-app notifications), admin-managed templates with dynamic placeholders, comprehensive logging, automated birthday messages.
- **Internationalization (i18n):** Full bilingual support (Thai/English) using react-i18next, Thai as default, localStorage persistence, LanguageSwitcher component. All features fully internationalized.
- **Product Management:** CSV bulk import with photo URL support and Thai category mapping, product codes and costs, secure object storage for product images with presigned URL uploads and ACL-enforced serving.
- **Core Features:** Customer loyalty (points, tiers), transaction processing (QR, OCR), customer management (self-registration, profile, referrals, CSV bulk import with smart upsert logic and validation, bulk delete, expandable customer details, individual customer deletion, duplicate phone detection), admin analytics (weekly overview dashboard with metrics and charts, performance tracking, server-side pagination), tier-based promotions, product menu, automated birthday messaging, user account management (admin-only with enable/disable functionality), admin self-service password and 2FA management (Settings tab with password set/update, 2FA setup with QR codes, enable/disable 2FA), sites management (physical location tracking with operating schedules, predefined locations, and mobile van support), Barista App functionalities (Clock In/Out, Work Schedules Management, Barista Announcements/Hub).
- **Gamification System:** Weekly special offers with admin management (create, edit, activate/deactivate, delete with scheduled start/end dates), barista performance tracking (automatic point calculation for special sales and new customer signups), real-time leaderboards (top 10 performers with rank, points, and sales metrics), personal performance stats widget (weekly points, current rank, sales count, signup count), promotional banner on barista search screen, fire-and-forget performance updates on transaction processing, dedicated Weekly Specials admin tab, full bilingual support (Thai/English) for all gamification UI elements.

### System Design Choices
- **Type Safety:** End-to-end TypeScript with shared Zod schemas.
- **Scalability:** Interface-based storage design, serverless-ready architecture.
- **Progressive Enhancement:** Mock functionality for parallel development.
- **Mobile-First:** All interfaces optimized for mobile devices.

## External Dependencies
- **UI Components:** Radix UI primitives, Shadcn UI, Lucide React (icons), `date-fns`, `react-qr-code`.
- **Database & ORM:** Neon serverless PostgreSQL, Drizzle ORM, Drizzle Kit, Drizzle Zod.
- **Development Tools:** Vite, TypeScript, PostCSS with Tailwind and Autoprefixer.
- **Form & Validation:** React Hook Form, `@hookform/resolvers`, Zod.
- **Session Management:** `connect-pg-simple`.
- **Messaging Services:** Twilio for SMS, Resend for email (planned migration to SendGrid), `otpauth` for 2FA.
- **Utilities:** `clsx`, `tailwind-merge`, `class-variance-authority`, `nanoid`, `bcrypt`.
- **Internationalization:** `react-i18next`.