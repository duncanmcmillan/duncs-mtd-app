/**
 * @fileoverview Service for the Income & Adjustments feature.
 * Wraps three HMRC APIs:
 *   - Self Employment Business API v5.0 (annual allowances)
 *   - Business Source Adjustable Summary (BSAS) API v7.0 (SE accounting adjustments)
 *   - Individuals Dividends Income API v2.0 (UK and foreign dividends)
 */
import { Injectable, inject } from '@angular/core';
import { HmrcApiService } from '../../core';
import { AllowanceEntry, AdjustmentEntry, DividendEntry } from '../model/income-adjustments.model';

// ─── Raw API response types ───────────────────────────────────────────────────

/** Response from the BSAS trigger endpoint. */
interface BsasTriggerResponse {
  /** BSAS calculation identifier — used in all subsequent BSAS calls. */
  calculationId: string;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Returns a shallow copy of `obj` with all keys whose value is `undefined` removed.
 * Used to keep API request bodies clean.
 */
function compact<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}

/**
 * Derives the accounting period start and end dates from an HMRC tax year string.
 * @param taxYear - Tax year string, e.g. `'2024-25'`.
 */
function taxYearPeriod(taxYear: string): { startDate: string; endDate: string } {
  const startYear = parseInt(taxYear.split('-')[0], 10);
  return {
    startDate: `${startYear}-04-06`,
    endDate:   `${startYear + 1}-04-05`,
  };
}

// ─── Service ─────────────────────────────────────────────────────────────────

/**
 * Provides access to HMRC APIs for annual allowances, BSAS accounting adjustments,
 * and dividend income declarations.
 */
@Injectable({ providedIn: 'root' })
export class IncomeAdjustmentsService {
  private readonly api = inject(HmrcApiService);

  // ── Allowances ─────────────────────────────────────────────────────────────

  /**
   * Submits annual allowances for the given SE income source.
   * Uses the Self Employment Business API v5.0.
   *
   * @param entry - SE allowance entry to submit.
   * @param nino - National Insurance number.
   * @param token - OAuth bearer token.
   * @throws `HttpErrorResponse` if the API call fails.
   */
  async submitAllowances(entry: AllowanceEntry, nino: string, token: string): Promise<void> {
    if (entry.typeOfBusiness !== 'self-employment') {
      throw new Error(`submitAllowances: typeOfBusiness '${entry.typeOfBusiness}' is not yet supported`);
    }
    const allowances = compact({
      annualInvestmentAllowance:       entry.annualInvestmentAllowance,
      capitalAllowanceMainPool:        entry.capitalAllowanceMainPool,
      capitalAllowanceSpecialRatePool: entry.capitalAllowanceSpecialRatePool,
      capitalAllowanceSingleAssetPool: entry.capitalAllowanceSingleAssetPool,
      businessPremisesRenovationAllowance: entry.businessPremisesRenovationAllowance,
      enhancedCapitalAllowance:        entry.enhancedCapitalAllowance,
      allowanceOnSales:                entry.allowanceOnSales,
      zeroEmissionsCarAllowance:       entry.zeroEmissionsCarAllowance,
      tradingIncomeAllowance:          entry.tradingIncomeAllowance,
    });
    await this.api.put<void>(
      `/individuals/business/self-employment/${nino}/${entry.businessId}/annual/${entry.taxYear}`,
      { allowances },
      token,
      '5.0',
    );
  }

  // ── BSAS Adjustments ───────────────────────────────────────────────────────

  /**
   * Triggers a Business Source Adjustable Summary (BSAS) for a self-employment
   * business and returns the BSAS calculation ID.
   *
   * @param entry - Adjustment entry whose `businessId` and `taxYear` identify the business.
   * @param nino - National Insurance number.
   * @param token - OAuth bearer token.
   * @returns The BSAS `calculationId` to use in {@link submitBsasAdjustments}.
   * @throws `HttpErrorResponse` if the API call fails.
   */
  async triggerBsas(entry: AdjustmentEntry, nino: string, token: string): Promise<string> {
    const { startDate, endDate } = taxYearPeriod(entry.taxYear);
    const response = await this.api.post<BsasTriggerResponse>(
      `/individuals/self-assessment/adjustable-summary/${nino}/trigger`,
      {
        accountingPeriod: { startDate, endDate },
        typeOfBusiness: entry.typeOfBusiness,
        businessId: entry.businessId,
      },
      token,
      '7.0',
    );
    return response.calculationId;
  }

  /**
   * Submits SE accounting adjustments for a BSAS calculation.
   * Must be called after {@link triggerBsas} to obtain a `calculationId`.
   *
   * @param entry - Adjustment entry containing the figures and `calculationId`.
   * @param nino - National Insurance number.
   * @param token - OAuth bearer token.
   * @throws `Error` if `entry.calculationId` is missing.
   * @throws `HttpErrorResponse` if the API call fails.
   */
  async submitBsasAdjustments(entry: AdjustmentEntry, nino: string, token: string): Promise<void> {
    if (!entry.calculationId) {
      throw new Error('submitBsasAdjustments: calculationId is required — trigger a BSAS first');
    }

    const income = compact({ turnover: entry.turnover, other: entry.otherIncome });
    const expenses = compact({
      costOfGoods:                entry.costOfGoods,
      paymentsToSubcontractors:   entry.paymentsToSubcontractors,
      wagesAndStaffCosts:         entry.wagesAndStaffCosts,
      carVanTravelExpenses:       entry.carVanTravelExpenses,
      premisesRunningCosts:       entry.premisesRunningCosts,
      maintenanceCosts:           entry.maintenanceCosts,
      adminCosts:                 entry.adminCosts,
      interestOnBankOtherLoans:   entry.interestOnBankOtherLoans,
      financeCharges:             entry.financeCharges,
      irrecoverableDebts:         entry.irrecoverableDebts,
      professionalFees:           entry.professionalFees,
      depreciation:               entry.depreciation,
      otherExpenses:              entry.otherExpenses,
      advertisingCosts:           entry.advertisingCosts,
      businessEntertainmentCosts: entry.businessEntertainmentCosts,
    });
    const additions = compact({
      costOfGoodsDisallowable:                entry.costOfGoodsDisallowable,
      paymentsToSubcontractorsDisallowable:   entry.paymentsToSubcontractorsDisallowable,
      wagesAndStaffCostsDisallowable:         entry.wagesAndStaffCostsDisallowable,
      carVanTravelExpensesDisallowable:       entry.carVanTravelExpensesDisallowable,
      premisesRunningCostsDisallowable:       entry.premisesRunningCostsDisallowable,
      maintenanceCostsDisallowable:           entry.maintenanceCostsDisallowable,
      adminCostsDisallowable:                 entry.adminCostsDisallowable,
      interestOnBankOtherLoansDisallowable:   entry.interestOnBankOtherLoansDisallowable,
      financeChargesDisallowable:             entry.financeChargesDisallowable,
      irrecoverableDebtsDisallowable:         entry.irrecoverableDebtsDisallowable,
      professionalFeesDisallowable:           entry.professionalFeesDisallowable,
      depreciationDisallowable:               entry.depreciationDisallowable,
      otherExpensesDisallowable:              entry.otherExpensesDisallowable,
      advertisingCostsDisallowable:           entry.advertisingCostsDisallowable,
      businessEntertainmentCostsDisallowable: entry.businessEntertainmentCostsDisallowable,
    });

    const body: Record<string, unknown> = {};
    if (Object.keys(income).length > 0)    body['income']    = income;
    if (Object.keys(expenses).length > 0)  body['expenses']  = expenses;
    if (Object.keys(additions).length > 0) body['additions'] = additions;

    await this.api.post<void>(
      `/individuals/self-assessment/adjustable-summary/${nino}/self-employment/${entry.calculationId}/adjust/${entry.taxYear}`,
      body,
      token,
      '7.0',
    );
  }

  // ── Dividends ──────────────────────────────────────────────────────────────

  /**
   * Submits UK dividend income (ukDividends and otherUkDividends).
   * Uses the Individuals Dividends Income API v2.0 UK sub-endpoint.
   *
   * @param entry - Dividend entry to submit.
   * @param nino - National Insurance number.
   * @param token - OAuth bearer token.
   * @throws `HttpErrorResponse` if the API call fails.
   */
  async submitUkDividends(entry: DividendEntry, nino: string, token: string): Promise<void> {
    const body = compact({
      ukDividends:      entry.ukDividends,
      otherUkDividends: entry.otherUkDividends,
    });
    await this.api.put<void>(
      `/individuals/dividends-income/uk/${nino}/${entry.taxYear}`,
      body,
      token,
      '2.0',
    );
  }

  /**
   * Submits foreign dividend income.
   * Uses the Individuals Dividends Income API v2.0 main endpoint.
   *
   * @param entry - Dividend entry to submit.
   * @param nino - National Insurance number.
   * @param token - OAuth bearer token.
   * @throws `HttpErrorResponse` if the API call fails.
   */
  async submitForeignDividends(entry: DividendEntry, nino: string, token: string): Promise<void> {
    const foreignDividend = (entry.foreignDividends ?? []).map(fd => compact({
      countryCode:            fd.countryCode,
      amountBeforeTax:        fd.amount,
      taxableAmount:          fd.taxableAmount ?? fd.amount,
      taxTakenOff:            fd.taxTakenOff,
      foreignTaxCreditRelief: fd.foreignTaxCreditRelief,
    }));
    await this.api.put<void>(
      `/individuals/dividends-income/${nino}/${entry.taxYear}`,
      { foreignDividend },
      token,
      '2.0',
    );
  }
}
