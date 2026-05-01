/**
 * @fileoverview Angular service for reading a single data row from a Google Sheets
 * spreadsheet via the Google Sheets REST API v4. Matches rows by period end date
 * and returns field-mapped numeric values.
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

/** Parameters for the Google Sheets row read operation. */
export interface GoogleSheetsReadParams {
  /** Google Spreadsheet ID. */
  spreadsheetId: string;
  /** Sheet tab name to read from. */
  sheetName: string;
  /** Google API key with Sheets read access. */
  apiKey: string;
  /** Column header identifying the date/period column. */
  dateColumn: string;
  /** ISO YYYY-MM-DD period end date to match against. */
  periodEndDate: string;
  /** Field-key → column-header mapping for values to extract. */
  fieldMappings: Record<string, string>;
}

/** Response from the Google Sheets Values API. */
interface SheetsValueResponse {
  /** 2D array of cell values (row-major); absent when the sheet is empty. */
  values?: string[][];
}

const BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

/**
 * Normalises a cell string to ISO YYYY-MM-DD for date comparison.
 * Handles YYYY-MM-DD, DD/MM/YYYY, and other parseable date strings.
 * Returns `null` when the value cannot be parsed.
 * @param val - Raw cell string from the sheet.
 */
function toIsoDate(val: string | undefined): string | null {
  if (!val) return null;
  const s = val.trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const ukMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ukMatch) {
    const [, dd, mm, yyyy] = ukMatch;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  try { return new Date(s).toISOString().slice(0, 10); }
  catch { return null; }
}

/**
 * Reads a single income/expense data row from a Google Sheets spreadsheet
 * via the Google Sheets REST API v4. Matches by period end date and returns
 * field-mapped numeric values.
 */
@Injectable({ providedIn: 'root' })
export class GoogleSheetsService {
  private readonly http = inject(HttpClient);

  /**
   * Fetches all rows from the specified sheet, finds the row matching
   * `params.periodEndDate`, and returns a map of field-key → numeric value
   * (or `null` when the cell is empty or non-numeric).
   *
   * @param params - Connection details including spreadsheet ID, sheet name, API key, and field mappings.
   * @returns Resolved field values, or an empty object when no matching row is found.
   * @throws When the Google Sheets API returns an HTTP error.
   */
  async readRow(params: GoogleSheetsReadParams): Promise<Record<string, number | null>> {
    const { spreadsheetId, sheetName, apiKey, dateColumn, periodEndDate, fieldMappings } = params;
    const url = `${BASE_URL}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(sheetName)}`;
    const httpParams = new HttpParams().set('key', apiKey);
    const resp = await firstValueFrom(this.http.get<SheetsValueResponse>(url, { params: httpParams }));

    const rows = resp.values ?? [];
    if (rows.length < 2) return {};

    const headers = rows[0];
    const dateColIdx = headers.indexOf(dateColumn);
    if (dateColIdx === -1) return {};

    const dataRow = rows.slice(1).find(row => toIsoDate(row[dateColIdx]) === periodEndDate);
    if (!dataRow) return {};

    const result: Record<string, number | null> = {};
    for (const [fieldKey, colHeader] of Object.entries(fieldMappings)) {
      const colIdx = headers.indexOf(colHeader);
      const raw = colIdx !== -1 ? dataRow[colIdx] : undefined;
      if (raw !== undefined && raw.trim() !== '') {
        const n = parseFloat(raw.replace(/,/g, ''));
        result[fieldKey] = isFinite(n) ? n : null;
      } else {
        result[fieldKey] = null;
      }
    }
    return result;
  }

  /**
   * Fetches the first row of the specified sheet and returns it as an array
   * of column header strings.
   *
   * @param spreadsheetId - Google Spreadsheet ID.
   * @param apiKey - Google API key with Sheets read access.
   * @param sheetName - Name of the sheet tab to read headers from.
   * @returns Array of column header strings, or an empty array when the sheet is empty.
   * @throws When the Google Sheets API returns an HTTP error.
   */
  async readHeaders(spreadsheetId: string, apiKey: string, sheetName: string): Promise<string[]> {
    const range = `${encodeURIComponent(sheetName)}!1:1`;
    const url = `${BASE_URL}/${encodeURIComponent(spreadsheetId)}/values/${range}`;
    const params = new HttpParams().set('key', apiKey);
    const resp = await firstValueFrom(this.http.get<SheetsValueResponse>(url, { params }));
    return resp.values?.[0] ?? [];
  }
}
