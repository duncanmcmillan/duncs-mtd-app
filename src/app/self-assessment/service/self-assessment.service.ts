/**
 * @fileoverview Service for the Self Assessment feature.
 * Wraps the HMRC Individual Calculations API: trigger, retrieve, and crystallise.
 * Stub implementation — API calls will be added in a future step.
 */
import { Injectable, inject } from '@angular/core';
import { HmrcApiService } from '../../core';
import { TaxCalculationSummary } from '../model/self-assessment.model';

/**
 * Provides access to the HMRC Individual Calculations API.
 * All methods are stubs and will throw until real HTTP calls are implemented.
 */
@Injectable({ providedIn: 'root' })
export class SelfAssessmentService {
  private readonly api = inject(HmrcApiService);

  /**
   * Triggers an Individual Calculations 'intent-to-finalise' request.
   * @param nino - The user's National Insurance number.
   * @param token - OAuth bearer token.
   * @param taxYear - Tax year string, e.g. `'2024-25'`.
   * @returns The calculation ID returned by HMRC.
   * @throws When the API call fails or is not yet implemented.
   */
  async triggerCalculation(nino: string, token: string, taxYear: string): Promise<string> {
    void (this.api, nino, token, taxYear);
    throw new Error('triggerCalculation not yet implemented');
  }

  /**
   * Retrieves a previously triggered tax calculation by ID.
   * @param nino - The user's National Insurance number.
   * @param token - OAuth bearer token.
   * @param taxYear - Tax year string, e.g. `'2024-25'`.
   * @param calculationId - The HMRC calculation identifier.
   * @returns A flattened {@link TaxCalculationSummary}.
   * @throws When the API call fails or is not yet implemented.
   */
  async retrieveCalculation(
    nino: string,
    token: string,
    taxYear: string,
    calculationId: string,
  ): Promise<TaxCalculationSummary> {
    void (this.api, nino, token, taxYear, calculationId);
    throw new Error('retrieveCalculation not yet implemented');
  }

  /**
   * Submits the Final Declaration (crystallisation) for a calculation.
   * @param nino - The user's National Insurance number.
   * @param token - OAuth bearer token.
   * @param taxYear - Tax year string, e.g. `'2024-25'`.
   * @param calculationId - The HMRC calculation identifier to crystallise.
   * @throws When the API call fails or is not yet implemented.
   */
  async submitFinalDeclaration(
    nino: string,
    token: string,
    taxYear: string,
    calculationId: string,
  ): Promise<void> {
    void (this.api, nino, token, taxYear, calculationId);
    throw new Error('submitFinalDeclaration not yet implemented');
  }
}
