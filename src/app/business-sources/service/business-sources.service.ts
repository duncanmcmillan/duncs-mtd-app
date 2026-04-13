/**
 * @fileoverview Service for fetching HMRC business income sources via the
 * Business Details API v2.
 */
import { Injectable, inject } from '@angular/core';
import { HmrcApiService, BusinessSourcesResponse } from '../../core';

@Injectable({ providedIn: 'root' })
export class BusinessSourcesService {
  private readonly api = inject(HmrcApiService);

  /**
   * Fetches all business income sources registered for a taxpayer.
   * @param nino - The taxpayer's National Insurance number.
   * @param accessToken - A valid HMRC OAuth access token.
   * @returns The list of registered income sources.
   * @throws `HttpErrorResponse` if the API call fails.
   */
  async fetchBusinessSources(nino: string, accessToken: string): Promise<BusinessSourcesResponse> {
    return this.api.get<BusinessSourcesResponse>(
      `/individuals/business/details/${nino}/list`,
      accessToken,
      '2.0',
    );
  }
}
