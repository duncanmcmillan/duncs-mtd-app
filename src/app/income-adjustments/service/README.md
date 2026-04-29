# Income & Adjustments Service

Handles three HMRC MTD APIs: annual allowances (SE), BSAS accounting adjustments, and dividend income declarations.

---

## HMRC API Specs

| API | Version | Reference |
|-----|---------|-----------|
| Self Employment Business (MTD) | 5.0 (Beta) | https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/self-employment-business-api/5.0 |
| Business Source Adjustable Summary (BSAS MTD) | 7.0 (Beta) | https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/self-assessment-bsas-api/7.0 |
| Individuals Dividends Income (MTD) | 2.0 (Beta) | https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/individuals-dividends-income-api/2.0 |

---

## Endpoints

### 1. Submit SE Annual Allowances (Scenario 3, Step 16)

| Field | Value |
|-------|-------|
| **Method** | `PUT` |
| **Sandbox** | `https://test-api.service.hmrc.gov.uk/individuals/business/self-employment/{nino}/{businessId}/annual/{taxYear}` |
| **Live** | `https://api.service.hmrc.gov.uk/individuals/business/self-employment/{nino}/{businessId}/annual/{taxYear}` |
| **API Version** | `5.0` |
| **Response** | `204 No Content` |

#### Path Parameters

| Parameter | Source |
|-----------|--------|
| `nino` | `AppStore.nino()` |
| `businessId` | `AllowanceEntry.businessId` |
| `taxYear` | `AllowanceEntry.taxYear` (format `YYYY-YY`) |

#### Request Body

```json
{
  "allowances": {
    "annualInvestmentAllowance": 50000,
    "capitalAllowanceMainPool": 12500,
    "capitalAllowanceSpecialRatePool": 3200,
    "capitalAllowanceSingleAssetPool": 0,
    "businessPremisesRenovationAllowance": 5000,
    "enhancedCapitalAllowance": 0,
    "allowanceOnSales": 0,
    "zeroEmissionsCarAllowance": 8000,
    "tradingIncomeAllowance": 0
  }
}
```

Only fields with non-`undefined` values are included. `tradingIncomeAllowance` is mutually exclusive with all other allowance fields (HMRC validation).

---

### 2. Trigger BSAS (Scenario 4, Step 22)

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **Sandbox** | `https://test-api.service.hmrc.gov.uk/individuals/self-assessment/adjustable-summary/{nino}/trigger` |
| **Live** | `https://api.service.hmrc.gov.uk/individuals/self-assessment/adjustable-summary/{nino}/trigger` |
| **API Version** | `7.0` |
| **Response** | `200 OK` — `{ "calculationId": "uuid" }` |

#### Request Body

```json
{
  "accountingPeriod": {
    "startDate": "2024-04-06",
    "endDate":   "2025-04-05"
  },
  "typeOfBusiness": "self-employment",
  "businessId": "XKIS00000000988"
}
```

`startDate` and `endDate` are derived from `AdjustmentEntry.taxYear` (e.g. `'2024-25'` → `'2024-04-06'` / `'2025-04-05'`).

---

### 3. Submit SE BSAS Accounting Adjustments (Scenario 4, Step 24)

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **Sandbox** | `https://test-api.service.hmrc.gov.uk/individuals/self-assessment/adjustable-summary/{nino}/self-employment/{calculationId}/adjust/{taxYear}` |
| **Live** | `https://api.service.hmrc.gov.uk/individuals/self-assessment/adjustable-summary/{nino}/self-employment/{calculationId}/adjust/{taxYear}` |
| **API Version** | `7.0` |
| **Response** | `200 OK` (no body) |

#### Path Parameters

| Parameter | Source |
|-----------|--------|
| `nino` | `AppStore.nino()` |
| `calculationId` | Returned by Step 22 trigger; stored in `AdjustmentEntry.calculationId` |
| `taxYear` | `AdjustmentEntry.taxYear` |

#### Request Body

```json
{
  "income": {
    "turnover": 500,
    "other": 200
  },
  "expenses": {
    "costOfGoods": -150,
    "wagesAndStaffCosts": 300,
    "professionalFees": -75
  },
  "additions": {
    "costOfGoodsDisallowable": 100
  }
}
```

Only the top-level objects (`income`, `expenses`, `additions`) that contain at least one field are included. All values can be negative. The service maps the flat `AdjustmentEntry` fields to the nested BSAS body.

---

### 4. Submit UK Dividends (Scenario 5, Step 29 — part A)

| Field | Value |
|-------|-------|
| **Method** | `PUT` |
| **Sandbox** | `https://test-api.service.hmrc.gov.uk/individuals/dividends-income/uk/{nino}/{taxYear}` |
| **Live** | `https://api.service.hmrc.gov.uk/individuals/dividends-income/uk/{nino}/{taxYear}` |
| **API Version** | `2.0` |
| **Response** | `200 OK` |

#### Request Body

```json
{
  "ukDividends": 2500,
  "otherUkDividends": 800
}
```

Only fields with non-`undefined` values are included. At least one must be present (HMRC validation).

---

### 5. Submit Foreign Dividends (Scenario 5, Step 29 — part B)

| Field | Value |
|-------|-------|
| **Method** | `PUT` |
| **Sandbox** | `https://test-api.service.hmrc.gov.uk/individuals/dividends-income/{nino}/{taxYear}` |
| **Live** | `https://api.service.hmrc.gov.uk/individuals/dividends-income/{nino}/{taxYear}` |
| **API Version** | `2.0` |
| **Response** | `200 OK` |

#### Request Body

```json
{
  "foreignDividend": [
    {
      "countryCode": "DEU",
      "amountBeforeTax": 300,
      "taxableAmount": 255,
      "taxTakenOff": 45,
      "foreignTaxCreditRelief": false
    }
  ]
}
```

`countryCode` must be ISO 3166-1 Alpha-3 (3 letters). `taxableAmount` is required by the API; defaults to `amount` when `ForeignDividend.taxableAmount` is not set.

---

## Payload Data Sources

| Data | Source |
|------|--------|
| `nino` | `AppStore.nino()` |
| `accessToken` | `AppStore.tokens().accessToken` |
| `businessId` | `AllowanceEntry.businessId` / `AdjustmentEntry.businessId` |
| `taxYear` | `AllowanceEntry.taxYear` / `AdjustmentEntry.taxYear` / `DividendEntry.taxYear` |
| `calculationId` | Returned by BSAS trigger (Step 22); persisted in `AdjustmentEntry.calculationId` |
| Allowance figures | `IncomeAdjustmentsStore.allowances()` — edited via `AllowancesModalComponent` |
| Adjustment figures | `IncomeAdjustmentsStore.adjustments()` — edited via `AdjustmentsModalComponent` |
| Dividend figures | `IncomeAdjustmentsStore.dividends()` — edited via `DividendsModalComponent` |

---

## Notes

- Only `self-employment` is supported for allowances (Scenario 3) and BSAS adjustments (Scenario 4). UK Property and Foreign Property APIs are a future implementation step.
- The BSAS trigger is automatically called by `IncomeAdjustmentsStore.submitAdjustments()` when `AdjustmentEntry.calculationId` is not already set. The returned ID is stored back into the entry.
- Dividends submission calls both endpoints (UK + foreign) in sequence when the relevant fields are populated.
