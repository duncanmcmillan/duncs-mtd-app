/**
 * @fileoverview Domain models for the Quarterly Update feature.
 * Covers Self Employment (Self Employment Business API v3) and
 * UK Property (Property Business API v4) income sources.
 */

/** Allowable expense fields for a self-employment periodic summary (SE Business API v3). */
export interface SelfEmploymentExpenses {
  /** Cost of goods or raw materials bought for resale or production. */
  costOfGoods: number | null;
  /** Payments made to subcontractors. */
  paymentsToSubcontractors: number | null;
  /** Wages, salaries, and staff costs. */
  wagesAndStaffCosts: number | null;
  /** Car, van, and travel expenses. */
  carVanTravelExpenses: number | null;
  /** Premises running costs (e.g. rent, rates, utilities). */
  premisesRunningCosts: number | null;
  /** Repairs and maintenance of business property or equipment. */
  maintenanceCosts: number | null;
  /** Administration costs (stationery, phone, postage). */
  adminCosts: number | null;
  /** Business entertainment costs. */
  businessEntertainmentCosts: number | null;
  /** Advertising and marketing costs. */
  advertisingCosts: number | null;
  /** Interest paid on bank or other loans. */
  interestOnBankOtherLoans: number | null;
  /** Finance charges (e.g. hire-purchase interest). */
  financeCharges: number | null;
  /** Irrecoverable (bad) debts written off. */
  irrecoverableDebts: number | null;
  /** Professional fees (e.g. accountants, solicitors). */
  professionalFees: number | null;
  /** Depreciation and loss on disposal of assets. */
  depreciation: number | null;
  /** Any other allowable business expenses. */
  otherExpenses: number | null;
  /** Optional: use instead of individual fields when expense detail is not required. */
  consolidatedExpenses: number | null;
}

/** Non-allowable (disallowable) portions of self-employment expenses. */
export interface SelfEmploymentDisallowableExpenses {
  /** Disallowable portion of cost of goods. */
  costOfGoodsDisallowable: number | null;
  /** Disallowable portion of subcontractor payments. */
  paymentsToSubcontractorsDisallowable: number | null;
  /** Disallowable portion of wages and staff costs. */
  wagesAndStaffCostsDisallowable: number | null;
  /** Disallowable portion of car/van/travel expenses. */
  carVanTravelExpensesDisallowable: number | null;
  /** Disallowable portion of premises running costs. */
  premisesRunningCostsDisallowable: number | null;
  /** Disallowable portion of maintenance costs. */
  maintenanceCostsDisallowable: number | null;
  /** Disallowable portion of admin costs. */
  adminCostsDisallowable: number | null;
  /** Disallowable portion of business entertainment costs. */
  businessEntertainmentCostsDisallowable: number | null;
  /** Disallowable portion of advertising costs. */
  advertisingCostsDisallowable: number | null;
  /** Disallowable portion of loan interest. */
  interestOnBankOtherLoansDisallowable: number | null;
  /** Disallowable portion of finance charges. */
  financeChargesDisallowable: number | null;
  /** Disallowable portion of irrecoverable debts. */
  irrecoverableDebtsDisallowable: number | null;
  /** Disallowable portion of professional fees. */
  professionalFeesDisallowable: number | null;
  /** Disallowable portion of depreciation. */
  depreciationDisallowable: number | null;
  /** Disallowable portion of other expenses. */
  otherExpensesDisallowable: number | null;
}

/** Income fields for a self-employment periodic summary. */
export interface SelfEmploymentIncome {
  /** Trading income / turnover for the period. */
  turnover: number | null;
  /** Other business income for the period. */
  other: number | null;
}

/** Income fields for a UK property periodic summary (Property Business API v4). */
export interface UkPropertyIncome {
  /** Rental income received in the period. */
  rentAmount: number | null;
  /** Income tax deducted at source from rental payments. */
  rentTaxDeducted: number | null;
  /** Premiums received for granting a lease. */
  premiumsOfLeaseGrant: number | null;
  /** Reverse premiums received from a landlord. */
  reversePremiums: number | null;
  /** Other property income not listed above. */
  otherIncome: number | null;
}

/** Expense fields for a UK property periodic summary. */
export interface UkPropertyExpenses {
  /** Premises running costs (rates, insurance, ground rent). */
  premisesRunningCosts: number | null;
  /** Repairs and maintenance of the property. */
  repairsAndMaintenance: number | null;
  /** Mortgage interest and other financial costs. */
  financialCosts: number | null;
  /** Professional fees (lettings agents, solicitors, accountants). */
  professionalFees: number | null;
  /** Cost of services provided with the property. */
  costOfServices: number | null;
  /** Travel costs related to the property. */
  travelCosts: number | null;
  /** Residential finance costs not deducted elsewhere. */
  residentialFinancialCost: number | null;
  /** Residential finance costs brought forward from a previous period. */
  broughtFwdResidentialFinancialCost: number | null;
  /** Other property expenses. */
  other: number | null;
  /** Optional: use instead of individual fields when expense detail is not required. */
  consolidatedExpenses: number | null;
}

/** Lifecycle status of a quarterly draft. */
export type DraftStatus = 'draft' | 'submitting' | 'submitted' | 'error';

/**
 * In-progress or submitted quarterly data for one income source in one reporting period.
 */
export interface QuarterlyDraft {
  /** HMRC-assigned income source identifier. */
  businessId: string;
  /** Display name derived from the income source (trading name or type label). */
  businessName: string;
  /** Whether this source is self-employment or UK property. */
  businessType: 'self-employment' | 'uk-property';
  /** ISO start date of the reporting period (e.g. `'2024-04-06'`). */
  periodStartDate: string;
  /** ISO end date of the reporting period. */
  periodEndDate: string;
  /** ISO deadline date for submitting this period. */
  dueDate: string;
  /** HMRC tax year string, e.g. `'2024-25'`. */
  taxYear: string;

  /** Income figures (used when `businessType` is `'self-employment'`). */
  seIncome: SelfEmploymentIncome;
  /** Allowable expenses (used when `businessType` is `'self-employment'`). */
  seExpenses: SelfEmploymentExpenses;
  /** Non-allowable expense portions (used when `businessType` is `'self-employment'`). */
  seDisallowableExpenses: SelfEmploymentDisallowableExpenses;

  /** Income figures (used when `businessType` is `'uk-property'`). */
  propIncome: UkPropertyIncome;
  /** Expenses (used when `businessType` is `'uk-property'`). */
  propExpenses: UkPropertyExpenses;

  /** Whether the user has confirmed the figures are accurate. */
  confirmed: boolean;
  /** ISO timestamp of the last draft save, or `null` if never saved. */
  lastSaved: string | null;
  /** HMRC-assigned submission identifier (set after a successful submission). */
  submissionId: string | null;
  /** Current submission lifecycle status. */
  status: DraftStatus;
  /** Error message when `status` is `'error'`; `null` otherwise. */
  error: string | null;
}

/** State managed by {@link QuarterlyStore}. */
export interface QuarterlyState {
  /** Whether a global initialisation is in progress. */
  isLoading: boolean;
  /** Global error message, or `null`. */
  error: string | null;
  /** In-progress and submitted drafts, keyed by {@link draftKey}. */
  drafts: Record<string, QuarterlyDraft>;
  /** Key of the draft whose expenses detail modal is currently open, or `null`. */
  activeExpensesModalKey: string | null;
}

/**
 * Builds a stable lookup key for a draft from its income source ID and period start date.
 * @param businessId - HMRC income source identifier.
 * @param periodStartDate - ISO start date of the period (YYYY-MM-DD).
 */
export function draftKey(businessId: string, periodStartDate: string): string {
  return `${businessId}_${periodStartDate}`;
}

/**
 * Derives the HMRC tax year string (e.g. `'2024-25'`) from a period start date.
 * The UK tax year runs from 6 April to 5 April the following year.
 * @param periodStartDate - ISO date string (YYYY-MM-DD).
 */
export function taxYearFromPeriodStart(periodStartDate: string): string {
  const d = new Date(periodStartDate);
  const isAfterTaxYearStart = d.getMonth() > 3 || (d.getMonth() === 3 && d.getDate() >= 6);
  const startYear = isAfterTaxYearStart ? d.getFullYear() : d.getFullYear() - 1;
  return `${startYear}-${String(startYear + 1).slice(2)}`;
}

/** Returns a blank {@link SelfEmploymentIncome} object with all fields `null`. */
export function emptySEIncome(): SelfEmploymentIncome {
  return { turnover: null, other: null };
}

/** Returns a blank {@link SelfEmploymentExpenses} object with all fields `null`. */
export function emptySEExpenses(): SelfEmploymentExpenses {
  return {
    costOfGoods: null, paymentsToSubcontractors: null, wagesAndStaffCosts: null,
    carVanTravelExpenses: null, premisesRunningCosts: null, maintenanceCosts: null,
    adminCosts: null, businessEntertainmentCosts: null, advertisingCosts: null,
    interestOnBankOtherLoans: null, financeCharges: null, irrecoverableDebts: null,
    professionalFees: null, depreciation: null, otherExpenses: null,
    consolidatedExpenses: null,
  };
}

/** Returns a blank {@link SelfEmploymentDisallowableExpenses} object with all fields `null`. */
export function emptySEDisallowable(): SelfEmploymentDisallowableExpenses {
  return {
    costOfGoodsDisallowable: null, paymentsToSubcontractorsDisallowable: null,
    wagesAndStaffCostsDisallowable: null, carVanTravelExpensesDisallowable: null,
    premisesRunningCostsDisallowable: null, maintenanceCostsDisallowable: null,
    adminCostsDisallowable: null, businessEntertainmentCostsDisallowable: null,
    advertisingCostsDisallowable: null, interestOnBankOtherLoansDisallowable: null,
    financeChargesDisallowable: null, irrecoverableDebtsDisallowable: null,
    professionalFeesDisallowable: null, depreciationDisallowable: null,
    otherExpensesDisallowable: null,
  };
}

/** Returns a blank {@link UkPropertyIncome} object with all fields `null`. */
export function emptyPropIncome(): UkPropertyIncome {
  return {
    rentAmount: null, rentTaxDeducted: null, premiumsOfLeaseGrant: null,
    reversePremiums: null, otherIncome: null,
  };
}

/** Returns a blank {@link UkPropertyExpenses} object with all fields `null`. */
export function emptyPropExpenses(): UkPropertyExpenses {
  return {
    premisesRunningCosts: null, repairsAndMaintenance: null, financialCosts: null,
    professionalFees: null, costOfServices: null, travelCosts: null,
    residentialFinancialCost: null, broughtFwdResidentialFinancialCost: null,
    other: null, consolidatedExpenses: null,
  };
}

/**
 * Sums all allowable expense fields for a self-employment source.
 * Uses `consolidatedExpenses` if set; otherwise sums the individual fields.
 * @param expenses - The SE expense fields.
 */
export function totalSEExpenses(expenses: SelfEmploymentExpenses): number {
  if (expenses.consolidatedExpenses !== null) return expenses.consolidatedExpenses;
  return [
    expenses.costOfGoods, expenses.paymentsToSubcontractors, expenses.wagesAndStaffCosts,
    expenses.carVanTravelExpenses, expenses.premisesRunningCosts, expenses.maintenanceCosts,
    expenses.adminCosts, expenses.businessEntertainmentCosts, expenses.advertisingCosts,
    expenses.interestOnBankOtherLoans, expenses.financeCharges, expenses.irrecoverableDebts,
    expenses.professionalFees, expenses.depreciation, expenses.otherExpenses,
  ].reduce<number>((sum, v) => sum + (v ?? 0), 0);
}

/**
 * Sums all income fields for a self-employment source.
 * @param income - The SE income fields.
 */
export function totalSEIncome(income: SelfEmploymentIncome): number {
  return (income.turnover ?? 0) + (income.other ?? 0);
}

/**
 * Sums all income fields for a UK property source.
 * @param income - The property income fields.
 */
export function totalPropIncome(income: UkPropertyIncome): number {
  return (
    (income.rentAmount ?? 0) +
    (income.premiumsOfLeaseGrant ?? 0) +
    (income.reversePremiums ?? 0) +
    (income.otherIncome ?? 0)
  );
}

/**
 * Sums all expense fields for a UK property source.
 * Uses `consolidatedExpenses` if set; otherwise sums the individual fields.
 * @param expenses - The property expense fields.
 */
export function totalPropExpenses(expenses: UkPropertyExpenses): number {
  if (expenses.consolidatedExpenses !== null) return expenses.consolidatedExpenses;
  return [
    expenses.premisesRunningCosts, expenses.repairsAndMaintenance, expenses.financialCosts,
    expenses.professionalFees, expenses.costOfServices, expenses.travelCosts,
    expenses.residentialFinancialCost, expenses.broughtFwdResidentialFinancialCost, expenses.other,
  ].reduce<number>((sum, v) => sum + (v ?? 0), 0);
}
