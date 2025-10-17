# Yens Thai Ice Cream Loyalty System

## Overview

A multi-interface loyalty management system for Yens Thai Ice Cream, consisting of three interconnected applications:

1. **Customer App** - Mobile-first interface for customers to view points, QR codes, transactions, referrals, and leaderboards
2. **Barista App** - Point-of-sale interface for scanning customer QR codes, capturing receipts, and processing transactions
3. **Admin Dashboard** - Management interface for viewing KPIs, customer data, sales analytics, and sending targeted promotions

The system enables customers to earn points through purchases, track their loyalty tier (Bronze/Silver/Gold), and redeem rewards. Baristas scan customer QR codes to verify identity and award points based on purchase amounts. Admins monitor business metrics and engage customers with tier-based promotional campaigns.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React 18 with TypeScript for type safety
- Vite as the build tool and dev server
- Wouter for client-side routing (lightweight React Router alternative)
- TanStack Query (React Query) for server state management
- Shadcn UI components built on Radix UI primitives for accessible, composable UI

**Design System:**
- Tailwind CSS for utility-first styling with custom theme configuration
- Color palette featuring Yens Yellow (primary), Yens Blue (secondary), with tier-specific colors (Bronze/Silver/Gold)
- Inter font family from Google Fonts for consistent typography
- Mobile-first responsive design with light mode only (no dark mode required)
- Custom CSS variables for theme colors and elevation effects (hover/active states)

**Component Architecture:**
- Atomic design pattern with reusable UI components in `/client/src/components/ui/`
- Feature-specific components for each app (QR scanner, points card, KPI cards, etc.)
- Example components provided in `/client/src/components/examples/` for reference
- Path aliases configured (`@/`, `@shared/`, `@assets/`) for clean imports

**State Management:**
- React Query for API data fetching and caching with customized query client
- Local component state with React hooks for UI-only state
- Toast notifications for user feedback using Shadcn toast component

### Backend Architecture

**Technology Stack:**
- Node.js with Express.js for REST API server
- TypeScript throughout with ES modules
- Drizzle ORM for type-safe database operations
- Neon serverless PostgreSQL for production database

**Server Structure:**
- Express middleware for JSON parsing, URL encoding, and request logging
- Centralized error handling middleware with status code mapping
- Vite integration for development with HMR and production static serving
- Custom request logging with duration tracking for API endpoints

**Storage Layer:**
- In-memory storage implementation (`MemStorage`) for development/testing
- Interface-based design (`IStorage`) allowing swap between memory and database persistence
- Currently implements basic user CRUD operations
- Database schema defined in `/shared/schema.ts` using Drizzle ORM with Zod validation

**API Design:**
- RESTful endpoints prefixed with `/api`
- Centralized API request helper with automatic error handling
- Custom query functions for React Query integration
- Credential-based authentication (cookies/sessions) prepared via connect-pg-simple

### External Dependencies

**UI Component Library:**
- Radix UI primitives (20+ components) for accessible, unstyled components
- Shadcn UI pattern for customizable component variants
- Lucide React for consistent iconography
- date-fns for date formatting and manipulation

**Database & ORM:**
- Neon serverless PostgreSQL (@neondatabase/serverless) with WebSocket support
- Drizzle ORM for schema definition and queries
- Drizzle Kit for migrations
- Drizzle Zod for runtime validation schemas

**Development Tools:**
- Vite plugins: React, runtime error overlay, Replit-specific tooling (cartographer, dev banner)
- TypeScript with strict mode and path resolution
- PostCSS with Tailwind and Autoprefixer

**Form & Validation:**
- React Hook Form with @hookform/resolvers for form state
- Zod schemas for validation shared between client and server

**Session Management:**
- connect-pg-simple for PostgreSQL session storage (configured but not yet implemented)
- Express session handling prepared for authentication flow

**Utilities:**
- clsx and tailwind-merge for conditional class merging
- class-variance-authority for component variant styling
- nanoid for unique ID generation

## Key Architectural Decisions

**Monorepo Structure:**
- `/client` - Frontend React application
- `/server` - Express backend
- `/shared` - Shared types and schemas between client/server
- Enables code sharing while maintaining separation of concerns

**Progressive Enhancement:**
- Mock functionality throughout (`//todo: remove mock functionality` comments)
- Allows UI development and testing without full backend implementation
- Real implementations to be added incrementally

**Type Safety:**
- End-to-end TypeScript with shared schema definitions
- Drizzle Zod schemas generate both runtime validators and TypeScript types
- Path aliases ensure clean, maintainable imports

**Scalability Preparation:**
- Interface-based storage allowing migration from memory to database
- Serverless-ready with Neon PostgreSQL
- Stateless API design with session storage externalized to database

## Recent Changes (October 17, 2025)

### Database Schema Implementation
- Created comprehensive PostgreSQL schema with Drizzle ORM:
  - `customers` table: id, phone, name, email, points, tier, birthdate, photo, referredBy, joinDate
  - `transactions` table: id, customerId, type, amount, points, location, receiptUrl, createdAt
  - `promotions` table: id, title, description, targetTier, message, sentAt, createdAt
  - `referrals` table: id, referrerId, referredId, pointsEarned, createdAt
- Successfully pushed schema to Neon PostgreSQL database
- Implemented insert/select schemas with Zod validation for type safety

### Backend API Implementation
- **Authentication System**: Integrated Replit Auth for barista/admin login with session management
- **Customer Endpoints**:
  - GET `/api/customers/:id` - Fetch customer profile by ID
  - GET `/api/customers/phone/:phone` - Fetch customer by phone number for login
  - GET `/api/customers/:id/transactions` - Fetch customer transaction history
  - POST `/api/customers` - Create new customer account
- **Transaction Endpoints**:
  - POST `/api/transactions` - Create purchase transaction (temporarily without auth for testing)
  - Validates data with Zod schemas before database insertion
  - Auto-calculates points (1 point per ฿10 spent)
- **Referral & Promotion Endpoints**: Structure in place, to be implemented
- All endpoints return proper error responses with status codes

### Frontend Integration
- **Customer App** (`/customer`):
  - Connected to real backend API with phone-based login
  - Real-time data fetching for points, tier, and transaction history
  - QR code display for barista scanning (currently shows customer ID)
  - Points card, transaction list, referral tracking all live
- **Barista App** (`/barista`):
  - Multi-step transaction flow: Scan → Verify → Capture Receipt → Confirm → Success
  - Customer verification with real API data (name, photo, points, tier)
  - Receipt amount entry with auto-calculated points display
  - Transaction confirmation and API submission working end-to-end
  - Location selector for multi-location tracking
  - Success feedback with 2-second auto-reset to scanner
- **Admin Dashboard** (`/admin`): UI complete, backend integration pending

### Current Status
- ✅ Database schema and migrations complete
- ✅ Core API endpoints functional for customers and transactions
- ✅ Customer App fully connected to backend
- ✅ Barista App fully connected to backend with complete transaction flow
- ✅ Admin Dashboard fully connected to backend with real-time analytics
- ✅ Phone lookup feature for baristas (alternative to QR scanning)
- ✅ CSV export for customer data
- ✅ Real-time KPI dashboard (sales, customers, avg transaction, points redeemed)
- ✅ Complete user journey tested end-to-end
- ⏳ QR code generation/scanning needs real implementation (phone lookup works as alternative)
- ⏳ Receipt photo upload to Object Storage pending
- ⏳ OCR integration for receipt scanning pending
- ⏳ Twilio SMS integration for promotions pending
- ⏳ Barista/Admin authentication needs to be re-enabled for production

### Testing & Validation
- ✅ Complete user journey tested: Customer signup → Barista transaction → Admin analytics
- ✅ Customer lookup by phone works correctly (both customer app and barista app)
- ✅ Transaction creation persists to PostgreSQL successfully
- ✅ Points calculation (฿10 = 1 point) verified and updates customer records
- ✅ Multi-step barista workflow tested end-to-end with phone lookup
- ✅ Admin dashboard KPIs update in real-time from database
- ✅ Customer list and CSV export working correctly
- ✅ Auto-invalidation of customer queries after transaction ensures fresh data

### Key Features Implemented (October 17, 2025)
1. **Phone Lookup for Baristas**: Added "Lookup by Phone" button in QR scanner as alternative to QR code scanning
2. **Admin Analytics API**: Real-time KPIs including total sales, customers, average transaction, points redeemed
3. **Sales by Location Chart**: Visual breakdown of revenue by store/market location
4. **Customer Management**: Full CRUD with CSV export capability
5. **Promotion System**: Backend ready for tier-based SMS campaigns (Twilio integration pending)