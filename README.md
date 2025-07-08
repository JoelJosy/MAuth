# MAuth - Magic Link Authentication Service 🔐

A secure, passwordless authentication service that provides magic link authentication for your applications. Simple integration, enterprise-grade security.

## 🚀 Quick Start

### 1. Register Your Application

First, register your application to get API credentials:

```bash
POST /api/client/register
Content-Type: application/json

{
  "name": "My Awesome App",
  "redirectUrl": "https://myapp.com/auth/callback"
}
```

**Response:**

```json
{
  "message": "Client registered successfully",
  "client": {
    "id": "507f1f77bcf86cd799439011",
    "name": "My Awesome App",
    "apiKey": "mauth_live_sk_1234567890abcdef",
    "kid": "key_abc123",
    "publicKey": "-----BEGIN PUBLIC KEY-----\n...",
    "redirectUrl": "https://myapp.com/auth/callback"
  }
}
```

⚠️ **Save your `apiKey` and `id` securely - you'll need them for all API calls.**

### 2. Implement Authentication Flow

#### Step 1: Request Magic Link

When a user wants to sign in, send their email to get a magic link:

```bash
POST /api/auth/magic-link/request
Content-Type: application/json

{
  "email": "user@example.com",
  "id": "507f1f77bcf86cd799439011"
}
```

**Response:**

```json
{
  "message": "Check your inbox for the magic link"
}
```

The user will receive an email with a secure magic link that expires in 10 minutes.

#### Step 2: Verify Magic Link

When the user clicks the magic link, they'll be redirected to:

```
GET /api/auth/magic-link/verify?token=abc123...
```

This automatically sets HTTP-only cookies with JWT tokens and returns:

```json
{
  "message": "Magic link verified successfully, tokens set in cookies"
}
```

#### Step 3: Verify JWT Tokens (Client-Side)

After receiving tokens, verify them locally using the public key you received during registration. This is more efficient and secure than making API calls for every verification.

## 🔧 Complete Integration Examples

### Frontend (JavaScript/React)

```javascript
class MAuthClient {
  constructor(clientId, baseUrl = "https://your-mauth-api.com/api") {
    this.clientId = clientId;
    this.baseUrl = baseUrl;
  }

  // Send magic link to user's email
  async requestMagicLink(email) {
    const response = await fetch(`${this.baseUrl}/auth/magic-link/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, id: this.clientId }),
      credentials: "include", // Important for cookies
    });

    return response.json();
  }

  // Check if user is authenticated (using local JWT verification)
  verifyTokenLocally(token, publicKey) {
    try {
      // Use a JWT library like 'jsonwebtoken' to verify locally
      const payload = jwt.verify(token, publicKey, { algorithms: ["RS256"] });
      return { valid: true, payload };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  // Refresh expired tokens (typically called automatically by your auth middleware)
  async refreshTokens() {
    const response = await fetch(`${this.baseUrl}/auth/refresh-token`, {
      method: "POST",
      credentials: "include",
    });

    return response.json();
  }

  // Sign out user
  async signOut() {
    const response = await fetch(`${this.baseUrl}/auth/revoke-token`, {
      method: "POST",
      credentials: "include",
    });

    return response.json();
  }
}

// Usage
const auth = new MAuthClient("your-client-id");

// Sign in flow
async function signIn(email) {
  try {
    await auth.requestMagicLink(email);
    alert("Check your email for the magic link!");
  } catch (error) {
    console.error("Sign in failed:", error);
  }
}

// Check auth status (local verification)
async function checkAuth() {
  try {
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("accessToken="))
      ?.split("=")[1];

    if (!token) {
      console.log("No token found");
      return null;
    }

    // Verify locally using the public key from registration
    const result = auth.verifyTokenLocally(token, YOUR_PUBLIC_KEY);
    if (result.valid) {
      console.log("User is signed in:", result.payload);
      return result.payload;
    } else {
      console.log("Invalid token");
      return null;
    }
  } catch (error) {
    console.log("Token verification failed:", error);
    return null;
  }
}
```

### Backend (Node.js/Express)

```javascript
import jwt from "jsonwebtoken";

// Middleware to verify MAuth tokens (local verification)
const verifyMAuthToken = async (req, res, next) => {
  try {
    // Get token from Authorization header or cookies
    const token =
      req.headers.authorization?.split(" ")[1] || req.cookies?.accessToken;

    if (!token) {
      return res.status(401).json({ error: "Access token required" });
    }

    // Verify locally using your stored public key
    const payload = jwt.verify(token, YOUR_PUBLIC_KEY, {
      algorithms: ["RS256"],
    });

    req.userId = payload.userId;
    req.clientId = payload.clientId;
    req.authPayload = payload;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

// Protected route example
app.get("/api/protected", verifyMAuthToken, (req, res) => {
  res.json({
    message: "This is protected!",
    userId: req.userId,
    clientId: req.clientId,
  });
});
```

## 🛡️ Security Features

- **Passwordless Authentication** - No passwords to leak or forget
- **Time-Limited Magic Links** - Links expire in 10 minutes
- **One-Time Use Tokens** - Each magic link can only be used once
- **Rate Limiting** - Built-in protection against abuse
- **JWT Tokens** - Industry-standard authentication tokens
- **HTTP-Only Cookies** - XSS protection for web applications
- **Refresh Token Rotation** - Enhanced security for long-lived sessions

## 📡 API Reference

### Authentication Endpoints

| Endpoint                   | Method | Description               | Rate Limit                |
| -------------------------- | ------ | ------------------------- | ------------------------- |
| `/auth/magic-link/request` | POST   | Send magic link to email  | 5/email/5min + 15/IP/5min |
| `/auth/magic-link/verify`  | GET    | Verify magic link token   | 10/min/IP                 |
| `/auth/refresh-token`      | POST   | Refresh expired tokens    | 10/min/IP                 |
| `/auth/revoke-token`       | POST   | Sign out (revoke tokens)  | 10/min/IP                 |
| `/auth/revoke-all-tokens`  | POST   | Sign out from all devices | 5/email/5min + 10/IP/5min |

### Client Management Endpoints

| Endpoint                  | Method | Description              | Auth Required |
| ------------------------- | ------ | ------------------------ | ------------- |
| `/client/register`        | POST   | Register new application | No            |
| `/client/info`            | GET    | Get client information   | API Key       |
| `/client/:id/rotate-keys` | POST   | Rotate signing keys      | API Key       |

### Request/Response Examples

#### Magic Link Request

```bash
POST /api/auth/magic-link/request
Content-Type: application/json

{
  "email": "user@example.com",
  "id": "your-client-id"
}
```

#### Token Verification (Local)

```javascript
// Verify JWT locally using the public key from registration
import jwt from "jsonwebtoken";

const payload = jwt.verify(token, publicKey, { algorithms: ["RS256"] });
console.log("Token payload:", payload);
```

## 🔧 Client Management

### Get Client Information

```bash
GET /api/client/info
X-API-Key: mauth_live_sk_1234567890abcdef
```

### Rotate Signing Keys

```bash
POST /api/client/{clientId}/rotate-keys
X-API-Key: mauth_live_sk_1234567890abcdef
```

## ⚠️ Important Notes

### Rate Limiting

- Magic link requests: **5 per email per 5 minutes** + **15 per IP per 5 minutes**
- Most endpoints: **10-30 requests per minute per IP**
- Rate limit headers included in responses

### Token Lifetimes

- **Access tokens**: 15 minutes
- **Refresh tokens**: 7 days
- **Magic links**: 10 minutes

### Automatic Token Refresh

The `/auth/refresh-token` endpoint is designed to be called automatically by your client-side authentication code when access tokens expire. You typically don't need to call this manually - implement automatic refresh logic in your auth middleware for the best user experience.

### CORS Configuration

Make sure your frontend domain is allowed in the MAuth service CORS settings.

### Cookie Settings

For production, ensure your domain supports:

- `SameSite=None` for cross-origin requests
- `Secure=true` for HTTPS only
- `HttpOnly=true` for XSS protection

## 🚦 Error Handling

Common error responses:

```json
// Rate limit exceeded
{
  "error": "Too many requests. Please try again later.",
  "retryAfter": 300
}

// Invalid token
{
  "error": "Invalid or expired token"
}

// Missing required fields
{
  "error": "Email and app ID are required"
}
```

---
