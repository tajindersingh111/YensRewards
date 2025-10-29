# Yens Thai Ice Cream Loyalty System

## Overview

A multi-interface loyalty management system for Yens Thai Ice Cream, designed to enhance customer engagement and streamline operations. The system comprises a Customer App, Barista App, and Admin Dashboard, all interconnected to manage customer loyalty points, transactions, and promotions. It aims to enable customers to earn and redeem points, empower baristas with efficient transaction processing, and provide administrators with comprehensive analytics and promotional tools. The project focuses on creating a seamless, mobile-first experience for customers while offering robust management capabilities for the business.

## User Preferences

Preferred communication style: Simple, everyday language.

## Development Status

**SYSTEM VERSION: v73** 🚀
- Unified version across all apps for easier tracking
- All apps display version number in header
- **MOBILE-FIRST RESPONSIVE DESIGN** optimized for iPhone and Android

**RECENT FIXES (v65-v73):**
- ✅ **5-SECOND REFRESH LOOP FIXED** (v65) - Service worker unregister code added to HTML <head> tag
- ✅ **AUTO-POLLING DISABLED** (v65) - Turned off all refetchInterval (was polling every 3-30 seconds)
- ✅ **ANDROID SCREEN WIDTH FIXED** (v68) - Removed max-width constraints; app now fills full screen on all devices
- ✅ **PERFECT PROPORTIONS FIXED** (v70) - Fixed max-width to 420px with px-6 padding for identical iOS/Android margins
- ✅ **COMPONENT SIZING MATCHED** (v71) - Adjusted QR code, Points card, and header to better match iOS proportions
- ✅ **COMPACT LAYOUT FIX** (v73) - Reduced spacing throughout to ensure bottom nav is visible; made all components more compact
- 🧹 **UI CLEANUP** (v68) - Removed diagnostic boxes, version badges, and debug text for clean professional look

**CUSTOMER APP - v73**
- Features: Responsive QR code (full width), real Yens logo icons, Menu page
- **Message box ALWAYS VISIBLE** - Yellow-bordered announcement area positioned AFTER Points card, BEFORE Recent Transactions (shows welcome message as fallback if no promotions)
- **FIXED BOTTOM NAVIGATION** - TRUE fix using `h-screen` container (no white space below nav!)
- **ICE CREAM MENU ICON** - Added ice cream icon in both header and bottom nav
- **IMPROVED PROPORTIONS** - QR code fills full width, Points card has larger text (7xl) and more padding (p-8), header height reduced (py-3)
- **CONTAINER WIDTH** - Uses 420px max-width with px-6 horizontal padding for consistent iOS/Android margins
- Mobile-first responsive design with proper font scaling
- iPhone safe-area padding for notch and bottom nav compatibility
- Clean, professional UI without debug text
- Status: Production ready

**BARISTA APP - v73**
- Compact header (text-sm "Barista" title, w-10 h-10 logo)
- Works correctly on both Android and iPhone devices
- Mobile-optimized with proper touch targets (44px minimum)
- **Auto-update DISABLED** - Completely turned off to prevent refresh issues
- Clean, professional UI
- Status: Production ready

**ADMIN DASHBOARD - v73**
- Full analytics, customer management, product manager, promotions
- Responsive grid layouts (1 col mobile → 4 cols desktop)
- Mobile-optimized with proper font scaling
- Clean, professional UI
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