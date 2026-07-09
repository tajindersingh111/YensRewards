# YensRewards API Authentication & Authorization Guide (JWT-based)

This document describes the JSON Web Token (JWT) authentication system configured for the YensRewards API backend, designed to support the **4 separate Flutter APK clients** (mobile checkout apps, customer app, barista app, and admin tools).

---

## 1. Authentication Flow Overview

The system uses standard **Bearer Token** authentication over HTTPS.
- **Access Tokens**: Short-lived JWTs (valid for **1 hour**) passed in the HTTP `Authorization` header.
- **Refresh Tokens**: Long-lived tokens (valid for **7 days**) used to issue new access tokens without requiring credentials.
- **Storage**: Refresh tokens are stored securely in the PostgreSQL database in **SHA-256 hashed** format.

---

## 2. API Endpoints Reference

### 2.1 Login
* **URL**: `/api/auth/login`
* **Method**: `POST`
* **Rate Limit**: Maximum 10 failed login attempts within 15 minutes per IP address (returns `429 Too Many Requests`).
* **Request Body**:
```json
{
  "email": "barista1@yensthai.com",
  "password": "securepassword123",
  "app_id": "pos_checkout_app" 
}
```
> **Note**: `app_id` (or `client_id`) is optional but highly recommended to specify which client is logging in (e.g. `"app1"`, `"app2"`, `"customer_app"`, `"barista_app"`).

* **Success Response (200 OK)**:
```json
{
  "success": true,
  "requires2FA": false,
  "user": {
    "id": "c71a3962-d961-4607-b371-bd235cb1017e",
    "email": "barista1@yensthai.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "barista",
    "isActive": true
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Login successful"
}
```

---

### 2.2 Refresh Token
Exchanges a valid refresh token for a new access token and refresh token pair (Refresh Token Rotation).
* **URL**: `/api/auth/refresh`
* **Method**: `POST`
* **Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

* **Success Response (200 OK)**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 2.3 Logout
Invalidates the refresh token session on the backend immediately.
* **URL**: `/api/auth/logout`
* **Method**: `POST`
* **Headers**: `Authorization: Bearer <accessToken>`
* **Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

* **Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 3. JWT Payload Structure
The minted Access Token payload contains the following claims:
```json
{
  "userId": "c71a3962-d961-4607-b371-bd235cb1017e",
  "role": "barista",
  "app_id": "pos_checkout_app",
  "iat": 1783492000,
  "exp": 1783495600
}
```

---

## 4. Protected Endpoints (Making Requests)
To access protected endpoints (e.g. `POST /api/transactions`), include the access token in the `Authorization` header:

```http
GET /api/admin/transactions HTTP/1.1
Host: localhost:5000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 5. Error Code Map & Handshakes

When an authentication check fails, the API responds with a **401 Unauthorized** status code and a JSON payload containing a specific `code` field to let your Flutter client coordinate automatic token refreshing or re-login flows:

| HTTP Status | JSON Error Code | Description / Action |
|-------------|-----------------|----------------------|
| `401` | `TOKEN_MISSING` | No `Authorization` header was sent. |
| `401` | `TOKEN_EXPIRED` | The access token has expired. **Action**: Automatically call `/api/auth/refresh` to get a new pair. |
| `401` | `TOKEN_INVALID` | Signature verification or payload parsing failed. **Action**: Prompt user to log in again. |
| `401` | `USER_INACTIVE` | The user's account has been deactivated by an admin. **Action**: Log out and display a warning banner. |
| `401` | `REFRESH_TOKEN_EXPIRED` | The refresh token has expired or is revoked. **Action**: Redirect user to Login screen. |
| `401` | `REFRESH_TOKEN_INVALID` | Invalid refresh token signature. **Action**: Redirect user to Login screen. |
| `403` | `FORBIDDEN_ADMIN` | The authenticated user does not have the `admin` role required for this endpoint. |

---

## 6. Token Revocation Rules
Tokens are invalidated server-side in the following events:
1. **Logout**: Calling `POST /api/auth/logout` deletes the active refresh token session from the database.
2. **Password Change**: Changing a user's password immediately revokes **all** active refresh tokens for that user ID, forcing all their active mobile apps to log out.
3. **Account Deactivation**: Setting `isActive: false` on a user account blocks both immediate authentication and refresh token generation.
