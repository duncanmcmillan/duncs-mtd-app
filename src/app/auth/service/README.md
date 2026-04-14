# Auth Service — HMRC OAuth 2.0

This service orchestrates the HMRC OAuth 2.0 Authorization Code flow via the Electron IPC bridge. All network calls are made from the Electron main process; the renderer never touches `client_secret` or raw tokens.

---

## HMRC API Spec

- **Authorization Code flow:** [https://developer.service.hmrc.gov.uk/api-documentation/docs/authorisation/user-restricted-endpoints](https://developer.service.hmrc.gov.uk/api-documentation/docs/authorisation/user-restricted-endpoints)

---

## Endpoints

### 1. Authorization Redirect

| Field       | Value |
|-------------|-------|
| **Method**  | `GET` (browser redirect) |
| **Sandbox** | `https://test-api.service.hmrc.gov.uk/oauth/authorize` |
| **Live**    | `https://api.service.hmrc.gov.uk/oauth/authorize` |
| **API Version** | N/A (OAuth infrastructure endpoint) |

**Query Parameters:**

| Parameter      | Value / Source |
|----------------|----------------|
| `response_type` | `code` (fixed) |
| `client_id`    | Entered by the user in the Auth tab UI (`AuthConfig.clientId`) |
| `scope`        | `read:self-assessment+write:self-assessment` (fixed; see `SCOPES` in `auth.model.ts`) |
| `redirect_uri` | `mtd-app://oauth/callback` (fixed; must be registered in HMRC Developer Hub) |
| `state`        | Random UUID generated per request (`crypto.randomUUID()`) for CSRF protection |

**Response:** The user authenticates in the system browser; HMRC redirects to `mtd-app://oauth/callback?code=<AUTH_CODE>&state=<STATE>`. The Electron shell intercepts this protocol URL and returns `{ code, state }` to the renderer.

---

### 2. Token Exchange

| Field       | Value |
|-------------|-------|
| **Method**  | `POST` |
| **Sandbox** | `https://test-api.service.hmrc.gov.uk/oauth/token` |
| **Live**    | `https://api.service.hmrc.gov.uk/oauth/token` |
| **API Version** | N/A (OAuth infrastructure endpoint) |

**Request Body (form-encoded, sent from Electron main process):**

| Field          | Source |
|----------------|--------|
| `grant_type`   | `authorization_code` (fixed) |
| `code`         | Authorization code returned from step 1 |
| `redirect_uri` | `mtd-app://oauth/callback` (fixed) |
| `client_id`    | Entered by user in Auth tab; stored encrypted in Electron `userData/hmrc-config.enc` |
| `client_secret`| Entered by user in Auth tab; stored encrypted in Electron `userData/hmrc-config.enc`; **never sent to the renderer** |

**Response:**

```json
{
  "access_token": "<BEARER_TOKEN>",
  "refresh_token": "<REFRESH_TOKEN>",
  "expires_in": 14400
}
```

Tokens are stored encrypted on disk (`userData/hmrc-tokens.enc` via `safeStorage`) and hydrated into `AppStore` as `HmrcTokens`:

```typescript
interface HmrcTokens {
  accessToken:  string;  // Bearer token used in Authorization header
  refreshToken: string;  // Used to obtain new access tokens
  expiresAt:    number;  // Unix timestamp (ms) = Date.now() + expires_in * 1000
}
```

---

## Payload Data Sources

| Data | Source |
|------|--------|
| `clientId` / `clientSecret` | Entered manually by the user in the **Auth** tab form; saved to Electron encrypted storage |
| `scope` | Hard-coded constant `SCOPES` in `src/app/auth/model/auth.model.ts` |
| `redirect_uri` | Hard-coded constant `REDIRECT_URI` in `src/app/auth/model/auth.model.ts` |
| `state` | Generated per sign-in call via `crypto.randomUUID()` |

---

## Notes

- The client secret is forwarded once to the Electron main process and stored encrypted. It is **never** exposed in renderer memory after the initial sign-in form submission.
- CSRF protection: the `state` value is compared before token exchange; a mismatch throws `'OAuth state mismatch — possible CSRF attack'`.
- Token refresh is not yet implemented; expired sessions require a full re-authentication.
