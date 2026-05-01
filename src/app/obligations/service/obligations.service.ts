/**
 * @fileoverview Service for fetching HMRC MTD ITSA obligations via the HMRC API.
 */
import { Injectable, inject } from '@angular/core';
import { HmrcApiService, ObligationsResponse } from '../../core';

@Injectable({ providedIn: 'root' })
export class ObligationsService {
  private readonly api = inject(HmrcApiService);

  /**
   * Fetches all income-and-expenditure obligations for a given NINO from the HMRC
   * MTD Obligations API v3. No `typeOfBusiness` or `businessId` filter is applied
   * so every income source (SE, UK Property, Foreign Property, ITSA) is returned
   * in a single response.
   * @param nino - The taxpayer's National Insurance number.
   * @param accessToken - A valid HMRC OAuth access token.
   * @param fromDate - ISO date (YYYY-MM-DD) for the start of the query window.
   * @param toDate - ISO date (YYYY-MM-DD) for the end of the query window.
   * @returns The raw obligations response from HMRC.
   * @throws `HttpErrorResponse` if the API call fails.
   */
  async fetchObligations(
    nino: string,
    accessToken: string,
    fromDate: string,
    toDate: string,
  ): Promise<ObligationsResponse> {
    const query = new URLSearchParams({ fromDate, toDate });
    return this.api.get<ObligationsResponse>(
      `/obligations/details/${nino}/income-and-expenditure?${query}`,
      accessToken,
      '3.0',
    );
  }
}

/**
 * Returns the ISO start date (6 April) for the given UK tax year start year.
 * @param startYear - The calendar year in which the tax year begins (e.g. 2024 for 2024-25).
 */
function taxYearStartDate(startYear: number): string {
  return `${startYear}-04-06`;
}

/**
 * Returns the ISO end date (5 April) for the given UK tax year start year.
 * @param startYear - The calendar year in which the tax year begins (e.g. 2024 for 2024-25).
 */
function taxYearEndDate(startYear: number): string {
  return `${startYear + 1}-04-05`;
}

/**
 * Returns the calendar year in which the current UK tax year began.
 * The tax year starts on 6 April each calendar year.
 */
export function currentTaxYearStartYear(): number {
  const now = new Date();
  return now.getMonth() > 3 || (now.getMonth() === 3 && now.getDate() >= 6)
    ? now.getFullYear()
    : now.getFullYear() - 1;
}

/**
 * Returns `[fromDate, toDate]` pairs covering the previous and current UK tax
 * years as two separate 365-day windows (HMRC enforces a 366-day maximum per
 * request). Callers should make one API request per pair and merge the results.
 */
export function obligationDateWindows(): Array<[string, string]> {
  const curr = currentTaxYearStartYear();
  return [
    [taxYearStartDate(curr - 1), taxYearEndDate(curr - 1)], // previous tax year
    [taxYearStartDate(curr),     taxYearEndDate(curr)],      // current tax year
  ];
}
