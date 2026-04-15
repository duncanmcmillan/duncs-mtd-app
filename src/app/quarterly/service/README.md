# Quarterly Update Service — API Reference

## HMRC API Specs

### Self Employment Business API
- https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/self-employment-business-api

### Property Business API
- https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/property-business-api

---

## Endpoint 1 — Self Employment Periodic Summary (Create)

| Field        | Value |
|--------------|-------|
| Method       | `POST` |
| Sandbox URL  | `https://test-api.service.hmrc.gov.uk/individuals/self-employment/income-summary/{nino}/{taxYear}/{businessId}` |
| Live URL     | `https://api.service.hmrc.gov.uk/individuals/self-employment/income-summary/{nino}/{taxYear}/{businessId}` |
| API Version  | `3.0` |

### Request

**Path parameters:**

| Parameter    | Type   | Source |
|--------------|--------|--------|
| `nino`       | string | `AppStore.nino()` |
| `taxYear`    | string | Derived from obligation period start date via `taxYearFromPeriodStart()` |
| `businessId` | string | `ObligationRow.businessId` / `BusinessSourceItem.businessId` |

**Request body:**

```json
{
  "periodDates": {
    "periodStartDate": "2024-04-06",
    "periodEndDate": "2024-07-05"
  },
  "periodIncome": {
    "turnover": 18450.00,
    "other": 0.00
  },
  "periodExpenses": {
    "costOfGoods": null,
    "paymentsToSubcontractors": null,
    "wagesAndStaffCosts": null,
    "carVanTravelExpenses": null,
    "premisesRunningCosts": null,
    "maintenanceCosts": null,
    "adminCosts": null,
    "businessEntertainmentCosts": null,
    "advertisingCosts": null,
    "interestOnBankOtherLoans": null,
    "financeCharges": null,
    "irrecoverableDebts": null,
    "professionalFees": null,
    "depreciation": null,
    "otherExpenses": null,
    "consolidatedExpenses": 7230.50
  },
  "periodDisallowableExpenses": {
    "costOfGoodsDisallowable": null
  }
}
```

> `null` fields are omitted from the actual request (see `omitNulls()`). Either use `consolidatedExpenses` OR the individual expense fields — not both.

### Response

```typescript
interface SelfEmploymentSubmitResponse {
  submissionId: string; // e.g. "4557ecb5-fd32-48cc-81f5-e328f00d9823"
}
```

---

## Endpoint 2 — UK Property Periodic Summary (Create)

| Field        | Value |
|--------------|-------|
| Method       | `POST` |
| Sandbox URL  | `https://test-api.service.hmrc.gov.uk/individuals/business/property/uk/{nino}/{taxYear}/{businessId}/period` |
| Live URL     | `https://api.service.hmrc.gov.uk/individuals/business/property/uk/{nino}/{taxYear}/{businessId}/period` |
| API Version  | `4.0` |

### Request

**Path parameters:**

| Parameter    | Type   | Source |
|--------------|--------|--------|
| `nino`       | string | `AppStore.nino()` |
| `taxYear`    | string | Derived from obligation period start date via `taxYearFromPeriodStart()` |
| `businessId` | string | `ObligationRow.businessId` / `BusinessSourceItem.businessId` |

**Request body:**

```json
{
  "fromDate": "2024-04-06",
  "toDate": "2024-07-05",
  "income": {
    "rentIncome": {
      "amount": 5000.00,
      "taxDeducted": 0.00
    },
    "premiumsOfLeaseGrant": null,
    "reversePremiums": null,
    "otherIncome": null
  },
  "expenses": {
    "premisesRunningCosts": null,
    "repairsAndMaintenance": null,
    "financialCosts": null,
    "professionalFees": null,
    "costOfServices": null,
    "travelCosts": null,
    "residentialFinancialCost": null,
    "broughtFwdResidentialFinancialCost": null,
    "other": null,
    "consolidatedExpenses": 1200.00
  }
}
```

### Response

```typescript
interface UkPropertySubmitResponse {
  submissionId: string;
}
```

---

## Draft Persistence

Drafts are stored in `localStorage` under keys prefixed `quarterly_draft_`. This is a temporary measure for testing; a future iteration will persist drafts via Electron IPC to an encrypted file.

---

## Payload Data Sources

| Request field        | Source |
|----------------------|--------|
| `nino`               | `AppStore.nino()` |
| `taxYear`            | Derived via `taxYearFromPeriodStart(periodStartDate)` |
| `businessId`         | `ObligationsStore.obligationRows()[n].businessId` |
| `periodStartDate`    | `ObligationsStore.obligationRows()[n].periodStartDate` |
| `periodEndDate`      | `ObligationsStore.obligationRows()[n].periodEndDate` |
| `accessToken`        | `AppStore.accessToken()` |
| Income/expense values | Manual entry by the user in `QuarterlyComponent` |
