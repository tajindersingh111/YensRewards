# Yens Thai Ice Cream Loyalty System - Design Guidelines

## Design Approach

**Hybrid Approach**: Combining established Yens branding with modern loyalty app patterns (inspired by Starbucks Rewards, Dunkin' Rewards, and 7-Eleven apps). The design prioritizes ease of use while maintaining the warm, welcoming character of the Yens brand.

## Core Design Elements

### A. Color Palette

**Primary Colors:**
- **Yens Yellow**: 45 98% 63% - Primary brand color for CTAs, highlights, and active states
- **Yens Blue**: 214 100% 32% - Deep blue for headers, navigation, and secondary elements
- **Clean White**: 0 0% 100% - Primary background for all apps

**Supporting Colors:**
- **Success Green**: 142 71% 45% - Points earned, tier upgrades, successful transactions
- **Warning Orange**: 25 95% 53% - Promotions, limited-time offers
- **Neutral Gray**: 220 13% 46% - Secondary text, borders, disabled states
- **Light Gray**: 220 13% 91% - Card backgrounds, subtle separators

**Tier Colors:**
- Bronze: 30 60% 50%
- Silver: 0 0% 63%
- Gold: 45 93% 47%

**Dark Mode**: Not required for initial launch. Focus on light, bright, welcoming interface.

### B. Typography

**Font Family**: Inter (via Google Fonts CDN)

**Scale:**
- Display (Hero Numbers): text-6xl font-bold (60px) - Points display, leaderboard rankings
- Heading 1: text-4xl font-bold (36px) - Page titles
- Heading 2: text-2xl font-semibold (24px) - Section headers
- Heading 3: text-xl font-semibold (20px) - Card titles
- Body Large: text-lg (18px) - Primary content
- Body: text-base (16px) - Default text
- Small: text-sm (14px) - Labels, captions
- Tiny: text-xs (12px) - Metadata, timestamps

### C. Layout System

**Spacing Units**: Tailwind scale focused on 4, 6, 8, 12, 16, 24 (p-4, mb-6, gap-8, py-12, mt-16, px-24)

**Containers:**
- Mobile: px-4 (16px horizontal padding)
- Desktop: max-w-7xl mx-auto px-6

**Grid Patterns:**
- Customer App: Single column mobile, 2-column for features on tablet+
- Barista App: Large touch targets, minimal columns for speed
- Admin Dashboard: 3-4 column grid for metrics cards, responsive tables

### D. Component Library

**Navigation:**
- Customer App: Bottom tab bar with 4 icons (Home, Rewards, Referrals, Profile)
- Barista App: Simple top header with location selector
- Admin Dashboard: Sidebar navigation with collapsible sections

**Cards:**
- Points Display Card: Large, centered, with tier badge and progress bar
- Transaction Card: Receipt thumbnail, amount, points earned, timestamp
- Promotion Card: Image background with gradient overlay, CTA button
- Report Card: Icon, metric value, trend indicator, sparkline

**Buttons:**
- Primary: bg-yellow-400 text-blue-900 with rounded-xl, py-4 px-8, bold text
- Secondary: border-2 border-blue-900 text-blue-900 with backdrop-blur if on images
- Icon Buttons: Rounded-full with 48px minimum touch target

**Forms:**
- Large input fields with clear labels above
- Camera button for receipt: Full-width, icon + text, vibrant yellow
- QR Scanner: Fullscreen overlay with centered viewfinder

**Data Display:**
- Leaderboard: Numbered list with avatar, name, points, rank badge
- Tier Progress: Linear progress bar with milestone markers
- Sales Charts: Simple bar/line charts using Chart.js or Recharts

**Overlays:**
- Modals: Centered, max-w-md, rounded-2xl, drop-shadow-2xl
- Toast Notifications: Top-right, slide-in animation, auto-dismiss
- Scan Success: Fullscreen confetti animation with points earned

### E. Animations

**Minimal & Purposeful:**
- Points Counter: Number counting animation on transaction success
- Tier Upgrade: Celebration animation with tier badge reveal
- QR Scan Success: Quick checkmark + haptic feedback
- Page Transitions: Simple fade, 150ms duration
- Button Interactions: Scale on press (scale-95 active state)

## App-Specific Design Guidelines

### Customer App
- **Home Screen**: Large QR code centered, points balance above, tier status below, recent transactions list
- **Rewards Screen**: Grid of redeemable items with point costs, "Redeem" buttons
- **Referrals Screen**: Unique code display, share buttons, referral count
- **Profile Screen**: Avatar, tier badge, transaction history, birthday display
- **Color Treatment**: Vibrant yellow for primary actions, blue for navigation

### Barista App
- **Scan Screen**: Large camera viewfinder, "Tap to scan QR" instruction
- **Receipt Capture**: Camera feed with shutter button, manual entry option below
- **Confirmation Screen**: Customer name, amount, calculated points, "Confirm" button
- **Design Focus**: Extra-large touch targets (min 56px), high contrast text, minimal steps

### Admin Dashboard
- **Overview**: KPI cards in 4-column grid, sales chart, recent transactions table
- **Reports**: Date range picker, location filter, export buttons, data tables with sorting
- **Customers**: Search bar, filter by tier, customer cards with contact options
- **Promotions**: Create/edit forms, SMS preview, scheduling calendar
- **Design Focus**: Data-dense but organized, clear visual hierarchy, professional appearance

## Images

**Customer App:**
- Tier badge icons (Bronze/Silver/Gold bears wearing Yens apron)
- Reward item photos (ice cream products from menu)
- Promotional banners (seasonal offers, 16:9 ratio)

**Barista App:**
- Receipt photos (user-captured, displayed as thumbnails)
- No decorative images - functional only

**Admin Dashboard:**
- Location photos for market stalls/expos
- Product category icons
- Chart/graph visualizations

## Key Design Principles

1. **Immediate Value**: Customer sees points balance and tier status within 2 seconds of opening app
2. **One-Tap Actions**: Barista can complete a transaction in 3 taps (scan → photo → confirm)
3. **Visual Hierarchy**: Yellow draws attention to primary actions, blue provides structure
4. **Celebration Moments**: Animate tier upgrades, milestone achievements, referral successes
5. **Trust & Transparency**: Show receipt photos in transaction history for verification
6. **Mobile-First**: Optimize all touch targets for thumb-friendly interaction
7. **Brand Consistency**: Yens polar bear mascot appears in tier badges, empty states, success screens