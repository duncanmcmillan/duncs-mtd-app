/**
 * @fileoverview Domain model for the Income & Adjustments feature.
 * Covers three HMRC MTD annual submission types: Allowances, Adjustments, and Dividends.
 * Field names match the HMRC API payload properties exactly.
 */

/** The three top-level sections within the Income & Adjustments tab. */
export type IncomeAdjustmentsSection = 'allowances' | 'adjustments' | 'dividends';

/**
 * Allowance declarations for a single income source in a given tax year.
 * SE fields: Self Employment Business Annual Submission API (v3+).
 * Property fields: Property Business Annual Submission API (v4+).
 * Fields not applicable to a source type should be left `undefined`.
 */
export interface AllowanceEntry {
  /** HMRC business identifier. */
  businessId: string;
  /** Income source type. */
  typeOfBusiness: 'self-employment' | 'uk-property' | 'foreign-property';
  /** Tax year string, e.g. `'2024-25'`. */
  taxYear: string;

  // ── Common ───────────────────────────────────────────────────────────────
  /** Annual Investment Allowance on equipment purchases (excluding cars). */
  annualInvestmentAllowance?: number;
  /** Zero emissions car allowance. SE, UK Property, Foreign Property. */
  zeroEmissionsCarAllowance?: number;
  /** Other capital allowances not captured by more specific fields. Property only. */
  otherCapitalAllowance?: number;
  /** Tax exemption for property or land income (capped at £1,000). Property only. */
  propertyIncomeAllowance?: number;
  /** Business Premises Renovation Allowance for unused business premises. SE & UK Property. */
  businessPremisesRenovationAllowance?: number;
  /** Cost of replacing domestic items (formerly Wear and Tear). UK & Foreign Non-FHL Property. */
  costOfReplacingDomesticItems?: number;
  /** Expenditure on electric vehicle charge-point equipment. UK Property. */
  electricChargePointAllowance?: number;
  /** Zero emissions goods vehicle allowance. UK Non-FHL & Foreign Non-FHL Property. */
  zeroEmissionsGoodsVehicleAllowance?: number;

  // ── Self-employment only ─────────────────────────────────────────────────
  /** Capital allowances on equipment including lower-CO2 cars (main pool). SE only. */
  capitalAllowanceMainPool?: number;
  /** Capital allowances at special rate (higher-CO2 / integral building features). SE only. */
  capitalAllowanceSpecialRatePool?: number;
  /** Capital allowances for single-asset pools. SE only. */
  capitalAllowanceSingleAssetPool?: number;
  /** Other enhanced capital allowances. SE only. */
  enhancedCapitalAllowance?: number;
  /** Allowances on sale or cessation of business use (write-off). SE only. */
  allowanceOnSales?: number;
  /**
   * Trading Income Allowance (mutually exclusive with all other allowances).
   * SE only.
   */
  tradingIncomeAllowance?: number;
}

/**
 * Annual adjustment declarations for a single income source in a given tax year.
 * SE fields: Self Employment Business Annual Submission API `adjustments` object.
 * Property fields: Property Business Annual Submission API `adjustments` object.
 * The `calculationId` is used separately for triggering BSAS via the BSAS API.
 */
export interface AdjustmentEntry {
  /** HMRC business identifier. */
  businessId: string;
  /** Income source type. */
  typeOfBusiness: 'self-employment' | 'uk-property' | 'foreign-property';
  /** Tax year string, e.g. `'2024-25'`. */
  taxYear: string;
  /** Calculation ID used to trigger and submit the BSAS (required for BSAS API calls). */
  calculationId?: string;

  // ── Self-employment adjustments ─────────────────────────────────────────
  /** Income included in business figures that is not taxable as business profit. SE only. */
  includedNonTaxableProfits?: number;
  /** Modification for differences between basis period and accounting period (can be negative). SE only. */
  basisAdjustment?: number;
  /** Overlap relief used this year. SE only. */
  overlapReliefUsed?: number;
  /** Adjustment for change of accounting practice. SE only. */
  accountingAdjustment?: number;
  /** Averaging adjustment (farmers, market gardeners, literary/artistic creators only). SE only. */
  averagingAdjustment?: number;
  /** Other business income not included elsewhere. SE only. */
  outstandingBusinessIncome?: number;
  /** Gain on disposal of asset where Business Premises Renovation Allowance applies. SE only. */
  balancingChargeBpra?: number;
  /** Balancing charge on sale or cessation of business use (non-BPRA). SE only. */
  balancingChargeOther?: number;
  /** Normal sale price of goods or stock taken out of the business for personal use. SE only. */
  goodsAndServicesOwnUse?: number;
  /** Transition profit arising in the current tax year (basis period reform). SE only. */
  transitionProfitAmount?: number;
  /** Additional elected transition profit brought forward. SE only. */
  transitionProfitAccelerationAmount?: number;

  // ── Property adjustments (numeric) ──────────────────────────────────────
  /** Adjustments that are not solely for the property business. Property only. */
  privateUseAdjustment?: number;
  /** Recovery charge when a capital-allowance asset is sold or leaves use. Property only. */
  balancingCharge?: number;
  /** Income from sale of BPRA-renovated premises within 7 years. Property only. */
  businessPremisesRenovationAllowanceBalancingCharges?: number;

  // ── Property adjustment flags (boolean) ─────────────────────────────────
  /** Non-resident landlord status. Property only. */
  nonResidentLandlord?: boolean;
  /**
   * Property didn't qualify for FHL this year but qualified last year
   * (period-of-grace election). FHL property only.
   */
  periodOfGraceAdjustment?: boolean;
  /** Rent A Room income is jointly let with another person. Property only. */
  rentARoomJointlyLet?: boolean;
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
  /** `typeOfBusiness` of the allowances entry currently open in the edit modal, or `null`. */
  activeAllowancesSource: string | null;
  /** `typeOfBusiness` of the adjustments entry currently open in the edit modal, or `null`. */
  activeAdjustmentsSource: string | null;
  /** `true` when the dividends edit modal is open. */
  dividendsModalOpen: boolean;
}
