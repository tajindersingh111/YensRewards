# Yens Loyalty System - Mobile App Installation Guide

The Yens Loyalty System is now available as a Progressive Web App (PWA) that can be installed on iOS and Android devices!

## 📱 What is a PWA?

A Progressive Web App works like a native app but installs directly from your web browser - no App Store or Play Store needed. Once installed, it:
- Appears on your home screen with the Yens icon
- Opens in full-screen mode (no browser UI)
- Works offline for basic features
- Sends notifications (coming soon)
- Loads instantly like a native app

## 🍦 Available Apps

### Customer App (`/customer`)
- View loyalty points and tier status
- Show QR code for scanning
- Track purchase history
- Check promotions and rewards
- Refer friends and view leaderboard

### Barista App (`/barista`)
- Scan customer QR codes
- Verify customer identity with photo
- Capture receipt photos (OCR ready)
- Process transactions and award points
- Select location (Main Store, Night Bazaar, etc.)

### Admin Dashboard (`/admin`)
- View sales analytics and KPIs
- Manage customer database
- Import/Export customer CSV files
- Send SMS promotions via Twilio
- Multi-location reporting

## 📲 Installation Instructions

### For iPhone/iPad (iOS):

1. Open Safari browser (must use Safari, not Chrome)
2. Visit your Yens app URL
3. Tap the Share button (square with arrow)
4. Scroll down and tap "Add to Home Screen"
5. Tap "Add" in the top right
6. The Yens app icon will appear on your home screen!

### For Android:

1. Open Chrome browser
2. Visit your Yens app URL
3. Tap the three dots menu (⋮) in the top right
4. Tap "Install app" or "Add to Home screen"
5. Tap "Install" in the popup
6. The Yens app icon will appear on your home screen!

**Alternative for Android:**
- When you visit the app, you may see an install banner at the bottom
- Simply tap "Install" on that banner

## ✨ Features

### Offline Support
- Service worker caches essential app files
- Basic navigation works without internet
- Syncs data when connection returns

### Native-like Experience
- Full-screen app mode
- Yellow Yens branding throughout
- Smooth animations and transitions
- Fast loading with caching

### App Shortcuts
Once installed, long-press the app icon to access shortcuts:
- Customer App
- Barista App  
- Admin Dashboard

## 🔧 Technical Details

### PWA Manifest (`/manifest.json`)
- App name: "Yens Loyalty System"
- Theme color: #FCD34D (Yens yellow)
- Icons: 192x192 and 512x512 with polar bear mascot
- Start URL: `/` (home page)
- Display: standalone (full-screen)

### Service Worker (`/sw.js`)
- Caches app shell for offline access
- Precaches: `/`, `/customer`, `/barista`, `/admin`
- Network-first strategy for API calls

### Mobile Optimization
- Responsive design for all screen sizes
- Touch-friendly buttons and controls
- Optimized for portrait orientation
- Prevents accidental zoom (`user-scalable=no`)

## 🎯 Recommended Setup

**For Customers:**
- Install Customer App on personal phones
- Add to home screen for quick access
- Enable notifications for promotions

**For Baristas:**
- Install Barista App on staff tablets/phones
- Use camera for QR scanning and receipts
- Quick access during busy hours

**For Managers:**
- Install Admin Dashboard on tablets
- Monitor sales and customer metrics
- Send promotions on the go

## 🚀 Next Steps

1. **Test on actual devices** - PWAs work best when installed
2. **Enable push notifications** - Get promotion alerts
3. **Train staff** - Show baristas how to install and use
4. **Share with customers** - Promote the easy installation process

## 📊 Browser Support

- ✅ iOS Safari 11.3+
- ✅ Android Chrome 40+
- ✅ Samsung Internet 4+
- ⚠️ iOS Chrome (limited - use Safari instead)
- ❌ iOS Firefox (no PWA support)

## 🔐 Security

- HTTPS required (automatically provided by Replit)
- Service worker runs in secure context
- No app store permissions needed
- Data stored locally in browser cache

---

**Your Yens loyalty system is now a mobile app!** 🎉

Install it today and enjoy the native app experience without downloading from any store.
