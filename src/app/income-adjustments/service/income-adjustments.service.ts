/**
 * @fileoverview Service for the Income & Adjustments feature.
 * Handles HMRC API calls for Allowances (SE Annual Submission),
 * Adjustments (BSAS), and Dividends (Individuals Dividend Income).
 * No API calls are implemented yet — stub only.
 */
import { Injectable, inject } from '@angular/core';
import { HmrcApiService } from '../../core';

/**
 * Provides access to HMRC APIs for annual allowances, BSAS adjustments,
 * and dividend income declarations.
 * Stub — API methods will be added in a future step.
 */
@Injectable({ providedIn: 'root' })
export class IncomeAdjustmentsService {
  private readonly api = inject(HmrcApiService);
}
