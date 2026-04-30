/**
 * @fileoverview Angular service for reading a single data row from a local
 * Excel (.xlsx) file via Electron IPC. Matches rows by period end date and
 * returns field-mapped numeric values.
 */
import { Injectable } from '@angular/core';

/** Parameters passed to the Electron excel:read-row IPC handler. */
export interface ExcelReadParams {
  /** Absolute path to the .xlsx file. */
  filePath: string;
  /** Name of the worksheet to read. */
  sheetName: string;
  /** Column header identifying the date/period column. */
  dateColumn: string;
  /** ISO YYYY-MM-DD period end date to match against. */
  periodEndDate: string;
  /** Field-key → column-header mapping for values to extract. */
  fieldMappings: Record<string, string>;
}

/** Shape of the Electron excel IPC bridge exposed by preload.js. */
type ExcelBridge = {
  readRow: (params: ExcelReadParams) => Promise<Record<string, number | null>>;
  readHeaders: (params: { filePath: string; sheetName: string }) => Promise<string[]>;
};

const bridge = (window as unknown as { excel?: ExcelBridge }).excel ?? null;

/**
 * Reads a single row of income/expense data from a local Excel file via
 * Electron IPC. All methods are no-ops when running in the browser or test
 * environment (no bridge available).
 */
@Injectable({ providedIn: 'root' })
export class ExcelService {
  /** True when running inside Electron (IPC bridge is available). */
  readonly isElectron = !!bridge;

  /**
   * Reads the row matching `params.periodEndDate` from the configured
   * worksheet and returns a map of field-key → numeric value (or null when
   * the cell is empty/non-numeric).
   *
   * @param params - Read parameters including file path, sheet, date column, and mappings.
   * @returns Resolved field values, or an empty object when no matching row is found.
   * @throws When the file cannot be opened or the sheet/date column is not found.
   */
  async readRow(params: ExcelReadParams): Promise<Record<string, number | null>> {
    if (!bridge) return {};
    return bridge.readRow(params);
  }

  /**
   * Reads the column headers (first row) from the specified worksheet.
   *
   * @param filePath - Absolute path to the `.xlsx` file.
   * @param sheetName - Name of the worksheet to read headers from.
   * @returns Array of non-empty column header strings, or empty array when bridge is absent.
   */
  async readHeaders(filePath: string, sheetName: string): Promise<string[]> {
    if (!bridge) return [];
    return bridge.readHeaders({ filePath, sheetName });
  }
}
