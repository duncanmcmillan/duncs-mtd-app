# Sandbox E2E Test Scenarios

Manual E2E test scenarios for the packaged Electron app against the HMRC sandbox
environment. Run all scenarios after every `npm run make` / packaging cycle.

Video recordings: <!-- add links here after recording -->

---

## Prerequisites

- Packaged app at `~/apps/AI/claude/projects/MTD-packages/duncs-mtd-app.app`
- HMRC sandbox credentials configured in Settings modal
- Sandbox test user with SE, UK Property, and Foreign Property businesses registered
- At least one open and one fulfilled obligation per business type in sandbox

---

## Abbreviations

**API Call Abbreviations:**
| Abbr | Meaning |
|---|---|
| **BD** | Business Details |
| **OB** | Obligations |
| **SEB** | Self Employment Business |
| **PB** | Property Business |
| **IC** | Individual Calculations |

**Other Abbreviations:**
| Abbr | Meaning |
|---|---|
| **SATC** | Self Assessment Tax Calculation |

---

## 1 — Authentication

| # | Steps | Expected |
|---|---|---|
| 1.1 | Launch app → click **Sign in with HMRC** | System browser opens HMRC sandbox login page |
| 1.2 | Complete HMRC sandbox login | App receives OAuth callback; status bar shows NINO |
| 1.3 | Restart app without signing out | Tokens reloaded from Keychain; still authenticated |
| 1.4 | Click **Sign out** | Tokens cleared; NINO cleared; app returns to unauthenticated state |
| 1.5 | Sign in → Settings → Delete all data | All personal data wiped; app returns to unauthenticated state |

---

## 2 — Obligations tab

| # | Steps | Expected |
|---|---|---|
| 2.1 | Sign in → navigate to **Obligations** | Obligations fetched; tax year selector and source tabs rendered |
| 2.2 | Switch tax year via top nav | Source tabs and table update for selected year |
| 2.3 | Switch income source tab | Table updates to show obligations for that source |
| 2.4 | Open obligation row | Shows **Create** button only |
| 2.5 | Fulfilled obligation row (within tax year) | Shows **View** and **Amend** buttons |
| 2.6 | Fulfilled obligation row (after 5 Apr tax-year end) | Shows **View** button only; no Amend |
| 2.7 | Click **Create** on open obligation | Navigates to Quarterly tab with correct period pre-selected |
| 2.8 | Click **View** on fulfilled obligation | Navigates to Quarterly tab; form shows figures in read-only mode; status badge = Fulfilled |
| 2.9 | Click **Amend** on fulfilled obligation (within year) | Navigates to Quarterly tab; form is editable; status badge = Draft |
| 2.10 | Load test data (unauthenticated) | Seed obligations rendered correctly with all button states |

---

## 3 — Quarterly Update tab — Create (Self Employment)

| # | Steps | Expected |
|---|---|---|
| 3.1 | Click Create on SE open obligation | Quarterly tab opens; correct period & business pre-selected |
| 3.2 | Enter Turnover and Other Income | Totals update live |
| 3.3 | Click **View details** (Expenses) | Expenses modal opens |
| 3.4 | Enter expense figures in modal → close | Total Expenses row updated in card |
| 3.5 | Check the Confirm checkbox | Submit button becomes enabled |
| 3.6 | Click **Save Draft** | "Saved" feedback appears; last-saved timestamp shown |
| 3.7 | Navigate away → return to Quarterly tab | Draft figures and confirmed state preserved |
| 3.8 | Click **Submit Quarterly Update to HMRC** | Submitting… state shown; on success: Submitted badge + submissionId |
| 3.9 | After submission, return to Obligations tab | Fulfilled obligation now shows View + (if in-year) Amend |
| 3.10 | Toggle Confirm checkbox rapidly | Selected period / source tab does NOT reset |

---

## 4 — Quarterly Update tab — Create (UK Property)

| # | Steps | Expected |
|---|---|---|
| 4.1 | Click Create on UK Property open obligation | Correct period pre-selected |
| 4.2 | Enter Rent Income and Other Income | Totals update |
| 4.3 | Enter expenses via modal | Total updates |
| 4.4 | Confirm and submit | Success badge + submissionId |

---

## 5 — Quarterly Update tab — Create (Foreign Property)

| # | Steps | Expected |
|---|---|---|
| 5.1 | Click Create on Foreign Property open obligation | Correct period pre-selected |
| 5.2 | Enter ISO Country Code (e.g. FRA) | Field accepts up to 3 chars, uppercased |
| 5.3 | Toggle Foreign Tax Credit Relief checkbox | State preserved in draft |
| 5.4 | Enter income and expense figures | Totals update |
| 5.5 | Confirm and submit | Success badge + submissionId |

---

## 6 — Amend

| # | Steps | Expected |
|---|---|---|
| 6.1 | Click **Amend** on fulfilled SE obligation | Quarterly tab loads with retrieved figures; status = Draft; fields editable |
| 6.2 | Modify Turnover figure | Total Income updates |
| 6.3 | Confirm and submit | Submits via PUT amend; success badge with same submissionId |
| 6.4 | Click **View** on same obligation after amend | Updated figures visible in read-only view |
| 6.5 | Open fulfilled SE draft → click **Amend this submission** button | Status changes to Draft; fields become editable |
| 6.6 | Amend UK Property submission | Same flow as SE; PUT used |
| 6.7 | Amend Foreign Property submission | Same flow; PUT used |

---

## 7 — Data Entry — Local Excel

| # | Steps | Expected |
|---|---|---|
| 7.1 | Settings → Data Entry → enable Local Excel, configure file + sheets | Method enabled; banner appears on Quarterly tab |
| 7.2 | Click chain-link icon on a field → map to column header | Mapping saved; icon highlighted in indigo |
| 7.3 | Click **Refresh from spreadsheet** | Figures pre-populated from Excel file for matching period |
| 7.4 | Submit the pre-filled draft | Submission succeeds |

---

## 8 — Data Entry — AirTable

| # | Steps | Expected |
|---|---|---|
| 8.1 | Settings → Data Entry → enable AirTable, configure API key + base | Method enabled |
| 8.2 | Map fields and refresh | Figures pre-populated from AirTable |

---

## 9 — Data Entry — Google Sheets

| # | Steps | Expected |
|---|---|---|
| 9.1 | Settings → Data Entry → enable Google Sheets, configure spreadsheet ID + API key | Method enabled |
| 9.2 | Map fields and refresh | Figures pre-populated from Google Sheets |

---

## 10 — Notifications — Telegram

| # | Steps | Expected |
|---|---|---|
| 10.1 | Settings → Notifications → configure Telegram bot token + chat ID | Saved |
| 10.2 | Submit a quarterly update | Telegram message received with income/expense/profit summary and submissionId |
| 10.3 | Submit with invalid credentials → error | Error notification sent via Telegram |

---

## 11 — Notifications — WhatsApp

| # | Steps | Expected |
|---|---|---|
| 11.1 | Settings → Notifications → configure WhatsApp | Saved |
| 11.2 | Submit a quarterly update | WhatsApp message received |

---

## 12 — Income Adjustments

| # | Steps | Expected |
|---|---|---|
| 12.1 | Navigate to Income Adjustments tab | Loads without error |
| 12.2 | Enter adjustment figures and submit | Submitted successfully |

---

## 13 — Self Assessment

| # | Steps | Expected |
|---|---|---|
| 13.1 | Submit at least one quarterly update → click **View In-year Tax Calculation** | Navigates to SA tab; calculation triggered |
| 13.2 | SA tab shows estimated tax breakdown | Figures displayed correctly |
| 13.3 | Navigate to SA tab without submissions | No in-year calc; empty state shown |

---

## End To End Test 1 — Source and Obligations

Full walkthrough from first launch through confirming obligations are displayed correctly.

### Authentication

1. Open the **Settings** modal → HMRC Credentials section.
2. Enter the sandbox **Client ID** and **Client Secret**, then click **Connect**.
3. The system browser opens the HMRC sandbox login page — log in as a sandbox test user.
4. Use NINO **JY879431D** for this test run.
5. App receives the OAuth callback via `mtd-app://`; status bar shows `JY879431D`.

### Source Tab

1. Navigate to the **Source** tab.
2. The app calls **BD — ListAllBusinesses**:
   `GET /individuals/business/details/{nino}/list`
3. Verify the income sources panel shows all registered businesses with correct name, business type, and address.
4. Open DevTools (View → Toggle Developer Tools) → Network tab → filter by `list`.
5. Inspect the response — example payload:

```json
{
  "listOfBusinesses": [
    {
      "typeOfBusiness": "self-employment",
      "businessId": "XAIS12345678901",
      "tradingName": "Alvaro's Plumbing",
      "accountingPeriods": [
        { "start": "2024-04-06", "end": "2025-04-05" }
      ],
      "accountingType": "CASH",
      "commencementDate": "2018-05-01",
      "cessationDate": null,
      "businessAddressLineOne": "1 High Street",
      "businessAddressPostcode": "TF4 3ER",
      "businessAddressCountryCode": "GB"
    },
    {
      "typeOfBusiness": "uk-property",
      "businessId": "XPIS12345678902"
    },
    {
      "typeOfBusiness": "foreign-property",
      "businessId": "XFIS12345678903"
    }
  ]
}
```

### Obligations Tab

1. Navigate to the **Obligations** tab.
2. The app calls **OB — Retrieve Income Tax (Income and Expenditure) Obligations**:
   `GET /obligations/details/{nino}/income-and-expenditure`
3. Verify the table shows the correct periods, from/to dates, and statuses (`Open` / `Fulfilled`) for each income source.
4. Open DevTools → Network tab → filter by `income-and-expenditure` → inspect the response and confirm it matches the table.
5. Confirm button states per row:
   - **Open/Overdue** rows → **Create** button only
   - **Fulfilled** rows within current tax year → **View** + **Amend** buttons
   - **Fulfilled** rows after 5 April tax-year end → **View** button only

---

## End To End Test 2 — Quarterly Submissions

Full walkthrough covering quarterly submission creation, retrieval, and amendment across all income source types, data entry methods, and notification channels.

### API calls covered

- **SEB** — Self Employment Period Summary: Create | Retrieve | Amend
- **PB** — Income and Expenses Period Summary: Create | Retrieve | Amend
- **OB** — Retrieve
- **IC** — Trigger a SATC | Retrieve a SATC

### Scope

- Correct app navigation between Obligations Tab and Quarterly Tab via **Create**, **View**, and **Amend** buttons; both tabs must show and update information correctly.
- Coverage of all data entry methods (Excel, AirTable, Google Sheets, Manual).
- Coverage of all notification channels on submission (Telegram, WhatsApp).
- Coverage of all income source types (SE, Foreign Property, UK Property).

### Test matrix

| QTR | SE Source | FORP Source | UKP Source | Data Entry | Notifications | Actions |
|---|:---:|:---:|:---:|---|---|---|
| Q1 | ✓ | | | Excel | Telegram | Create, Retrieve, Amend |
| Q2 | | ✓ | | AirTable | WhatsApp | Create, Retrieve, Amend |
| Q3 | | | ✓ | Manual | WhatsApp | Create, Retrieve, Amend |
| Q4 | ✓ | | | Google Sheets | Telegram | Create |

Each quarter's **Create, Retrieve, Amend** actions cover 7 individual test steps (navigate → enter data → confirm → submit → verify obligations → view → amend).

---

## Known issues / open items

<!-- Document discovered bugs here during test runs -->
