/**
 * @fileoverview Domain model for the Income & Adjustments feature.
 * Covers three HMRC MTD annual submission types: Allowances, Adjustments, and Dividends.
 * Field names match the HMRC API payload properties exactly.
 */

/** The three top-level sections within the Income & Adjustments tab. */
export type IncomeAdjustmentsSection = 'allowances' | 'adjustments' | 'dividends';

/**
 * Allowance declarations for a single income source in a given tax year.
 * SE fields: Self Employment Business Annual Submission API (v5+).
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
 * BSAS accounting adjustment declarations for a self-employment business.
 * Submitted via the Business Source Adjustable Summary (BSAS) API v7.0.
 *
 * SE fields map to the `income`, `expenses`, and `additions` objects in the
 * BSAS "Submit Self-Employment Accounting Adjustments" endpoint.
 * Property fields map to the Property Business Annual Submission API `adjustments`
 * object and are placeholders for a future implementation step.
 *
 * All numeric values can be negative (an adjustment can increase or decrease the
 * originally reported figure).
 */
export interface AdjustmentEntry {
  /** HMRC business identifier. */
  businessId: string;
  /** Income source type. */
  typeOfBusiness: 'self-employment' | 'uk-property' | 'foreign-property';
  /** Tax year string, e.g. `'2024-25'`. */
  taxYear: string;
  /**
   * BSAS calculation ID returned by the BSAS trigger endpoint.
   * Required before submitting SE accounting adjustments.
   */
  calculationId?: string;

  // ── SE BSAS income adjustments ──────────────────────────────────────────
  /** Adjustment to business turnover / fees / sales. SE only. */
  turnover?: number;
  /** Adjustment to any other business income not included in turnover. SE only. */
  otherIncome?: number;

  // ── SE BSAS expense adjustments ─────────────────────────────────────────
  /** Adjustment to cost of goods bought for resale or goods used. SE only. */
  costOfGoods?: number;
  /** Adjustment to payments to subcontractors. SE only. */
  paymentsToSubcontractors?: number;
  /** Adjustment to wages, salaries, and other staff costs. SE only. */
  wagesAndStaffCosts?: number;
  /** Adjustment to car, van, and travel expenses. SE only. */
  carVanTravelExpenses?: number;
  /** Adjustment to rent, rates, and power costs. SE only. */
  premisesRunningCosts?: number;
  /** Adjustment to repairs and maintenance. SE only. */
  maintenanceCosts?: number;
  /** Adjustment to phone, stationery, and other office costs. SE only. */
  adminCosts?: number;
  /** Adjustment to interest on bank loans and similar. SE only. */
  interestOnBankOtherLoans?: number;
  /** Adjustment to bank, credit card, and other finance charges. SE only. */
  financeCharges?: number;
  /** Adjustment to bad debts and provisions. SE only. */
  irrecoverableDebts?: number;
  /** Adjustment to accountancy, legal, and professional fees. SE only. */
  professionalFees?: number;
  /** Adjustment to depreciation and loss or profit on sale of assets. SE only. */
  depreciation?: number;
  /** Adjustment to other allowable business expenses. SE only. */
  otherExpenses?: number;
  /** Adjustment to advertising and marketing costs. SE only. */
  advertisingCosts?: number;
  /** Adjustment to business entertainment costs. SE only. */
  businessEntertainmentCosts?: number;

  // ── SE BSAS additions (disallowable counterparts) ────────────────────────
  /** Disallowable portion of cost of goods. SE only. */
  costOfGoodsDisallowable?: number;
  /** Disallowable portion of payments to subcontractors. SE only. */
  paymentsToSubcontractorsDisallowable?: number;
  /** Disallowable portion of wages and staff costs. SE only. */
  wagesAndStaffCostsDisallowable?: number;
  /** Disallowable portion of car, van, and travel expenses. SE only. */
  carVanTravelExpensesDisallowable?: number;
  /** Disallowable portion of premises running costs. SE only. */
  premisesRunningCostsDisallowable?: number;
  /** Disallowable portion of maintenance costs. SE only. */
  maintenanceCostsDisallowable?: number;
  /** Disallowable portion of admin costs. SE only. */
  adminCostsDisallowable?: number;
  /** Disallowable portion of interest on bank / other loans. SE only. */
  interestOnBankOtherLoansDisallowable?: number;
  /** Disallowable portion of finance charges. SE only. */
  financeChargesDisallowable?: number;
  /** Disallowable portion of irrecoverable debts. SE only. */
  irrecoverableDebtsDisallowable?: number;
  /** Disallowable portion of professional fees. SE only. */
  professionalFeesDisallowable?: number;
  /** Disallowable portion of depreciation. SE only. */
  depreciationDisallowable?: number;
  /** Disallowable portion of other expenses. SE only. */
  otherExpensesDisallowable?: number;
  /** Disallowable portion of advertising costs. SE only. */
  advertisingCostsDisallowable?: number;
  /** Disallowable portion of business entertainment costs. SE only. */
  businessEntertainmentCostsDisallowable?: number;

  // ── Property adjustment fields (annual submission — future implementation) ──
  /** Adjustments that are not solely for the property business. Property only. */
  privateUseAdjustment?: number;
  /** Recovery charge when a capital-allowance asset is sold or leaves use. Property only. */
  balancingCharge?: number;
  /** Income from sale of BPRA-renovated premises within 7 years. Property only. */
  businessPremisesRenovationAllowanceBalancingCharges?: number;
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
  /** ISO 3166-1 Alpha-3 country code, e.g. `'DEU'`. */
  countryCode: string;
  /** Gross dividend amount before tax (£). Maps to `amountBeforeTax` in the HMRC API. */
  amount: number;
  /**
   * The taxable amount of this dividend (£).
   * Required by the Individuals Dividends Income API v2.0.
   * Defaults to {@link amount} when not set.
   */
  taxableAmount?: number;
  /** Tax taken off at source (£). */
  taxTakenOff?: number;
  /** `true` if Foreign Tax Credit Relief is claimed for this dividend. */
  foreignTaxCreditRelief?: boolean;
}

/**
 * Dividend income declared for a single tax year.
 * UK dividends are submitted via `PUT /individuals/dividends-income/uk/{nino}/{taxYear}`.
 * Foreign dividends are submitted via `PUT /individuals/dividends-income/{nino}/{taxYear}`.
 * Both endpoints use the Individuals Dividends Income API v2.0.
 */
export interface DividendEntry {
  /** Tax year string, e.g. `'2024-25'`. */
  taxYear: string;
  /** UK dividends received from companies and unit trusts (£). */
  ukDividends?: number;
  /** Other UK dividends from authorised unit trusts and OEICs (£). */
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
