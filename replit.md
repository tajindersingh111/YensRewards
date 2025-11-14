# Yens Thai Ice Cream Loyalty System

## Overview

A multi-interface loyalty management system for Yens Thai Ice Cream, designed to enhance customer engagement and streamline operations. The system comprises a Customer App, Barista App, and Admin Dashboard, all interconnected to manage customer loyalty points, transactions, and promotions. It aims to enable customers to earn and redeem points, empower baristas with efficient transaction processing, and provide administrators with comprehensive analytics and promotional tools. The project focuses on creating a seamless, mobile-first experience for customers while offering robust management capabilities for the business.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Updates

### Nov 14, 2025 - Customer CSV Import (v2.0.5)
- **Database Schema Extension**: Added 6 new customer fields: `gender`, `registerBranch`, `registerDate`, `lastUse`, `tag`, `lineUid` to support comprehensive customer data from external systems.
- **Customer CSV Import Feature**: Built complete CSV import system for bulk customer onboarding with 13-column format support.
  - **Format**: Crm Name, Membership Tier, Phone Number, Email, Gender, Birthdate, Register Date, Register Branch, Total Spending, Point, Last Use, Tag, Line UID
  - **Smart Upsert Logic**: Uses phone number as unique key, generates referral codes for new customers, preserves existing data when CSV fields are empty
  - **Validation**: Full Zod schema validation with detailed error reporting per row
  - **Date Parsing**: Reliable DD/MM/YYYY format parsing using Date.UTC for timezone-independent results
  - **UI Component**: Bilingual preview dialog with progress tracking, detailed results display, and comprehensive error reporting
  - **Integration**: Accessible via "Import CSV" button in Admin Dashboard Customers tab
- **Data Migration**: Successfully imported 506 customers from 514-row CSV into development database

### Nov 10, 2025 - Translation & Product Import Fixes
- **Customer App Navigation**: Fixed runtime error where `t('customer.menu')` returned an object instead of string. Added dedicated `customer.menuNav` translation key for bottom navigation.
- **Version Centralization**: Replaced all hardcoded "v94" strings with centralized `common.version: "v2.0"` translation key across Customer App, Barista App, and Admin Dashboard.
- **Translation System Best Practices**: Documented object vs string key usage, nested translation patterns, and version management in translation files.
- **CSV Product Import Enhancement**: Added photo URL support in column 9, maintained backward compatibility with 8-column CSVs, improved preview display with photo availability indicator.

## System Architecture

### UI/UX Decisions
- **Design System:** Tailwind CSS for utility-first styling, custom Yens brand color palette (Yens Yellow, Yens Blue, tier-specific colors), Inter font family.
- **Responsiveness:** TRUE mobile-first responsive design; iPhone safe-area padding for notch; pinch-zoom enabled; 44px minimum touch targets; light mode only.
- **Component Library:** Shadcn UI built on Radix UI primitives for accessible, composable components.
- **PWAs:** Dedicated PWA manifests and installation flows for Customer, Barista, and Admin apps.

### Technical Implementations
- **Frontend:** React 18 with TypeScript, Vite for bundling, Wouter for routing, TanStack Query for server state management. Atomic design pattern.
- **Backend:** Node.js with Express.js, TypeScript, Drizzle ORM for type-safe database interactions, Neon serverless PostgreSQL for production.
- **Monorepo Structure:** `/client` (React app), `/server` (Express API), `/shared` (common types/schemas).
- **API Design:** RESTful endpoints, centralized error handling, Zod for schema validation.
- **State Management:** React Query for API data, local React hooks for UI state.
- **Authentication & Authorization:** Replit Auth (OpenID Connect) for admin/barista login, session management with `connect-pg-simple`, role-based access control ("admin", "barista"), auto-user creation in test mode.
- **Database Schema:** `customers`, `transactions`, `promotions`, `products`, `referrals`, `users`, `message_templates`, `message_log` tables managed with Drizzle ORM.
- **Messaging System:** Twilio for SMS, Resend for email, multi-channel support, admin-managed templates with dynamic placeholders, comprehensive logging, automated birthday messages, retry functionality.
- **Internationalization (i18n):** Full bilingual support (Thai/English) using react-i18next, Thai as default language, localStorage persistence, comprehensive translations covering all apps, LanguageSwitcher component for easy switching.
- **Product Management:** CSV bulk import with Thai category mapping, photo upload to object storage (max 5MB), product codes and costs, image storage under `/products/`.
- **Core Features:** Customer loyalty (points, tiers), transaction processing (QR, OCR), customer management (self-registration, profile, referrals, CSV bulk import), admin analytics, tier-based promotions, product menu, automated birthday messaging, CSV product import.

### System Design Choices
- **Type Safety:** End-to-end TypeScript with shared Zod schemas.
- **Scalability:** Interface-based storage design, serverless-ready architecture.
- **Progressive Enhancement:** Mock functionality used for parallel development.
- **Mobile-First:** All interfaces optimized for mobile devices.
- **Brand Consistency:** Yens yellow (#FCD34D) color scheme throughout.

## External Dependencies

- **UI Components:** Radix UI primitives, Shadcn UI, Lucide React (icons), `date-fns`.
- **Database & ORM:** Neon serverless PostgreSQL, Drizzle ORM, Drizzle Kit, Drizzle Zod.
- **Development Tools:** Vite, TypeScript, PostCSS with Tailwind and Autoprefixer.
- **Form & Validation:** React Hook Form, `@hookform/resolvers`.
- **Session Management:** `connect-pg-simple`.
- **Messaging Services:** Twilio (via Replit Twilio connector), Resend (via Replit Resend connector).
- **Utilities:** `clsx`, `tailwind-merge`, `class-variance-authority`, `nanoid`.