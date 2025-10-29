# Yens Thai Ice Cream Loyalty System

## Overview

A multi-interface loyalty management system for Yens Thai Ice Cream, designed to enhance customer engagement and streamline operations. The system comprises a Customer App, Barista App, and Admin Dashboard, all interconnected to manage customer loyalty points, transactions, and promotions. It aims to enable customers to earn and redeem points, empower baristas with efficient transaction processing, and provide administrators with comprehensive analytics and promotional tools. The project focuses on creating a seamless, mobile-first experience for customers while offering robust management capabilities for the business.

## User Preferences

Preferred communication style: Simple, everyday language.

## Development Status

**SYSTEM VERSION: v88** 🚀
- Unified version across all apps for easier tracking
- All apps display version number in header
- **MOBILE-FIRST RESPONSIVE DESIGN** optimized for iPhone and Android

**RECENT FIXES (v65-v88):**
- ✅ **5-SECOND REFRESH LOOP FIXED** (v65) - Service worker unregister code added to HTML <head> tag
- ✅ **AUTO-POLLING DISABLED** (v65) - Turned off all refetchInterval (was polling every 3-30 seconds)
- ✅ **ANDROID SCREEN WIDTH FIXED** (v68) - Removed max-width constraints; app now fills full screen on all devices
- ✅ **PERFECT PROPORTIONS FIXED** (v70) - Fixed max-width to 420px with px-6 padding for identical iOS/Android margins
- ✅ **COMPONENT SIZING MATCHED** (v71) - Adjusted QR code, Points card, and header to better match iOS proportions
- ✅ **COMPACT LAYOUT FIX** (v73) - Reduced spacing throughout to ensure bottom nav is visible; made all components more compact
- ✅ **RESPONSIVE SCALING FIX** (v75) - **MAJOR:** Implemented viewport-responsive font-size scaling using clamp() to match iOS/Android proportions; increased max-width to 480px
- ✅ **AGGRESSIVE SCALING BOOST** (v76) - **CRITICAL:** Increased scaling factor (18px on Android vs 16px iOS = 12.5% boost) with debug font-size display; v75 only produced 1px difference (imperceptible)
- ✅ **50% SCALING INCREASE** (v77) - **USER REQUEST:** Boosted Android to 24px (50% larger than iOS 16px) for better matching proportions
- ⚠️ **MEDIA QUERY FAILED** (v78) - Added viewport debug info; discovered 401-430px range too narrow for user's device
- ✅ **ANDROID USER-AGENT FIX** (v79) - **BREAKTHROUGH:** Replaced CSS media query with JavaScript Android detection via user-agent; directly sets font-size=24px on Android devices <500px viewport
- ✅ **VIEWPORT WIDTH FIX** (v80) - **CRITICAL:** Removed viewport width check entirely; Android was reporting 980px viewport width, failing the <500px check; now applies 24px to ALL Android devices
- ✅ **USER-AGENT CLIENT HINTS API** (v81) - **ROOT CAUSE FIX:** Android Chrome PWA was spoofing desktop user-agent; switched to navigator.userAgentData.platform API which reports real platform even with UA spoofing; works reliably in PWA context
- ✅ **LINUX PLATFORM DETECTION** (v82) - **FINAL FIX:** Android reports platform as "Linux" (not "Android"); updated detection to treat Linux platform as Android since Android is Linux-based
- ✅ **COMPONENT PROPORTIONS INCREASED** (v83) - QR code padding (p-3→p-6), Points card (text-6xl→text-7xl, p-6→p-8), Message area (p-3→p-4, text increased) to better match iOS proportions
- ✅ **MAJOR SIZE INCREASE** (v84) - QR code padding (p-6→p-10), Points card (text-7xl→text-8xl, p-8→p-10), Message area (p-4→p-5, all elements enlarged) for much closer iOS proportions
- ✅ **FINAL SIZE MATCHING** (v85) - QR code (p-10→p-16, text-8xl→text-9xl), Points card (p-10→p-14, same size as QR), Message box (p-5→p-6, border-3→border-4) to perfectly match iOS proportions
- ✅ **COMPACT SIZING FIX** (v86) - QR code padding reduced (p-16→p-6) to fill yellow border better; Points card compressed (p-14→p-8, gaps reduced) to match QR code height and create square shape
- ✅ **iOS PROPORTION MATCHING** (v87) - QR code (p-6→p-4, text reduced), Points card (p-8→p-6, text-9xl→text-7xl, all gaps minimized), Message box (p-6→p-4, border-4→border-2, lighter text), max-width (600px→420px) to perfectly match iOS reference
- ✅ **SCALE COMPENSATION FIX** (v88) - **CRITICAL:** Since 24px base = 1.5x scaling, reduced ALL utilities to compensate: QR (p-4→p-3, gap-3→gap-2, text-lg→text-base), Points (p-6→p-4, text-7xl→text-5xl, gap-2→gap-1.5), Message (p-4→p-3, text-base→text-sm, text-sm→text-xs), max-width (420px→400px) to achieve true iOS visual parity
- 🧹 **UI CLEANUP** (v68) - Removed diagnostic boxes, version badges, and debug text for clean professional look

**CUSTOMER APP - v88**
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

**BARISTA APP - v88**
- Compact header (text-sm "Barista" title, w-10 h-10 logo)
- Works correctly on both Android and iPhone devices
- Mobile-optimized with proper touch targets (44px minimum)
- **Auto-update DISABLED** - Completely turned off to prevent refresh issues
- Clean, professional UI
- Status: Production ready

**ADMIN DASHBOARD - v88**
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