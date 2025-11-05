# Yens Thai Ice Cream Loyalty System

## Overview

A multi-interface loyalty management system for Yens Thai Ice Cream, designed to enhance customer engagement and streamline operations. The system comprises a Customer App, Barista App, and Admin Dashboard, all interconnected to manage customer loyalty points, transactions, and promotions. It aims to enable customers to earn and redeem points, empower baristas with efficient transaction processing, and provide administrators with comprehensive analytics and promotional tools. The project focuses on creating a seamless, mobile-first experience for customers while offering robust management capabilities for the business.

## User Preferences

Preferred communication style: Simple, everyday language.

## Development Status

**SYSTEM VERSION: v89** 🚀
- Unified version across all apps for easier tracking
- All apps display version number in header
- **MOBILE-FIRST RESPONSIVE DESIGN** optimized for iPhone and Android

**RECENT FIXES (v65-v89):**
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
- ✅ **BIRTHDAY REDESIGN** (v89) - **ADMIN DASHBOARD:** Replaced daily cards with time-based groupings (Today, Tomorrow, This Week, This Month); moved send buttons to bottom of cards using flex-col layout; improved date range labels and card layout
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

**ADMIN DASHBOARD - v89**
- **OVERVIEW TAB REDESIGNED** - Modern layout with:
  - Branch selector dropdown (defaults to "All Branches")
  - Member count display with Add/Upload action buttons
  - Top 10 Spenders horizontal scroll section with numbered avatar badges
  - **UPCOMING BIRTHDAYS** - Time-based birthday grouping system:
    - Four time-based groups: Today, Tomorrow, This Week, This Month
    - Only shows groups with birthdays (no empty cards)
    - Cards with Yens yellow/blue gradient styling
    - Cake icons and date range labels for each group
    - Customer avatars with 40% yellow tint overlay
    - Send buttons positioned at bottom of each card (flex-col layout)
    - Horizontal scrollable card layout (min-width: 220px)
    - Handles both MM-DD and YYYY-MM-DD date formats
    - Leap year support (Feb 29 → Feb 28 on non-leap years)
    - Month-spanning week handling (e.g., Dec 29-Jan 4)
    - Timezone-safe using local date components
  - Active/Inactive filter tabs (active = totalSpent > 0)
  - Search functionality across name, phone, email
  - Enhanced customer table with tier badges, spending, points
  - **YELLOW BRAND TINT ON PHOTOS** - All customer profile photos display with Yens yellow (#FCD34D) overlay for brand consistency
- **MESSAGES TAB (NEW)** - Complete message history and analytics:
  - **Statistics Dashboard** - Real-time metrics cards showing:
    - Total messages sent
    - Delivered, Failed, and Pending counts
    - SMS vs Email breakdown
  - **Message History Table** - Comprehensive audit trail with:
    - Date, Channel, Recipient, Message preview, Status
    - Customer names enriched from database
    - Color-coded status badges (delivered/green, sent/blue, failed/red, pending/yellow)
    - Error messages displayed for failed deliveries
  - **Advanced Filtering** - Multi-dimensional search:
    - Status filter (All, Pending, Sent, Delivered, Failed)
    - Channel filter (All, SMS, Email)
    - Recipient search (phone or email)
  - **Retry Functionality** - One-click retry for failed messages:
    - Manual retry button for failed SMS messages
    - Automatic Twilio resend on retry
    - Status updates in real-time
    - Error tracking for failed retries
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
- **Authentication & Authorization:** 
  - Replit Auth (OpenID Connect) integrated for admin/barista login
  - Session management using `connect-pg-simple` with PostgreSQL session store
  - Role-based access control: users table has `role` field ("admin" or "barista")
  - Admin dashboard protected with `isAuthenticated` and `isAdmin` middleware
  - All admin API endpoints (`/api/admin/*`) require authentication and admin role
  - Frontend uses `useAuth` hook for authentication state, redirects unauthorized users to login
- **Database Schema:** 
  - `customers` table: Core customer data (name, phone, email, birthday, photo, tier, points, totalSpent)
  - `transactions` table: Purchase records (customer, amount, points earned/redeemed)
  - `promotions` table: Tier-based promotions with message templates
  - `products` table: Product catalog with pricing
  - `referrals` table: Tracks referral relationships (referrer → referred)
  - `users` table: Admin/barista authentication (email, role, created via Replit Auth)
  - `message_templates` table: Multi-channel message templates (SMS/Email/Both) with placeholders
  - `message_log` table: Complete message delivery audit trail with status tracking
  - All managed with Drizzle ORM, type-safe migrations
- **Messaging System:** 
  - **Twilio Integration:** SMS sending via Replit Twilio connector for transactional messages
  - **Resend Integration:** Email sending via Replit Resend connector for marketing/transactional emails
  - **Multi-channel Support:** Templates support SMS only, Email only, or Both channels
  - **Template Management:** Admin-managed message templates with dynamic placeholder substitution ({name}, {tier}, {points})
  - **Message Logging:** Comprehensive logging of all sent messages with status tracking (pending, sent, delivered, failed)
  - **Automated Birthday Messaging:** System automatically sends birthday messages through configured channels
  - **Retry Functionality:** Failed messages can be retried with one click from admin dashboard
- **Core Features:** 
  - Customer loyalty (point accumulation, tier management with Bronze/Silver/Gold/Platinum)
  - Transaction processing via Barista app with QR code scanning and receipt OCR
  - Customer management (self-registration, profile with photo upload, transaction history, referral tracking)
  - Admin analytics (KPIs dashboard, sales reporting, customer lifetime value, CSV export)
  - Tier-based promotions with in-app notifications and message delivery
  - Product menu system with admin CRUD operations
  - Birthday tracking with automated multi-channel messaging

### System Design Choices
- **Type Safety:** End-to-end TypeScript with shared Zod schemas for validation across frontend and backend
- **Scalability:** Interface-based storage design allows easy switching from in-memory to database persistence; serverless-ready architecture
- **Progressive Enhancement:** Mock functionality used during development for parallel UI and backend development
- **Mobile-First:** All interfaces optimized for mobile devices with responsive breakpoints for tablet/desktop
- **Brand Consistency:** Yens yellow (#FCD34D) color scheme applied throughout all apps with professional polish

## External Dependencies

- **UI Components:** Radix UI primitives, Shadcn UI, Lucide React (icons), `date-fns` for date manipulation
- **Database & ORM:** Neon serverless PostgreSQL, Drizzle ORM, Drizzle Kit, Drizzle Zod for schema validation
- **Development Tools:** Vite, TypeScript, PostCSS with Tailwind and Autoprefixer
- **Form & Validation:** React Hook Form, `@hookform/resolvers` (for Zod integration)
- **Session Management:** `connect-pg-simple` for PostgreSQL-backed session storage
- **Messaging Services:** 
  - Twilio (via Replit Twilio connector) for SMS delivery
  - Resend (via Replit Resend connector) for email delivery
- **Utilities:** `clsx`, `tailwind-merge`, `class-variance-authority`, `nanoid` for ID generation
