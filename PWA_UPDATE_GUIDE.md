# How to Update Your Yens PWA with the New Icon

## The Problem
PWA icons are "frozen" when you first install an app. Even after publishing updates, the old icon remains on your phone's home screen until you reinstall the app.

## Solution: Reinstall the App

### For Android Users:
1. **Uninstall the old app:**
   - Long press the "Yens" app icon on your home screen
   - Drag it to "Uninstall" or tap the "Uninstall" option
   - Confirm removal

2. **Clear browser cache (important!):**
   - Open Chrome
   - Tap the three dots (⋮) → Settings → Privacy and security
   - Tap "Clear browsing data"
   - Select "Cached images and files"
   - Tap "Clear data"

3. **Reinstall the app:**
   - Go to your published website
   - Scan the Customer App QR code (or navigate to /customer)
   - Tap "Add to Home Screen" when prompted
   - The Yens logo should now appear!

### For iPhone Users:
1. **Remove the old app:**
   - Long press the "Yens" app icon
   - Tap "Remove App" → "Delete App"
   - Confirm deletion

2. **Clear Safari cache (important!):**
   - Open Settings app
   - Scroll down to Safari
   - Tap "Clear History and Website Data"
   - Confirm

3. **Reinstall the app:**
   - Open Safari
   - Go to your published website
   - Navigate to /customer route
   - Tap the Share button (square with arrow)
   - Tap "Add to Home Screen"
   - The Yens logo should now appear!

## For Testing After Publishing:
1. Publish your app
2. On your phone, uninstall the old version
3. Clear browser cache
4. Scan the QR code or visit the site
5. Install the app fresh
6. Check your home screen - the Yens logo should be there!

## Technical Notes:
- Service worker updated to v3 (forces cache refresh)
- Icons are: pwa-icon-192.png (Android), pwa-icon-512.png (high-res), apple-touch-icon.png (iOS)
- All manifest files properly reference these icons
- Once installed with the new icons, the app will persist correctly
