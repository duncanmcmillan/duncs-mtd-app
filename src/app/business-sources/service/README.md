# Business Sources Service — HMRC Business Details API

Fetches the list of business income sources registered for a taxpayer in HMRC's MTD system.

---

## HMRC API Spec

- **API:** Business Details (MTD)
- **Version:** 2.0
- **Reference:** [https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/business-details-api/2.0](https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/business-details-api/2.0)

---

## Endpoint

| Field       | Value |
|-------------|-------|
| **Method**  | `GET` |
| **Sandbox** | `https://test-api.service.hmrc.gov.uk/individuals/business/details/{nino}/list` |
| **Live**    | `https://api.service.hmrc.gov.uk/individuals/business/details/{nino}/list` |
| **API Version** | `2.0` (sent as `Accept: application/vnd.hmrc.2.0+json`) |

---

## Request

### Path Parameters

| Parameter | Type   | Source | Description |
|-----------|--------|--------|-------------|
| `nino`    | string | `AppStore.nino()` signal — populated from OAuth token claims after successful sign-in on the **Auth** tab | UK National Insurance number, e.g. `AB123456C` |

### Headers (added automatically by `HmrcApiService`)

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <accessToken>` — from `AppStore.tokens().accessToken` |
| `Accept` | `application/vnd.hmrc.2.0+json` |
| Fraud prevention headers | Added by `FraudPreventionService` (see core services) |

### Request Body

None — `GET` request.

---

## Response

```typescript
interface BusinessSourcesResponse {
  listOfBusinesses: BusinessSourceItem[];
}

interface BusinessSourceItem {
  businessId:     string;       // HMRC-assigned unique income source ID
  typeOfBusiness: 'self-employment' | 'uk-property' | 'foreign-property' | 'property-unspecified';
  tradingName?:   string;       // Present for self-employment sources only
}
```

**Example:**

```json
{
  "listOfBusinesses": [
    {
      "businessId": "XAIS12345678901",
      "typeOfBusiness": "self-employment",
      "tradingName": "Joe's Plumbing"
    },
    {
      "businessId": "XPIS00000000001",
      "typeOfBusiness": "uk-property"
    }
  ]
}
```

---

## Payload Data Sources

| Data | Source |
|------|--------|
| `nino` | `AppStore.nino()` — extracted from the OAuth token response after the user signs in on the **Auth** tab |
| `accessToken` | `AppStore.tokens().accessToken` — stored in Electron encrypted storage, loaded on session restore |
| `environment` (base URL) | `AppStore.environment()` — set by the user in the Auth tab (`sandbox` \| `live`) |
