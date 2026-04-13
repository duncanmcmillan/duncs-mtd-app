/**
 * @fileoverview Service for fetching HMRC MTD ITSA obligations via the HMRC API.
 */
import { Injectable, inject } from '@angular/core';
import { HmrcApiService, ObligationsResponse } from '../../core';

@Injectable({ providedIn: 'root' })
export class ObligationsService {
  private readonly api = inject(HmrcApiService);

  /**
   * Fetches income-and-expenditure obligations for a given NINO from the HMRC
   * MTD Obligations API v3.
   * @param nino - The taxpayer's National Insurance number.
   * @param accessToken - A valid HMRC OAuth access token.
   * @param typeOfBusiness - The income source type (e.g. `'self-employment'`).
   * @param businessId - Optional HMRC income source ID to narrow results to one source.
   * @param fromDate - ISO date (YYYY-MM-DD) for the start of the query window.
   *   Defaults to 6 April two tax years ago.
   * @param toDate - ISO date (YYYY-MM-DD) for the end of the query window.
   *   Defaults to today's date.
   * @returns The raw obligations response from HMRC.
   * @throws `HttpErrorResponse` if the API call fails.
   */
  async fetchObligations(
    nino: string,
    accessToken: string,
    typeOfBusiness: string,
    businessId?: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<ObligationsResponse> {
    const from = fromDate ?? currentTaxYearStart();
    const to = toDate ?? previousTaxYearEnd();
    const query = new URLSearchParams({ fromDate: from, toDate: to, typeOfBusiness });
    if (businessId) query.set('businessId', businessId);
    return this.api.get<ObligationsResponse>(
      `/obligations/details/${nino}/income-and-expenditure?${query}`,
      accessToken,
      '3.0',
    );
  }
}

/**
 * Returns the ISO date for 6 April of the **previous** UK tax year,
 * giving a ~1-year lookback so both the current and prior year's
 * obligations are visible by default.
 */
function currentTaxYearStart(): string {
  const now = new Date();
  // Current tax year started on 6 Apr this year (if past 6 Apr) or last year.
  // Subtract one more year to catch the prior year's sandbox test data.
  const currentYearStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${currentYearStart - 1}-04-06`;
}

/**
 * Returns the ISO date for 5 April of the most recently completed tax year
 * (i.e. end of the previous tax year). Combined with {@link currentTaxYearStart}
 * this gives exactly 365 days — within HMRC's 366-day limit.
 */
function previousTaxYearEnd(): string {
  const now = new Date();
  // If we're past 5 April this year the previous year ended on 5 April this year.
  // Before 5 April the previous year ended on 5 April last year.
  const endYear = now.getMonth() > 3 || (now.getMonth() === 3 && now.getDate() >= 6)
    ? now.getFullYear()
    : now.getFullYear() - 1;
  return `${endYear}-04-05`;
}
