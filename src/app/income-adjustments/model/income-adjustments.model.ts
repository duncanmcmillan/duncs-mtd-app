/**
 * @fileoverview Domain model for the Income & Adjustments feature.
 * Covers three HMRC MTD annual submission types: Allowances, Adjustments, and Dividends.
 */

/** The three top-level sections within the Income & Adjustments tab. */
export type IncomeAdjustmentsSection = 'allowances' | 'adjustments' | 'dividends';

/**
 * Allowance declarations for a single income source in a given tax year.
 * Submitted via the Self Employment Annual Submission (SE) or
 * Property Annual Submission (UK/Foreign Property) APIs.
 */
export interface AllowanceEntry {
  /** HMRC business identifier. */
  businessId: string;
  /** Income source type. */
  typeOfBusiness: 'self-employment' | 'uk-property' | 'foreign-property';
  /** Tax year string, e.g. `'2024-25'`. */
  taxYear: string;
  /** Annual Investment Allowance (£). */
  annualInvestmentAllowance?: number;
  /** Capital Allowance — Main Pool (£). Self-employment only. */
  capitalAllowanceMainPool?: number;
  /** Trading Income Allowance (£). Self-employment only. */
  tradingIncomeAllowance?: number;
  /** Property Income Allowance (£). Property only. */
  propertyIncomeAllowance?: number;
  /** Other Capital Allowance (£). Property only. */
  otherCapitalAllowance?: number;
}

/**
 * Adjustment declarations for a single income source in a given tax year.
 * Submitted via the Business Source Adjustable Summary (BSAS) API.
 */
export interface AdjustmentEntry {
  /** HMRC business identifier. */
  businessId: string;
  /** Income source type. */
  typeOfBusiness: 'self-employment' | 'uk-property' | 'foreign-property';
  /** Tax year string, e.g. `'2024-25'`. */
  taxYear: string;
  /** Calculation ID required to trigger and submit the BSAS. */
  calculationId?: string;
  /** Included non-taxable profits (£). Self-employment only. */
  includedNonTaxableProfits?: number;
  /** Basis adjustment (£). Self-employment only. */
  basisAdjustment?: number;
  /** Overlap relief used (£). Self-employment only. */
  overlapReliefUsed?: number;
  /** Private use adjustment (£). Property only. */
  privateUseAdjustment?: number;
  /** Balancing charge (£). Property only. */
  balancingCharge?: number;
}

/** A single foreign dividend item within a {@link DividendEntry}. */
export interface ForeignDividend {
  /** ISO 3166-1 alpha-2 country code, e.g. `'DE'`. */
  countryCode: string;
  /** Gross dividend amount (£). */
  amount: number;
  /** Tax taken off at source (£). */
  taxTakenOff?: number;
}

/**
 * Dividend income declared for a single tax year.
 * Submitted via the Individuals Dividend Income API.
 */
export interface DividendEntry {
  /** Tax year string, e.g. `'2024-25'`. */
  taxYear: string;
  /** UK dividends received (£). */
  ukDividends?: number;
  /** Other UK dividends received (£). */
  otherUkDividends?: number;
  /** Foreign dividend details, one entry per source country. */
  foreignDividends?: ForeignDividend[];
}

/** NgRx Signal Store state for the Income & Adjustments feature. */
export interface IncomeAdjustmentsState {
  /** `true` while an API request is in flight. */
  isLoading: boolean;
  /** Error message if the last request failed, otherwise `null`. */
  error: string | null;
  /** Allowance entries per source, or `null` before any data is loaded. */
  allowances: AllowanceEntry[] | null;
  /** Adjustment entries per source, or `null` before any data is loaded. */
  adjustments: AdjustmentEntry[] | null;
  /** Dividend declarations, or `null` before any data is loaded. */
  dividends: DividendEntry | null;
}
