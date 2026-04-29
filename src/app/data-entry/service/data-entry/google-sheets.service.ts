/**
 * @fileoverview Stub service for the Google Sheets data-entry integration.
 * Will fetch data from the Google Sheets REST API and parse it via Claude API
 * into the MTD income model. No-op implementation until wired up.
 */
import { Injectable } from '@angular/core';

/**
 * Service stub for fetching and parsing Google Sheets data.
 * Implement `fetchAndParse()` in a follow-up PR once the Google Sheets REST
 * and Claude API service interfaces are agreed.
 */
@Injectable({ providedIn: 'root' })
export class GoogleSheetsService {
  /** Placeholder — fetches sheet data and parses via Claude API. */
  async fetchAndParse(): Promise<void> {
    // TODO: implement Google Sheets REST fetch + Claude API parsing
  }
}
