/**
 * @fileoverview Stub service for the AirTable data-entry integration.
 * Will fetch records from the AirTable REST API and parse them via Claude API
 * into the MTD income model. No-op implementation until wired up.
 */
import { Injectable } from '@angular/core';

/**
 * Service stub for fetching and parsing AirTable records.
 * Implement `fetchAndParse()` in a follow-up PR once the AirTable REST
 * and Claude API service interfaces are agreed.
 */
@Injectable({ providedIn: 'root' })
export class AirtableService {
  /** Placeholder — fetches records from AirTable and parses via Claude API. */
  async fetchAndParse(): Promise<void> {
    // TODO: implement AirTable REST fetch + Claude API parsing
  }
}
