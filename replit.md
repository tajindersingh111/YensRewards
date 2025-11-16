# Yens Thai Ice Cream Loyalty System

## Current Version: v2.7.3
**Latest Updates (v2.7.3):**
- Split **Upcoming Birthdays** into two sections: "Current Week" and "This Month"
- Applied **thicker border (4px)** to Current Week section for visual emphasis
- Applied standard border (2px) to This Month section
- Each section has independent "Send All" button and customer count badge
- Full bilingual support (Thai/English) for new section headings

**Previous Version (v2.7.2):**
- Restored **customer count badge** in Customers tab showing total number of customers
- Removed non-functional **Tag column** from Customers table for cleaner layout
- Improved table readability with 7 essential columns

**Previous Version (v2.7.1):**
- Dashboard tab renamed to **Customer Dashboard** for clarity
- Yellow borders added around Top 10 Spenders and Upcoming Birthdays sections
- Enhanced visual identity with Yens brand color (#FCD34D)
- Full bilingual support (Thai/English) for tab label changes

**Previous Version (v2.7.0):**
- New **Sites Management** system for tracking physical locations (stalls/mobile vans)
- Site CRUD operations with operating schedules (days and hours)
- Support for fixed stalls and mobile vans with location tracking
- Active/inactive site status management
- Dedicated Sites tab in admin dashboard
- Restored **Dashboard tab** with Top 10 Spenders and Upcoming Birthdays sections
- Birthday categorization by time periods (today, tomorrow, this week, this month)
- Send birthday messages functionality with batch sending support
- Full bilingual support (Thai/English) for all features
- End-to-end tested with successful operations

**Previous Version (v2.6.0):**
- New **Yens Overview** tab as first admin dashboard tab
- Weekly business health dashboard with key metrics (revenue, transactions, customers, loyalty)
- Visual trend charts for daily revenue and transaction volume
- Best day of the week highlight
- Week-over-week performance comparison with change indicators
- Full bilingual support (Thai/English) with locale-aware date formatting

**Previous Version (v2.5.1):**
- Enhanced customer selection in Send Message form to display email addresses
- Email addresses now prominently shown when Email channel is selected
- Improved UX for verifying recipient contact information before sending

**⚠️ Known Issue - Email Delivery:**
- Resend API configured but emails not being delivered (messageId returns undefined)
- Pending migration to SendGrid for more reliable email delivery
- To set up SendGrid later: Will need SendGrid API key and verified sender email address
- Current workaround: SMS messaging via Twilio works reliably; in-app notifications functional

**Previous Version (v2.5.0):**
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
- **Database Schema:** `customers`, `transactions`, `promotions`, `products`, `referrals`, `users`, `message_templates`, `message_log`, `sites` tables managed with Drizzle ORM.
- **User Management:** Admin-only user account management (CRUD), three-role system (admin/manager/barista), role assignment and editing, user deletion, bilingual UI (Thai/English), email-based user creation.
- **Messaging System:** Twilio for SMS, Resend for email, multi-channel support (including in-app notifications), admin-managed templates with dynamic placeholders, comprehensive logging, automated birthday messages.
- **Internationalization (i18n):** Full bilingual support (Thai/English) using react-i18next, Thai as default, localStorage persistence, LanguageSwitcher component. All admin features fully internationalized including user management, customer management, product management, messaging, and promotions.
- **Product Management:** CSV bulk import with photo URL support and Thai category mapping, product codes and costs, image storage.
- **Core Features:** Customer loyalty (points, tiers), transaction processing (QR, OCR), customer management (self-registration, profile, referrals, CSV bulk import with smart upsert logic and validation, bulk delete with date filters, expandable customer details, individual customer deletion, duplicate phone detection), admin analytics (weekly overview dashboard with metrics and charts, performance tracking), tier-based promotions, product menu, automated birthday messaging, user account management (admin-only), sites management (physical location tracking with operating schedules for current operations and future franchise oversight).

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
- **Messaging Services:** Twilio for SMS (via Replit Twilio connector, working), Resend for email (via Replit Resend connector, has delivery issues - pending switch to SendGrid).
- **Utilities:** `clsx`, `tailwind-merge`, `class-variance-authority`, `nanoid`.