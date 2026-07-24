# Standalone QR Customer Registration Form

This is a standalone, lightweight customer registration interface designed for customers to self-register by scanning a QR code on marketing materials or tables at Yen's stores.

## Features
- **Clean Field Validation:** Validates required fields (Name, Phone) and formats (Email, Birthday dates).
- **Dynamic Duplicate Verification:** Queries `GET /api/customers/check-phone/:phone` on blur to prevent duplicate customer signups.
- **Success Screen:** Displays a gorgeous Points Celebration Badge (`+50 Welcome Points`) and instructions on how to use points.
- **Dual Language Support:** Standard toggle switch in the header for English (EN) and Thai (TH).

## Deployment & Hosting
This static page is served directly at `/register.html` of your primary `YensRewards` ecosystem domain.
When you push code changes:
1. Vite copies `client/public/register.html` to `dist/public/register.html`.
2. The Node.js Express server hosts this page statically.
3. Because they share the same domain name, the page communicates directly with the backend API (`/api/customers`) without CORS configurations or token leaks.
