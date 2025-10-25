# Yens Thai Ice Cream Loyalty System

## Overview

A multi-interface loyalty management system for Yens Thai Ice Cream, designed to enhance customer engagement and streamline operations. The system comprises a Customer App, Barista App, and Admin Dashboard, all interconnected to manage customer loyalty points, transactions, and promotions. It aims to enable customers to earn and redeem points, empower baristas with efficient transaction processing, and provide administrators with comprehensive analytics and promotional tools. The project focuses on creating a seamless, mobile-first experience for customers while offering robust management capabilities for the business.

## User Preferences

Preferred communication style: Simple, everyday language.

## Development Status

**SYSTEM VERSION: v59** 🚀
- Unified version across all apps for easier tracking
- All apps display version number in header
- **MOBILE-FIRST RESPONSIVE DESIGN** optimized for iPhone and Android

**CUSTOMER APP - v59**
- Features: 400px QR code, real Yens logo icons, Menu page
- Message/announcement area positioned AFTER Points card, BEFORE Recent Transactions
- Fixed promotion filter logic (now shows 'all' and empty targetTier promotions)
- Mobile-first responsive design with proper font scaling (16px mobile → 18px desktop)
- iPhone safe-area padding for notch compatibility
- Version display in header
- Status: Production ready

**BARISTA APP - v59**
- Compact header (text-sm "Barista" title, w-10 h-10 logo)
- Works correctly on both Android and iPhone devices
- Mobile-optimized with proper touch targets (44px minimum)
- Auto-update detection implemented
- Version display in header
- Status: Production ready

**ADMIN DASHBOARD - v59**
- Full analytics, customer management, product manager, promotions
- Responsive grid layouts (1 col mobile → 4 cols desktop)
- Mobile-optimized with proper font scaling
- Version display in header
- Status: Production ready

## System Architecture

### UI/UX Decisions
- **Design System:** Tailwind CSS for utility-first styling, custom Yens brand color palette (Yens Yellow, Yens Blue, tier-specific colors), Inter font family.
- **Responsiveness:** TRUE mobile-first responsive design (16px base → 18px desktop); iPhone safe-area padding for notch; pinch-zoom enabled; 44px minimum touch targets; light mode only.
- **Component Library:** Shadcn UI built on Radix UI primitives for accessible, composable components.
- **PWAs:** Dedicated PWA manifests and installation flows for Customer, Barista, and Admin apps, enabling one-tap installation and dynamic QR code-based installation for each app.

### Technical Implementations
- **Frontend:** React 18 with TypeScript, Vite for bundling, Wouter for routing, TanStack Query for server state management. Atomic design pattern with reusable UI components.
- **Backend:** Node.js with Express.js, TypeScript, Drizzle ORM for type-safe database interactions, Neon serverless PostgreSQL for production.
- **Monorepo Structure:** `/client` (React app), `/server` (Express API), `/shared` (common types/schemas) for code sharing and separation of concerns.
- **API Design:** RESTful endpoints, centralized error handling, Zod for schema validation.
- **State Management:** React Query for API data, local React hooks for UI state.
- **Authentication:** Replit Auth integrated for barista/admin login, session management using `connect-pg-simple`.
- **Database Schema:** Comprehensive PostgreSQL schema including `customers`, `transactions`, `promotions`, `products`, and `referrals` tables, managed with Drizzle ORM.
- **Core Features:**
    - **Customer Loyalty:** Point accumulation (1 point per ฿10), tier management (Bronze/Silver/Gold).
    - **Transaction Processing:** Barista app with multi-step transaction flow, customer verification via QR or phone lookup, receipt amount entry, and point calculation.
    - **Customer Management:** Self-registration, profile management, transaction history, referral tracking.
    - **Admin Analytics:** Real-time KPIs (sales, customers, average transaction, points redeemed), sales by location, customer list management with CSV export.
    - **Promotions:** Tier-based promotion system with in-app notification badges and PWA badge API integration.
    - **Product Menu System:** Visual product catalog with categories (Soft Serve, Milk Tea, Fruit Tea, Shakes, Sundaes, Float Drinks), promotional badges (New, Popular, Limited Time, On Sale), featured items, and admin CRUD interface for menu management. Accessible to customers via `/menu` route with category filtering and responsive card layout.

### System Design Choices
- **Type Safety:** End-to-end TypeScript with shared Zod schemas for both client and server.
- **Scalability:** Interface-based storage design allows swapping between in-memory and database persistence; serverless-ready with Neon PostgreSQL.
- **Progressive Enhancement:** Mock functionality used during development to allow parallel UI and backend development, with real implementations integrated incrementally.

## External Dependencies

- **UI Components:** Radix UI primitives, Shadcn UI, Lucide React for icons, `date-fns` for date manipulation.
- **Database & ORM:** Neon serverless PostgreSQL, Drizzle ORM, Drizzle Kit for migrations, Drizzle Zod for validation.
- **Development Tools:** Vite, TypeScript, PostCSS with Tailwind and Autoprefixer.
- **Form & Validation:** React Hook Form, `@hookform/resolvers` (for Zod integration).
- **Session Management:** `connect-pg-simple` for PostgreSQL session storage.
- **Utilities:** `clsx`, `tailwind-merge`, `class-variance-authority`, `nanoid`.