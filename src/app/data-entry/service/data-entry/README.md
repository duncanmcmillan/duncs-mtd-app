# Google Sheets Service

## HMRC API Spec

Not applicable — this service calls the **Google Sheets REST API v4**, not an HMRC API.

## Endpoint

| | |
|---|---|
| **Method** | GET |
| **Read headers** | `https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}/values/{sheetName}!1:1` |
| **Read all rows** | `https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}/values/{sheetName}` |
| **Auth** | Query parameter `key={apiKey}` (Google Cloud API key with Sheets read access) |

## Request

### `readHeaders(spreadsheetId, apiKey, sheetName)`

| Parameter | Source |
|---|---|
| `spreadsheetId` | `GoogleSheetsSettings.spreadsheetId` (user input) |
| `apiKey` | `GoogleSheetsSettings.apiKey` (user input) |
| `sheetName` | Per-income-type sheet name from `GoogleSheetsSettings` (e.g. `selfEmploymentSheet`) |

Returns the first row of the sheet as an array of strings.

### `readRow(params: GoogleSheetsReadParams)`

| Parameter | Source |
|---|---|
| `spreadsheetId` | `GoogleSheetsSettings.spreadsheetId` |
| `sheetName` | Per-income-type sheet name from `GoogleSheetsSettings` |
| `apiKey` | `GoogleSheetsSettings.apiKey` |
| `dateColumn` | `GoogleSheetsSettings.dateColumn` (e.g. `"Quarter End Date"`) |
| `periodEndDate` | `QuarterlyDraft.periodEndDate` (ISO YYYY-MM-DD) |
| `fieldMappings` | `GoogleSheetsSettings.fieldMappings` (MTD field path → column header name) |

## Response

### Values response

```typescript
interface SheetsValueResponse {
  values?: string[][];  // 2D array, row-major; absent when sheet is empty
}
```

Example (2 rows, 3 columns):

```json
{
  "range": "SE-2024!A1:C10",
  "majorDimension": "ROWS",
  "values": [
    ["Quarter End Date", "Revenue", "Admin Costs"],
    ["05/07/2024", "18450", "1200.50"]
  ]
}
```

## Payload data sources

| Data | Origin |
|---|---|
| Spreadsheet ID | User enters in Google Sheets Settings modal → saved to `DataEntrySettings.googleSheets.spreadsheetId` |
| API key | User enters in Settings modal → saved to `DataEntrySettings.googleSheets.apiKey` |
| Date column | User enters in Settings modal → `DataEntrySettings.googleSheets.dateColumn` |
| Sheet tab names | User enters per income type → `selfEmploymentSheet`, `ukPropertySheet`, `foreignPropertySheet` |
| Field mappings | Set manually or via Claude auto-map → `DataEntrySettings.googleSheets.fieldMappings` |
| Period end date | HMRC obligation data → `QuarterlyDraft.periodEndDate` |

## Date parsing

The service normalises date cell values to `YYYY-MM-DD` before comparison via `toIsoDate()`.
Supported formats:

- `YYYY-MM-DD` — ISO format (Google Sheets native Date type)
- `DD/MM/YYYY` — UK text format
- Any other parseable date string (falls back to `new Date(s).toISOString()`)
