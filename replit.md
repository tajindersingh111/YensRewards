# Yens Thai Ice Cream Loyalty System

## Current Version: v2.5.0
**Latest Updates (v2.5.0):**
- Major Messages tab reorganization with Send/History/Templates sub-tabs
- New Send Message feature for custom messages to all customers, by tier, or individual selection
- Multi-channel support (SMS/Email/App) with unified sending interface
- Message Templates moved from Settings to Messages tab for better workflow
- Compact tab layout with improved navigation

**Previous Version (v2.4.0):**
- Added message content search functionality in Messages tab
- Added "App" channel filter for in-app notifications (alongside SMS and Email)
- Enhanced message filtering capabilities

**Version (v2.3.0):**
- User management system with edit details functionality
- Email validation and normalization (case-insensitive duplicate detection)
- Full bilingual UI for user management

## Overview
A multi-interface loyalty management system for Yens Thai Ice Cream, comprising a Customer App, Barista App, and Admin Dashboard. Its purpose is to enhance customer engagement and streamline operations by managing loyalty points, transactions, and promotions. The system aims to provide a seamless, mobile-first experience for customers to earn and redeem points, empower baristas with efficient transaction processing, and offer administrators comprehensive analytics and promotional tools, ultimately boosting customer loyalty and business efficiency.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
- **Design System:** Tailwind CSS, custom Yens brand color palette (Yens Yellow, Yens Blue, tier-specific colors), Inter font.
- **Responsiveness:** True mobile-first design, iPhone safe-area padding, 44px minimum touch targets, light mode only.
- **Component Library:** Shadcn UI built on Radix UI primitives.
- **PWAs:** Dedicated PWA manifests and installation flows for Customer, Barista, and Admin apps.

### Technical Implementations
- **Frontend:** React 18 with TypeScript, Vite, Wouter for routing, TanStack Query for server state management. Atomic design pattern.
- **Backend:** Node.js with Express.js, TypeScript, Drizzle ORM, Neon serverless PostgreSQL for production.
- **Monorepo Structure:** `/client` (React app), `/server` (Express API), `/shared` (common types/schemas).
- **API Design:** RESTful endpoints, centralized error handling, Zod for schema validation.
- **State Management:** React Query for API data, local React hooks for UI state.
- **Authentication & Authorization:** Replit Auth (OpenID Connect), session management with `connect-pg-simple`, role-based access control ("admin", "manager", "barista"), auto-user creation in test mode.
- **Database Schema:** `customers`, `transactions`, `promotions`, `products`, `referrals`, `users`, `message_templates`, `message_log` tables managed with Drizzle ORM.
- **User Management:** Admin-only user account management (CRUD), three-role system (admin/manager/barista), role assignment and editing, user deletion, bilingual UI (Thai/English), email-based user creation.
- **Messaging System:** Twilio for SMS, Resend for email, multi-channel support (including in-app notifications), admin-managed templates with dynamic placeholders, comprehensive logging, automated birthday messages.
- **Internationalization (i18n):** Full bilingual support (Thai/English) using react-i18next, Thai as default, localStorage persistence, LanguageSwitcher component. All admin features fully internationalized including user management, customer management, product management, messaging, and promotions.
- **Product Management:** CSV bulk import with photo URL support and Thai category mapping, product codes and costs, image storage.
- **Core Features:** Customer loyalty (points, tiers), transaction processing (QR, OCR), customer management (self-registration, profile, referrals, CSV bulk import with smart upsert logic and validation, bulk delete with date filters, expandable customer details, individual customer deletion, duplicate phone detection), admin analytics, tier-based promotions, product menu, automated birthday messaging, user account management (admin-only).

### System Design Choices
- **Type Safety:** End-to-end TypeScript with shared Zod schemas.
- **Scalability:** Interface-based storage design, serverless-ready architecture.
- **Progressive Enhancement:** Mock functionality for parallel development.
- **Mobile-First:** All interfaces optimized for mobile devices.
- **Brand Consistency:** Yens yellow (#FCD34D) color scheme.

## External Dependencies
- **UI Components:** Radix UI primitives, Shadcn UI, Lucide React (icons), `date-fns`.
- **Database & ORM:** Neon serverless PostgreSQL, Drizzle ORM, Drizzle Kit, Drizzle Zod.
- **Development Tools:** Vite, TypeScript, PostCSS with Tailwind and Autoprefixer.
- **Form & Validation:** React Hook Form, `@hookform/resolvers`.
- **Session Management:** `connect-pg-simple`.
- **Messaging Services:** Twilio (via Replit Twilio connector), Resend (via Replit Resend connector).
- **Utilities:** `clsx`, `tailwind-merge`, `class-variance-authority`, `nanoid`.