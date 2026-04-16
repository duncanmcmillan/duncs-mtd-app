/**
 * @fileoverview Service for the Self Assessment feature.
 * Wraps the HMRC Individual Calculations API v8.0: trigger, retrieve, and crystallise.
 */
import { Injectable, inject } from '@angular/core';
import { HmrcApiService } from '../../core';
import { TaxCalculationSummary } from '../model/self-assessment.model';

// ─── Raw API response types ───────────────────────────────────────────────────

/** Response from the trigger calculation endpoint. */
interface TriggerCalculationResponse {
  /** HMRC-assigned identifier for the triggered calculation. */
  calculationId: string;
}

/** Metadata section from the HMRC Individual Calculations API retrieve response. */
interface RawCalculationMetadata {
  /** HMRC calculation identifier. */
  calculationId: string;
  /** Tax year string, e.g. `'2024-25'`. */
  taxYear: string;
  /** ISO 8601 timestamp when the calculation was produced. */
  calculationTimestamp: string;
  /** `true` if the Final Declaration has been submitted for this calculation. */
  finalDeclaration: boolean;
}

/** Income tax subtotals section within the retrieve response. */
interface RawIncomeTaxSection {
  /** Sum of income from all sources before deductions (£). */
  totalIncomeReceivedFromAllSources?: number;
  /** Personal allowance applied (£). */
  personalAllowance?: number;
  /** Total allowances and deductions applied (£). */
  totalAllowancesAndDeductions?: number;
  /** Total income after deductions (£). */
  totalTaxableIncome?: number;
  /** Income tax charged. */
  incomeTax?: {
    /** Total income tax amount (£). */
    totalAmount?: number;
  };
}

/** NIC subtotals section within the retrieve response. */
interface RawNicsSection {
  /** Class 2 NIC (voluntary, flat-rate). */
  class2Nics?: { amount?: number };
  /** Class 4 NIC (profit-based, for self-employed). */
  class4Nics?: { totalAmount?: number };
}

/** Per-source income/profit entry returned within the retrieve response. */
interface RawBusinessProfitAndLoss {
  /**
   * HMRC income source type; one of `'self-employment'`, `'uk-property'`,
   * `'uk-property-fhl'`, `'foreign-property'`, `'foreign-property-fhl-eea'`.
   */
  typeOfBusiness: string;
  /** Taxable profit for this income source (£). */
  totalBusinessIncomeTaxableProfit?: number;
}

/** Full raw response from the Individual Calculations API retrieve endpoint. */
interface RawCalculationResponse {
  /** Calculation metadata. */
  metadata: RawCalculationMetadata;
  /** Calculation output — absent if the calculation is still processing. */
  calculation?: {
    /** High-level tax subtotals. */
    taxCalculation?: {
      /** Income tax totals before NIC. */
      incomeTax?: RawIncomeTaxSection;
      /** National Insurance contribution totals. */
      nics?: RawNicsSection;
      /** Combined income tax and NIC due (£). */
      totalIncomeTaxAndNicsDue?: number;
    };
    /** Per-income-source profit/loss breakdown. */
    businessProfitAndLoss?: RawBusinessProfitAndLoss[];
  };
}

// ─── Service ─────────────────────────────────────────────────────────────────

/**
 * Provides access to the HMRC Individual Calculations API (v8.0).
 * Handles trigger, retrieve, and Final Declaration calls.
 */
@Injectable({ providedIn: 'root' })
export class SelfAssessmentService {
  private readonly api = inject(HmrcApiService);

  /**
   * Triggers an Individual Calculations request.
   *
   * **Note:** The HMRC calculation process is asynchronous. In production,
   * wait at least 5 seconds before calling {@link retrieveCalculation}.
   * The sandbox typically responds synchronously.
   *
   * @param nino - The user's National Insurance number.
   * @param token - OAuth bearer token.
   * @param taxYear - Tax year string, e.g. `'2024-25'`.
   * @param calculationType - Calculation type; defaults to `'intent-to-finalise'`.
   * @returns The HMRC-assigned calculation ID.
   * @throws `HttpErrorResponse` if the API call fails.
   */
  async triggerCalculation(
    nino: string,
    token: string,
    taxYear: string,
    calculationType: 'in-year' | 'intent-to-finalise' = 'intent-to-finalise',
  ): Promise<string> {
    const response = await this.api.post<TriggerCalculationResponse>(
      `/individuals/calculations/${nino}/self-assessment/${taxYear}/trigger/${calculationType}`,
      {},
      token,
      '8.0',
    );
    return response.calculationId;
  }

  /**
   * Retrieves a previously triggered tax calculation by ID.
   * @param nino - The user's National Insurance number.
   * @param token - OAuth bearer token.
   * @param taxYear - Tax year string, e.g. `'2024-25'`.
   * @param calculationId - The HMRC calculation identifier.
   * @returns A flattened {@link TaxCalculationSummary}.
   * @throws `HttpErrorResponse` if the API call fails.
   */
  async retrieveCalculation(
    nino: string,
    token: string,
    taxYear: string,
    calculationId: string,
  ): Promise<TaxCalculationSummary> {
    const raw = await this.api.get<RawCalculationResponse>(
      `/individuals/calculations/${nino}/self-assessment/${taxYear}/${calculationId}`,
      token,
      '8.0',
    );
    return mapCalculation(raw);
  }

  /**
   * Submits the Final Declaration (crystallisation) for a calculation.
   * @param nino - The user's National Insurance number.
   * @param token - OAuth bearer token.
   * @param taxYear - Tax year string, e.g. `'2024-25'`.
   * @param calculationId - The HMRC calculation identifier to crystallise.
   * @throws `HttpErrorResponse` if the API call fails.
   */
  async submitFinalDeclaration(
    nino: string,
    token: string,
    taxYear: string,
    calculationId: string,
  ): Promise<void> {
    await this.api.post<void>(
      `/individuals/calculations/${nino}/self-assessment/${taxYear}/${calculationId}/final-declaration`,
      {},
      token,
      '8.0',
    );
  }
}

// ─── Response mapping ─────────────────────────────────────────────────────────

/**
 * Maps the raw HMRC Individual Calculations API retrieve response to the flat
 * {@link TaxCalculationSummary} used by the UI.
 * @param raw - The raw response from the HMRC API.
 */
function mapCalculation(raw: RawCalculationResponse): TaxCalculationSummary {
  const meta     = raw.metadata;
  const taxCalc  = raw.calculation?.taxCalculation;
  const incomeTax = taxCalc?.incomeTax;
  const nics     = taxCalc?.nics;
  const bpl      = raw.calculation?.businessProfitAndLoss ?? [];

  // Aggregate per-source income from the businessProfitAndLoss array.
  const seIncome = bpl.find(b => b.typeOfBusiness === 'self-employment')
    ?.totalBusinessIncomeTaxableProfit;

  const ukPropIncome = sumByTypes(bpl, ['uk-property', 'uk-property-fhl']);
  const fpIncome     = sumByTypes(bpl, ['foreign-property', 'foreign-property-fhl-eea']);

  // Combine Class 2 and Class 4 NIC into a single total, preserving undefined
  // when neither figure is present so the UI can hide the row entirely.
  const class2 = nics?.class2Nics?.amount;
  const class4 = nics?.class4Nics?.totalAmount;
  const totalNic = (class2 != null || class4 != null)
    ? (class2 ?? 0) + (class4 ?? 0)
    : undefined;

  return {
    calculationId:              meta.calculationId,
    taxYear:                    meta.taxYear,
    calculationTimestamp:       meta.calculationTimestamp,
    crystallised:               meta.finalDeclaration,
    selfEmploymentIncome:       seIncome,
    ukPropertyIncome:           ukPropIncome,
    foreignPropertyIncome:      fpIncome,
    totalIncomeReceived:        incomeTax?.totalIncomeReceivedFromAllSources,
    personalAllowance:          incomeTax?.personalAllowance,
    totalAllowancesAndDeductions: incomeTax?.totalAllowancesAndDeductions,
    totalTaxableIncome:         incomeTax?.totalTaxableIncome,
    incomeTaxDue:               incomeTax?.incomeTax?.totalAmount,
    totalNic,
    totalTaxDue:                taxCalc?.totalIncomeTaxAndNicsDue,
  };
}

/**
 * Sums `totalBusinessIncomeTaxableProfit` across entries whose `typeOfBusiness`
 * is in the given list. Returns `undefined` when no matching entries have a value.
 */
function sumByTypes(bpl: RawBusinessProfitAndLoss[], types: string[]): number | undefined {
  let total: number | undefined;
  for (const entry of bpl) {
    if (!types.includes(entry.typeOfBusiness)) continue;
    if (entry.totalBusinessIncomeTaxableProfit == null) continue;
    total = (total ?? 0) + entry.totalBusinessIncomeTaxableProfit;
  }
  return total;
}
