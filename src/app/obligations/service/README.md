# Obligations Service — HMRC MTD Obligations API

Fetches income-and-expenditure reporting obligations (quarterly periods and End of Period Statements) for a taxpayer.

---

## HMRC API Spec

- **API:** Obligations (MTD)
- **Version:** 3.0
- **Reference:** [https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/obligations-api/3.0](https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/obligations-api/3.0)

---

## Endpoint

| Field       | Value |
|-------------|-------|
| **Method**  | `GET` |
| **Sandbox** | `https://test-api.service.hmrc.gov.uk/obligations/details/{nino}/income-and-expenditure` |
| **Live**    | `https://api.service.hmrc.gov.uk/obligations/details/{nino}/income-and-expenditure` |
| **API Version** | `3.0` (sent as `Accept: application/vnd.hmrc.3.0+json`) |

---

## Request

### Path Parameters

| Parameter | Type   | Source | Description |
|-----------|--------|--------|-------------|
| `nino`    | string | `AppStore.nino()` signal — populated from OAuth token claims after sign-in on the **Auth** tab | UK National Insurance number, e.g. `AB123456C` |

### Query Parameters

| Parameter        | Required | Default | Source | Description |
|------------------|----------|---------|--------|-------------|
| `fromDate`       | Yes      | 6 April two tax years ago (`currentTaxYearStart()`) | `ObligationsStore` / caller | ISO date `YYYY-MM-DD`; start of query window |
| `toDate`         | Yes      | 5 April of most recently completed tax year (`previousTaxYearEnd()`) | `ObligationsStore` / caller | ISO date `YYYY-MM-DD`; end of query window (max 366 days after `fromDate`) |
| `typeOfBusiness` | Yes      | First business type from `BusinessSourcesStore` (defaults to `'self-employment'`) | `BusinessSourcesStore.businesses()` | Income source type, e.g. `'self-employment'`, `'uk-property'` |
| `businessId`     | No       | First business ID from `BusinessSourcesStore` | `BusinessSourcesStore.businesses()` | HMRC income source ID — narrows results to a single source |

### Headers (added automatically by `HmrcApiService`)

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <accessToken>` — from `AppStore.tokens().accessToken` |
| `Accept` | `application/vnd.hmrc.3.0+json` |
| Fraud prevention headers | Added by `FraudPreventionService` (see core services) |

### Request Body

None — `GET` request.

---

## Response

```typescript
interface ObligationsResponse {
  obligations: ObligationGroup[];
}

interface ObligationGroup {
  typeOfBusiness?: string;       // Income source type (may be absent for EOPS)
  businessId?:     string;       // HMRC income source ID
  obligationDetails: Obligation[];
}

interface Obligation {
  periodStartDate: string;           // ISO date, e.g. '2024-04-06'
  periodEndDate:   string;           // ISO date, e.g. '2024-07-05'
  dueDate:         string;           // ISO date; submission deadline
  status:          'open' | 'fulfilled';
  receivedDate?:   string;           // ISO date; present only when status is 'fulfilled'
}
```

**Example:**

```json
{
  "obligations": [
    {
      "typeOfBusiness": "self-employment",
      "businessId": "XAIS12345678901",
      "obligationDetails": [
        {
          "periodStartDate": "2024-04-06",
          "periodEndDate":   "2024-07-05",
          "dueDate":         "2024-08-05",
          "status":          "fulfilled",
          "receivedDate":    "2024-07-20"
        },
        {
          "periodStartDate": "2024-07-06",
          "periodEndDate":   "2024-10-05",
          "dueDate":         "2024-11-05",
          "status":          "open"
        }
      ]
    }
  ]
}
```

---

## Payload Data Sources

| Data | Source |
|------|--------|
| `nino` | `AppStore.nino()` — extracted from OAuth token after sign-in on the **Auth** tab |
| `accessToken` | `AppStore.tokens().accessToken` — stored in Electron encrypted storage |
| `environment` (base URL) | `AppStore.environment()` — set by user on the Auth tab (`sandbox` \| `live`) |
| `typeOfBusiness` | `BusinessSourcesStore.businesses()[0].typeOfBusiness` — populated by the **Business Sources** API call |
| `businessId` | `BusinessSourcesStore.businesses()[0].businessId` — populated by the **Business Sources** API call |
| `fromDate` | Computed by `currentTaxYearStart()`: 6 April two tax years before today |
| `toDate` | Computed by `previousTaxYearEnd()`: 5 April of most recently completed tax year |

---

## Date Range Logic

The service provides a default ~1-year window that covers both the current and prior tax year obligations:

- **`fromDate`**: 6 April of the previous (most recently completed) tax year (e.g. in tax year 2025–26, this is `2024-04-06`)
- **`toDate`**: 5 April of the most recently *completed* tax year (e.g. in tax year 2025–26, this is `2025-04-05`)

This keeps the window within HMRC's 366-day limit while ensuring prior-year sandbox test data is visible.
