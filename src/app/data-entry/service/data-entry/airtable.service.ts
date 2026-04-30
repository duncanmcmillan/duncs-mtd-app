/**
 * @fileoverview Angular service for reading a single data row from an AirTable
 * base via the AirTable REST API v0. Matches records by period end date and
 * returns field-mapped numeric values.
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

/** Parameters for the AirTable row read operation. */
export interface AirtableReadParams {
  /** AirTable personal access token or API key. */
  apiKey: string;
  /** ID of the AirTable base (e.g. `appXXXXXXXXXXXXXX`). */
  baseId: string;
  /** ID of the table within the base. */
  tableId: string;
  /** Column header identifying the date/period column. */
  dateColumn: string;
  /** ISO YYYY-MM-DD period end date to match against. */
  periodEndDate: string;
  /** Field-key → column-header mapping for values to extract. */
  fieldMappings: Record<string, string>;
}

/** A single record returned by the AirTable List Records API. */
interface AirtableRecord {
  /** Record ID. */
  id: string;
  /** Map of field name to cell value. */
  fields: Record<string, unknown>;
}

/** Response envelope from the AirTable List Records API. */
interface AirtableListResponse {
  /** Records in this page. */
  records: AirtableRecord[];
  /** Pagination cursor — present when more pages exist. */
  offset?: string;
}

/**
 * Normalises an AirTable field value to ISO YYYY-MM-DD for date comparison.
 * Handles native AirTable Date strings (YYYY-MM-DD), UK text strings (DD/MM/YYYY),
 * and other parseable date strings. Returns null when the value cannot be parsed.
 */
function toIsoDate(val: unknown): string | null {
  if (val == null) return null;
  const s = String(val).trim();
  if (!s) return null;
  // Native AirTable Date field: YYYY-MM-DD (may include time component)
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // UK date format DD/MM/YYYY (text field)
  const ukMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ukMatch) {
    const [, dd, mm, yyyy] = ukMatch;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  try { return new Date(s).toISOString().slice(0, 10); }
  catch { return null; }
}

/** Response from the AirTable Metadata API for a single base. */
interface AirtableMetaResponse {
  /** Tables in this base. */
  tables: { name: string; fields: { name: string }[] }[];
}

/**
 * Reads a single income/expense data row from an AirTable base via the
 * AirTable REST API. Fetches records with pagination, matches by period end
 * date, and returns field-mapped numeric values.
 */
@Injectable({ providedIn: 'root' })
export class AirtableService {
  private readonly http = inject(HttpClient);

  /**
   * Fetches all records from the specified AirTable table, finds the row
   * matching `params.periodEndDate`, and returns a map of field-key → numeric
   * value (or null when the cell is empty or non-numeric).
   *
   * @param params - Connection details including API key, base/table IDs, and field mappings.
   * @returns Resolved field values, or an empty object when no matching row is found.
   * @throws When the AirTable API returns an HTTP error.
   */
  async readRow(params: AirtableReadParams): Promise<Record<string, number | null>> {
    const { apiKey, baseId, tableId, dateColumn, periodEndDate, fieldMappings } = params;
    const headers = new HttpHeaders({ Authorization: `Bearer ${apiKey}` });
    const base = `https://api.airtable.com/v0/${encodeURIComponent(baseId)}/${encodeURIComponent(tableId)}`;

    // Fetch all records, following pagination offsets
    const allRecords: AirtableRecord[] = [];
    let offset: string | undefined;
    do {
      let params = new HttpParams().set('pageSize', '100');
      if (offset) params = params.set('offset', offset);
      const page = await firstValueFrom(this.http.get<AirtableListResponse>(base, { headers, params }));
      allRecords.push(...page.records);
      offset = page.offset;
    } while (offset);

    // Find matching record
    const record = allRecords.find(r => toIsoDate(r.fields[dateColumn]) === periodEndDate);
    if (!record) return {};

    // Build result: fieldKey → numeric value
    const result: Record<string, number | null> = {};
    for (const [fieldKey, colHeader] of Object.entries(fieldMappings)) {
      const raw = record.fields[colHeader];
      result[fieldKey] = (typeof raw === 'number' && isFinite(raw)) ? raw : null;
    }
    return result;
  }

  /**
   * Fetches the column headers for a given AirTable table.
   * Tries the Metadata API first; falls back to reading the first record's field keys.
   *
   * @param apiKey - AirTable personal access token.
   * @param baseId - AirTable base ID.
   * @param tableName - Name of the table to read headers from.
   * @returns Array of field name strings, or empty array if the table has no fields.
   */
  async readHeaders(apiKey: string, baseId: string, tableName: string): Promise<string[]> {
    const headers = new HttpHeaders({ Authorization: `Bearer ${apiKey}` });
    try {
      const metaUrl = `https://api.airtable.com/v0/meta/bases/${encodeURIComponent(baseId)}/tables`;
      const resp = await firstValueFrom(this.http.get<AirtableMetaResponse>(metaUrl, { headers }));
      const table = resp.tables.find(t => t.name === tableName);
      if (table) return table.fields.map(f => f.name);
    } catch {
      // Fall through to first-record approach
    }
    const base = `https://api.airtable.com/v0/${encodeURIComponent(baseId)}/${encodeURIComponent(tableName)}`;
    const page = await firstValueFrom(
      this.http.get<AirtableListResponse>(base, { headers, params: new HttpParams().set('pageSize', '1') }),
    );
    return page.records[0] ? Object.keys(page.records[0].fields) : [];
  }
}
