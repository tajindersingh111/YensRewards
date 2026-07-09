# Yen's Rewards — API Integration Guide for POS

This document details the backend API endpoints of **Yen's Rewards** loyalty platform and how the **wonkai_pos** Flutter application can authenticate, manage members, and record sales in real-time.

---

## 1. Connection & Authentication Flow

The loyalty platform uses a hybrid authentication scheme:
- **Cookies & Sessions**: Primarily for the web-based Customer and Barista applications.
- **JWT (JSON Web Tokens)**: Perfect for standalone integrations such as the Flutter POS application.

To call any protected API endpoints, the POS must include the JWT access token in the `Authorization` header:
```http
Authorization: Bearer <your_access_token>
```

### Authentication Endpoint
Authenticate a staff member (Barista/Manager/Admin) to obtain tokens.

* **Endpoint**: `POST /api/auth/login`
* **Content-Type**: `application/json`
* **Request Body**:
  ```json
  {
    "email": "barista@yensthai.com",
    "password": "your_password"
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "user": {
      "id": "user-uuid",
      "email": "barista@yensthai.com",
      "firstName": "Somsak",
      "lastName": "Jaidee",
      "role": "barista",
      "isActive": true
    },
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi..."
  }
  ```

* **Refresh Token Endpoint**: `POST /api/auth/refresh`
  When the `accessToken` expires (1 hour lifetime), exchange the `refreshToken` (7 days lifetime) for a new pair of tokens:
  ```json
  {
    "refreshToken": "eyJhbGciOi..."
  }
  ```

---

## 2. Customer & Member Management

### 2.1 Lookup Customer by Phone Number
Find a loyalty program member using their phone number. Useful for retrieving point balances at checkout.

* **Endpoint**: `GET /api/customers/phone/:phone`
* **Headers**: None required (public lookup, sanitized fields)
* **Response (200 OK)**:
  ```json
  {
    "id": "customer-uuid",
    "name": "Thana Siri",
    "phone": "0812345678",
    "points": 185,
    "tier": "silver",
    "referralCode": "REF-THANA",
    "lineLinked": true
  }
  ```
* **Response (404 Not Found)**:
  ```json
  {
    "message": "Customer not found"
  }
  ```

### 2.2 Register a New Customer
Create a new loyalty member profile directly from the POS interface.

* **Endpoint**: `POST /api/customers`
* **Content-Type**: `application/json`
* **Request Body**:
  ```json
  {
    "name": "John Doe",
    "phone": "0898765432",
    "email": "john.doe@example.com",
    "birthday": "1995-08-12",
    "gender": "male"
  }
  ```
* **Response (201 Created)**:
  ```json
  {
    "id": "customer-uuid",
    "name": "John Doe",
    "phone": "0898765432",
    "email": "john.doe@example.com",
    "birthday": "1995-08-12",
    "gender": "male",
    "points": 0,
    "tier": "bronze",
    "referralCode": "REF-ABCD12",
    "createdAt": "2026-07-08T12:00:00.000Z"
  }
  ```
* **Response (409 Conflict)**:
  ```json
  {
    "message": "A customer with this phone number already exists"
  }
  ```

### 2.3 Get Customer Transaction History
Retrieve past transactions for a specific member.

* **Endpoint**: `GET /api/customers/:id/transactions`
* **Headers**: `Authorization: Bearer <token>` (Staff or matching customer only)
* **Response (200 OK)**:
  ```json
  [
    {
      "id": "transaction-uuid",
      "customerId": "customer-uuid",
      "baristaId": "user-uuid",
      "amount": "150.00",
      "points": 15,
      "location": "Main POS",
      "type": "purchase",
      "includedSpecialOffer": false,
      "createdAt": "2026-07-08T06:00:00.000Z"
    }
  ]
  ```

---

## 3. Recording Transactions (Sales & Point Updates)

The POS records sales, awards points, and deducts points using the transaction endpoint. The backend uses a PostgreSQL database transaction to atomically update both the transaction history and the customer's balance.

### 3.1 Award Points for a Sale (Purchase)
Submit a sale amount to award points and increase the member's `totalSpent` accumulator. The tier is automatically upgraded (`bronze` -> `silver` at 500 points, -> `gold` at 1000 points).

* **Endpoint**: `POST /api/transactions`
* **Headers**: `Authorization: Bearer <token>`
* **Content-Type**: `application/json`
* **Request Body**:
  ```json
  {
    "customerId": "customer-uuid",
    "amount": "150.00",
    "points": 15,
    "location": "Siam Paragon Branch",
    "type": "purchase",
    "includedSpecialOffer": false,
    "isNewCustomer": false
  }
  ```
* **Response (201 Created)**:
  ```json
  {
    "transaction": {
      "id": "transaction-uuid",
      "customerId": "customer-uuid",
      "baristaId": "authenticated-staff-uuid",
      "amount": "150.00",
      "points": 15,
      "location": "Siam Paragon Branch",
      "type": "purchase",
      "includedSpecialOffer": false,
      "isNewCustomer": false,
      "createdAt": "2026-07-08T06:55:00.000Z"
    },
    "customer": {
      "id": "customer-uuid",
      "name": "John Doe",
      "phone": "0898765432",
      "points": 15,
      "tier": "bronze",
      "totalSpent": "150.00"
    }
  }
  ```

> [!NOTE]
> **Daily Treasury Cap**: A safety limit prevents abuse. A single customer can submit a maximum of **3 receipts** or earn **500 points** in a rolling 24-hour window for `purchase` type transactions. If exceeded, the API returns `429 Too Many Requests`.

### 3.2 Deduct Points (Redemptions at POS)
POS systems can deduct points for rewards redeemed at the counter.

* **Endpoint**: `POST /api/transactions`
* **Headers**: `Authorization: Bearer <token>`
* **Request Body**:
  ```json
  {
    "customerId": "customer-uuid",
    "amount": "0.00",
    "points": -100,
    "location": "Siam Paragon Branch",
    "type": "redemption"
  }
  ```
* **Response (201 Created)**:
  ```json
  {
    "transaction": { ... },
    "customer": {
      "id": "customer-uuid",
      "points": 50 // Balance updated atomically
    }
  }
  ```

---

## 4. Aggregate Sales Syncing (Optional)

If the POS needs to post daily total sales reports for management dashboard analytics:

* **Endpoint**: `POST /api/admin/sales`
* **Headers**: `Authorization: Bearer <token>` (Admin only)
* **Request Body**:
  ```json
  {
    "date": "2026-07-08",
    "orderChannel": "POS", // POS, Grab, Foodpanda, LINE MAN, Robinhood
    "netSales": "4500.00",
    "otherSales": "200.00",
    "otherSalesNote": "Catering order",
    "grabFee": "0.00"
  }
  ```

---

## 5. Flutter Dart Integration Example

Here is a template code snippet to connect the **wonkai_pos** Flutter app:

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class LoyaltyApiService {
  final String baseUrl;
  String? _accessToken;

  LoyaltyApiService({required this.baseUrl});

  // 1. Authenticate POS
  Future<bool> login(String email, String password) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      _accessToken = data['accessToken'];
      return true;
    }
    return false;
  }

  // 2. Lookup customer by phone
  Future<Map<String, dynamic>?> lookupCustomer(String phone) async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/customers/phone/$phone'),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    return null; // Not found or error
  }

  // 3. Register customer
  Future<Map<String, dynamic>?> registerCustomer({
    required String name,
    required String phone,
    String? email,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/customers'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'name': name,
        'phone': phone,
        if (email != null) 'email': email,
      }),
    );

    if (response.statusCode == 201) {
      return jsonDecode(response.body);
    }
    return null;
  }

  // 4. Post a sale transaction
  Future<Map<String, dynamic>?> recordSale({
    required String customerId,
    required double amount,
    required int points,
    required String branch,
    bool isNewCustomer = false,
  }) async {
    if (_accessToken == null) throw Exception("Unauthorized: Please log in first.");

    final response = await http.post(
      Uri.parse('$baseUrl/api/transactions'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $_accessToken',
      },
      body: jsonEncode({
        'customerId': customerId,
        'amount': amount.toStringAsFixed(2),
        'points': points,
        'location': branch,
        'type': 'purchase',
        'isNewCustomer': isNewCustomer,
      }),
    );

    if (response.statusCode == 201) {
      return jsonDecode(response.body);
    } else {
      final errorMsg = jsonDecode(response.body)['message'] ?? 'Failed to submit transaction';
      throw Exception(errorMsg);
    }
  }
}
```
