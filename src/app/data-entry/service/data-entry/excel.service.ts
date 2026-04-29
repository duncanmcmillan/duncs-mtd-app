/**
 * @fileoverview Stub service for the Local Excel data-entry integration.
 * Will read a local `.xlsx` file via Electron IPC and parse it via Claude API
 * into the MTD income model. No-op implementation until wired up.
 */
import { Injectable } from '@angular/core';

/**
 * Service stub for reading and parsing local Excel files.
 * Implement `readAndParse()` in a follow-up PR once the Electron file-read
 * IPC channel and Claude API service interfaces are agreed.
 */
@Injectable({ providedIn: 'root' })
export class ExcelService {
  /** Placeholder — reads local xlsx file and parses via Claude API. */
  async readAndParse(): Promise<void> {
    // TODO: implement Electron IPC file read + Claude API parsing
  }
}
