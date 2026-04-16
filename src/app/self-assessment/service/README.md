# Self Assessment Service — HMRC Individual Calculations API

Triggers, retrieves, and crystallises Self Assessment tax calculations for a taxpayer.

---

## HMRC API Spec

- **API:** Individual Calculations (MTD)
- **Version:** 8.0
- **Reference:** [https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/individual-calculations-api/8.0](https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/individual-calculations-api/8.0)

---

## Endpoints

### 1. Trigger Calculation

| Field       | Value |
|-------------|-------|
| **Method**  | `POST` |
| **Sandbox** | `https://test-api.service.hmrc.gov.uk/individuals/calculations/{nino}/self-assessment/{taxYear}/trigger/{calculationType}` |
| **Live**    | `https://api.service.hmrc.gov.uk/individuals/calculations/{nino}/self-assessment/{taxYear}/trigger/{calculationType}` |
| **API Version** | `8.0` (sent as `Accept: application/vnd.hmrc.8.0+json`) |

#### Path Parameters

| Parameter        | Type   | Source | Description |
|------------------|--------|--------|-------------|
| `nino`           | string | `AppStore.nino()` | UK National Insurance number |
| `taxYear`        | string | Quarterly draft `taxYear` field (in-year) or hardcoded `'2024-25'` (end-of-year) | Format `YYYY-YY`, e.g. `2024-25` |
| `calculationType` | string | Call site | `in-year` for quarterly estimate; `intent-to-finalise` for end-of-year SA |

#### Request Body

Empty JSON object: `{}`.

#### Response

```typescript
interface TriggerCalculationResponse {
  calculationId: string;  // UUID — used in all subsequent calls
}
```

> **Note:** The HMRC calculation process is asynchronous. In production, wait at least 5 seconds before calling the retrieve endpoint. The sandbox typically responds synchronously.

---

### 2. Retrieve Calculation

| Field       | Value |
|-------------|-------|
| **Method**  | `GET` |
| **Sandbox** | `https://test-api.service.hmrc.gov.uk/individuals/calculations/{nino}/self-assessment/{taxYear}/{calculationId}` |
| **Live**    | `https://api.service.hmrc.gov.uk/individuals/calculations/{nino}/self-assessment/{taxYear}/{calculationId}` |
| **API Version** | `8.0` |

#### Response (mapped to `TaxCalculationSummary`)

```typescript
// Raw response structure (key paths used by the mapper)
{
  metadata: {
    calculationId: string;           // → TaxCalculationSummary.calculationId
    taxYear: string;                 // → TaxCalculationSummary.taxYear
    calculationTimestamp: string;    // → TaxCalculationSummary.calculationTimestamp (ISO 8601)
    finalDeclaration: boolean;       // → TaxCalculationSummary.crystallised
  },
  calculation: {
    taxCalculation: {
      incomeTax: {
        totalIncomeReceivedFromAllSources: number; // → totalIncomeReceived
        personalAllowance: number;                 // → personalAllowance
        totalAllowancesAndDeductions: number;      // → totalAllowancesAndDeductions
        totalTaxableIncome: number;                // → totalTaxableIncome
        incomeTax: { totalAmount: number };        // → incomeTaxDue
      },
      nics: {
        class2Nics: { amount: number };            // → totalNic (class2 + class4)
        class4Nics: { totalAmount: number };       // → totalNic (class2 + class4)
      },
      totalIncomeTaxAndNicsDue: number;            // → totalTaxDue
    },
    businessProfitAndLoss: [                       // per-source income breakdown
      {
        typeOfBusiness: 'self-employment';         // → selfEmploymentIncome
        totalBusinessIncomeTaxableProfit: number;
      },
      {
        typeOfBusiness: 'uk-property' | 'uk-property-fhl'; // → ukPropertyIncome (summed)
        totalBusinessIncomeTaxableProfit: number;
      },
      {
        typeOfBusiness: 'foreign-property' | 'foreign-property-fhl-eea'; // → foreignPropertyIncome (summed)
        totalBusinessIncomeTaxableProfit: number;
      }
    ]
  }
}
```

---

### 3. Submit Final Declaration (Crystallise)

| Field       | Value |
|-------------|-------|
| **Method**  | `POST` |
| **Sandbox** | `https://test-api.service.hmrc.gov.uk/individuals/calculations/{nino}/self-assessment/{taxYear}/{calculationId}/final-declaration` |
| **Live**    | `https://api.service.hmrc.gov.uk/individuals/calculations/{nino}/self-assessment/{taxYear}/{calculationId}/final-declaration` |
| **API Version** | `8.0` |

#### Request Body

Empty JSON object: `{}`.

#### Response

`204 No Content` — no response body.

---

## Headers (added automatically by `HmrcApiService`)

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <accessToken>` — from `AppStore.tokens().accessToken` |
| `Accept` | `application/vnd.hmrc.8.0+json` |
| Fraud prevention headers | Added by `FraudPreventionService` (see core services) |

---

## Payload Data Sources

| Data | Source |
|------|--------|
| `nino` | `AppStore.nino()` — extracted from OAuth token after sign-in |
| `accessToken` | `AppStore.tokens().accessToken` — stored in Electron encrypted storage |
| `environment` (base URL) | `AppStore.environment()` — set by user on the Auth tab (`sandbox` \| `live`) |
| `taxYear` (in-year trigger) | `QuarterlyDraft.taxYear` — derived from submitted quarterly draft's period start date |
| `taxYear` (end-of-year trigger) | Hardcoded `'2024-25'` — TODO: derive from AppStore or user selection |
| `calculationType` | `'in-year'` for quarterly estimate; `'intent-to-finalise'` for end-of-year |
| `calculationId` | Returned by the trigger endpoint and stored in `SelfAssessmentStore.calculation().calculationId` |

---

## Workflow

```
[Quarterly tab] Submit Q1–Q4 drafts
        │
        ▼
[Quarterly tab] "View In-year Tax Calculation"
        │  triggers in-year calc → retrieves result
        ▼
[Self Assessment tab] Review income / tax summary  ← SelfAssessmentStore.status = 'ready'
        │
        ▼
[Self Assessment tab] "Trigger Tax Calculation"  (end-of-year, intent-to-finalise)
        │  triggers calc → retrieves result
        ▼
[Self Assessment tab] Review final figures
        │
        ▼
[Self Assessment tab] "Submit Final Declaration"
        │  POST .../final-declaration → metadata.finalDeclaration = true
        ▼
SelfAssessmentStore.status = 'crystallised'
```
