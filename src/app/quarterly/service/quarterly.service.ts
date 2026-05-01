/**
 * @fileoverview Service for submitting HMRC MTD quarterly updates via the
 * Self Employment Business API v3, Property Business API v4 (UK), and
 * Property Business API v6 (Foreign), and for persisting in-progress
 * drafts to localStorage.
 */
import { Injectable, inject } from '@angular/core';
import { HmrcApiService } from '../../core';
import {
  QuarterlyDraft,
  SelfEmploymentIncome,
  SelfEmploymentExpenses,
  SelfEmploymentDisallowableExpenses,
  UkPropertyIncome,
  UkPropertyExpenses,
  ForeignPropertyIncome,
  ForeignPropertyExpenses,
  draftKey,
  emptySEIncome,
  emptySEExpenses,
  emptySEDisallowable,
  emptyPropIncome,
  emptyPropExpenses,
  emptyForeignPropIncome,
  emptyForeignPropExpenses,
} from '../model/quarterly.model';

/** Response body from the SE Business API periodic summary create/amend endpoint. */
interface SelfEmploymentSubmitResponse {
  /** HMRC-assigned identifier for the submitted periodic summary. */
  submissionId: string;
}

/** Response body from the Property Business API periodic summary create endpoint. */
interface PropertySubmitResponse {
  /** HMRC-assigned identifier for the submitted periodic summary. */
  submissionId: string;
}

/** A single entry from a period list endpoint. */
interface PeriodListEntry {
  /** HMRC-assigned submission identifier. */
  submissionId: string;
  /** ISO start date of the period. */
  fromDate: string;
  /** ISO end date of the period. */
  toDate: string;
}

/** Response body from period list endpoints. */
interface PeriodListApiResponse {
  /** Array of period entries. */
  submissions?: PeriodListEntry[];
}

/** Raw API response for SE periodic summary retrieve. */
interface SERetrieveApiResponse {
  periodIncome?: Partial<{
    turnover: number; other: number;
  }>;
  periodExpenses?: Partial<{
    costOfGoods: number; paymentsToSubcontractors: number; wagesAndStaffCosts: number;
    carVanTravelExpenses: number; premisesRunningCosts: number; maintenanceCosts: number;
    adminCosts: number; businessEntertainmentCosts: number; advertisingCosts: number;
    interestOnBankOtherLoans: number; financeCharges: number; irrecoverableDebts: number;
    professionalFees: number; depreciation: number; otherExpenses: number;
    consolidatedExpenses: number;
  }>;
  periodDisallowableExpenses?: Partial<{
    costOfGoodsDisallowable: number; paymentsToSubcontractorsDisallowable: number;
    wagesAndStaffCostsDisallowable: number; carVanTravelExpensesDisallowable: number;
    premisesRunningCostsDisallowable: number; maintenanceCostsDisallowable: number;
    adminCostsDisallowable: number; businessEntertainmentCostsDisallowable: number;
    advertisingCostsDisallowable: number; interestOnBankOtherLoansDisallowable: number;
    financeChargesDisallowable: number; irrecoverableDebtsDisallowable: number;
    professionalFeesDisallowable: number; depreciationDisallowable: number;
    otherExpensesDisallowable: number;
  }>;
}

/** Raw API response for UK property periodic summary retrieve. */
interface UkPropertyRetrieveApiResponse {
  income?: {
    rentIncome?: { amount?: number; taxDeducted?: number };
    premiumsOfLeaseGrant?: number;
    reversePremiums?: number;
    otherIncome?: number;
  };
  expenses?: Partial<{
    premisesRunningCosts: number; repairsAndMaintenance: number; financialCosts: number;
    professionalFees: number; costOfServices: number; travelCosts: number;
    residentialFinancialCost: number; broughtFwdResidentialFinancialCost: number;
    other: number; consolidatedExpenses: number;
  }>;
}

/** Raw API response for foreign property periodic summary retrieve. */
interface ForeignPropertyRetrieveApiResponse {
  foreignProperty?: Array<{
    countryCode: string;
    income?: {
      foreignTaxCreditRelief?: boolean;
      rentIncome?: { rentAmount?: number };
      premiumsOfLeaseGrant?: number;
      otherPropertyIncome?: number;
      foreignTaxPaidOrDeducted?: number;
      specialWithholdingTaxOrUkTaxPaid?: number;
    };
    expenses?: Partial<{
      premisesRunningCosts: number; repairsAndMaintenance: number; financialCosts: number;
      professionalFees: number; costOfServices: number; travelCosts: number;
      other: number; consolidatedExpenses: number;
    }>;
  }>;
}

/** App-level result from SE retrieve. */
export interface SERetrievedData {
  /** Income figures retrieved from HMRC. */
  income: SelfEmploymentIncome;
  /** Allowable expense figures retrieved from HMRC. */
  expenses: SelfEmploymentExpenses;
  /** Disallowable expense figures retrieved from HMRC. */
  disallowable: SelfEmploymentDisallowableExpenses;
}

/** App-level result from UK property retrieve. */
export interface UkPropertyRetrievedData {
  /** Income figures retrieved from HMRC. */
  income: UkPropertyIncome;
  /** Expense figures retrieved from HMRC. */
  expenses: UkPropertyExpenses;
}

/** App-level result from foreign property retrieve. */
export interface ForeignPropertyRetrievedData {
  /** Income figures retrieved from HMRC. */
  income: ForeignPropertyIncome;
  /** Expense figures retrieved from HMRC. */
  expenses: ForeignPropertyExpenses;
}

/** A summary reference from a period list endpoint. */
export interface PeriodSummaryRef {
  /** HMRC-assigned submission identifier. */
  submissionId: string;
  /** ISO start date of the period. */
  fromDate: string;
  /** ISO end date of the period. */
  toDate: string;
}

const DRAFT_KEY_PREFIX = 'quarterly_draft_';

@Injectable({ providedIn: 'root' })
export class QuarterlyService {
  private readonly api = inject(HmrcApiService);

  /**
   * Submits a self-employment quarterly (periodic summary) update to HMRC.
   * Creates a new submission via the Self Employment Business API v3.
   * @param nino - The taxpayer's National Insurance number.
   * @param businessId - HMRC income source identifier.
   * @param taxYear - HMRC tax year string, e.g. `'2024-25'`.
   * @param periodStartDate - ISO start date of the period (YYYY-MM-DD).
   * @param periodEndDate - ISO end date of the period (YYYY-MM-DD).
   * @param accessToken - A valid HMRC OAuth access token.
   * @param income - The income figures for the period.
   * @param expenses - The allowable expense figures for the period.
   * @param disallowable - The non-allowable expense portions.
   * @returns The HMRC-assigned submission ID.
   * @throws `HttpErrorResponse` if the API call fails.
   */
  async submitSelfEmployment(
    nino: string,
    businessId: string,
    taxYear: string,
    periodStartDate: string,
    periodEndDate: string,
    accessToken: string,
    income: SelfEmploymentIncome,
    expenses: SelfEmploymentExpenses,
    disallowable: SelfEmploymentDisallowableExpenses,
  ): Promise<string> {
    const body = buildSEBody(periodStartDate, periodEndDate, income, expenses, disallowable);
    const response = await this.api.post<SelfEmploymentSubmitResponse>(
      `/individuals/self-employment/income-summary/${nino}/${taxYear}/${businessId}`,
      body,
      accessToken,
      '3.0',
    );
    return response.submissionId;
  }

  /**
   * Submits a UK property quarterly (periodic summary) update to HMRC.
   * Creates a new submission via the Property Business API v4.
   * @param nino - The taxpayer's National Insurance number.
   * @param businessId - HMRC income source identifier.
   * @param taxYear - HMRC tax year string, e.g. `'2024-25'`.
   * @param periodStartDate - ISO start date of the period (YYYY-MM-DD).
   * @param periodEndDate - ISO end date of the period (YYYY-MM-DD).
   * @param accessToken - A valid HMRC OAuth access token.
   * @param income - The property income figures for the period.
   * @param expenses - The property expense figures for the period.
   * @returns The HMRC-assigned submission ID.
   * @throws `HttpErrorResponse` if the API call fails.
   */
  async submitUkProperty(
    nino: string,
    businessId: string,
    taxYear: string,
    periodStartDate: string,
    periodEndDate: string,
    accessToken: string,
    income: UkPropertyIncome,
    expenses: UkPropertyExpenses,
  ): Promise<string> {
    const body = buildPropertyBody(periodStartDate, periodEndDate, income, expenses);
    const response = await this.api.post<PropertySubmitResponse>(
      `/individuals/business/property/uk/${nino}/${taxYear}/${businessId}/period`,
      body,
      accessToken,
      '4.0',
    );
    return response.submissionId;
  }

  /**
   * Submits a foreign property quarterly (periodic summary) update to HMRC.
   * Creates a new submission via the Property Business API v6.
   * @param nino - The taxpayer's National Insurance number.
   * @param businessId - HMRC income source identifier.
   * @param taxYear - HMRC tax year string, e.g. `'2024-25'`.
   * @param periodStartDate - ISO start date of the period (YYYY-MM-DD).
   * @param periodEndDate - ISO end date of the period (YYYY-MM-DD).
   * @param accessToken - A valid HMRC OAuth access token.
   * @param income - The foreign property income figures for the period.
   * @param expenses - The foreign property expense figures for the period.
   * @returns The HMRC-assigned submission ID.
   * @throws `HttpErrorResponse` if the API call fails.
   */
  async submitForeignProperty(
    nino: string,
    businessId: string,
    taxYear: string,
    periodStartDate: string,
    periodEndDate: string,
    accessToken: string,
    income: ForeignPropertyIncome,
    expenses: ForeignPropertyExpenses,
  ): Promise<string> {
    const body = buildForeignPropertyBody(periodStartDate, periodEndDate, income, expenses);
    const response = await this.api.post<PropertySubmitResponse>(
      `/individuals/business/property/foreign/${nino}/${taxYear}/${businessId}/period`,
      body,
      accessToken,
      '6.0',
    );
    return response.submissionId;
  }

  // ─── List ──────────────────────────────────────────────────────────────────

  /**
   * Lists self-employment periodic summary submissions for a given business and tax year.
   * @param nino - The taxpayer's National Insurance number.
   * @param businessId - HMRC income source identifier.
   * @param taxYear - HMRC tax year string, e.g. `'2024-25'`.
   * @param accessToken - A valid HMRC OAuth access token.
   * @returns Array of period summary references including submissionId and date range.
   * @throws `HttpErrorResponse` if the API call fails.
   */
  async listSEPeriods(
    nino: string,
    businessId: string,
    taxYear: string,
    accessToken: string,
  ): Promise<PeriodSummaryRef[]> {
    const response = await this.api.get<PeriodListApiResponse>(
      `/individuals/self-employment/income-summary/${nino}/${taxYear}/${businessId}`,
      accessToken,
      '3.0',
    );
    return (response.submissions ?? []).map(s => ({
      submissionId: s.submissionId,
      fromDate: s.fromDate,
      toDate: s.toDate,
    }));
  }

  /**
   * Lists UK property periodic summary submissions for a given business and tax year.
   * @param nino - The taxpayer's National Insurance number.
   * @param businessId - HMRC income source identifier.
   * @param taxYear - HMRC tax year string, e.g. `'2024-25'`.
   * @param accessToken - A valid HMRC OAuth access token.
   * @returns Array of period summary references.
   * @throws `HttpErrorResponse` if the API call fails.
   */
  async listUkPropertyPeriods(
    nino: string,
    businessId: string,
    taxYear: string,
    accessToken: string,
  ): Promise<PeriodSummaryRef[]> {
    const response = await this.api.get<PeriodListApiResponse>(
      `/individuals/business/property/uk/${nino}/${taxYear}/${businessId}/period`,
      accessToken,
      '4.0',
    );
    return (response.submissions ?? []).map(s => ({
      submissionId: s.submissionId,
      fromDate: s.fromDate,
      toDate: s.toDate,
    }));
  }

  /**
   * Lists foreign property periodic summary submissions for a given business and tax year.
   * @param nino - The taxpayer's National Insurance number.
   * @param businessId - HMRC income source identifier.
   * @param taxYear - HMRC tax year string, e.g. `'2024-25'`.
   * @param accessToken - A valid HMRC OAuth access token.
   * @returns Array of period summary references.
   * @throws `HttpErrorResponse` if the API call fails.
   */
  async listForeignPropertyPeriods(
    nino: string,
    businessId: string,
    taxYear: string,
    accessToken: string,
  ): Promise<PeriodSummaryRef[]> {
    const response = await this.api.get<PeriodListApiResponse>(
      `/individuals/business/property/foreign/${nino}/${taxYear}/${businessId}/period`,
      accessToken,
      '6.0',
    );
    return (response.submissions ?? []).map(s => ({
      submissionId: s.submissionId,
      fromDate: s.fromDate,
      toDate: s.toDate,
    }));
  }

  // ─── Retrieve ──────────────────────────────────────────────────────────────

  /**
   * Retrieves a self-employment periodic summary from HMRC.
   * @param nino - The taxpayer's National Insurance number.
   * @param businessId - HMRC income source identifier.
   * @param taxYear - HMRC tax year string, e.g. `'2024-25'`.
   * @param submissionId - HMRC submission identifier.
   * @param accessToken - A valid HMRC OAuth access token.
   * @returns Mapped income, allowable expenses, and disallowable expenses.
   * @throws `HttpErrorResponse` if the API call fails.
   */
  async retrieveSelfEmployment(
    nino: string,
    businessId: string,
    taxYear: string,
    submissionId: string,
    accessToken: string,
  ): Promise<SERetrievedData> {
    const r = await this.api.get<SERetrieveApiResponse>(
      `/individuals/self-employment/income-summary/${nino}/${taxYear}/${businessId}/${submissionId}`,
      accessToken,
      '3.0',
    );
    const pi = r.periodIncome ?? {};
    const pe = r.periodExpenses ?? {};
    const pd = r.periodDisallowableExpenses ?? {};
    return {
      income: { ...emptySEIncome(), ...nullify(pi) } as SelfEmploymentIncome,
      expenses: { ...emptySEExpenses(), ...nullify(pe) } as SelfEmploymentExpenses,
      disallowable: { ...emptySEDisallowable(), ...nullify(pd) } as SelfEmploymentDisallowableExpenses,
    };
  }

  /**
   * Retrieves a UK property periodic summary from HMRC.
   * @param nino - The taxpayer's National Insurance number.
   * @param businessId - HMRC income source identifier.
   * @param taxYear - HMRC tax year string, e.g. `'2024-25'`.
   * @param submissionId - HMRC submission identifier.
   * @param accessToken - A valid HMRC OAuth access token.
   * @returns Mapped income and expense figures.
   * @throws `HttpErrorResponse` if the API call fails.
   */
  async retrieveUkProperty(
    nino: string,
    businessId: string,
    taxYear: string,
    submissionId: string,
    accessToken: string,
  ): Promise<UkPropertyRetrievedData> {
    const r = await this.api.get<UkPropertyRetrieveApiResponse>(
      `/individuals/business/property/uk/${nino}/${taxYear}/${businessId}/period/${submissionId}`,
      accessToken,
      '4.0',
    );
    const ri = r.income ?? {};
    const re = r.expenses ?? {};
    const income: UkPropertyIncome = {
      ...emptyPropIncome(),
      rentAmount: ri.rentIncome?.amount ?? null,
      rentTaxDeducted: ri.rentIncome?.taxDeducted ?? null,
      premiumsOfLeaseGrant: ri.premiumsOfLeaseGrant ?? null,
      reversePremiums: ri.reversePremiums ?? null,
      otherIncome: ri.otherIncome ?? null,
    };
    return {
      income,
      expenses: { ...emptyPropExpenses(), ...nullify(re) } as UkPropertyExpenses,
    };
  }

  /**
   * Retrieves a foreign property periodic summary from HMRC.
   * @param nino - The taxpayer's National Insurance number.
   * @param businessId - HMRC income source identifier.
   * @param taxYear - HMRC tax year string, e.g. `'2024-25'`.
   * @param submissionId - HMRC submission identifier.
   * @param accessToken - A valid HMRC OAuth access token.
   * @returns Mapped income and expense figures for the first country entry.
   * @throws `HttpErrorResponse` if the API call fails.
   */
  async retrieveForeignProperty(
    nino: string,
    businessId: string,
    taxYear: string,
    submissionId: string,
    accessToken: string,
  ): Promise<ForeignPropertyRetrievedData> {
    const r = await this.api.get<ForeignPropertyRetrieveApiResponse>(
      `/individuals/business/property/foreign/${nino}/${taxYear}/${businessId}/period/${submissionId}`,
      accessToken,
      '6.0',
    );
    const entry = r.foreignProperty?.[0];
    const ri = entry?.income ?? {};
    const re = entry?.expenses ?? {};
    const income: ForeignPropertyIncome = {
      ...emptyForeignPropIncome(),
      countryCode: entry?.countryCode ?? '',
      foreignTaxCreditRelief: ri.foreignTaxCreditRelief ?? false,
      rentIncome: ri.rentIncome?.rentAmount ?? null,
      premiumsOfLeaseGrant: ri.premiumsOfLeaseGrant ?? null,
      otherPropertyIncome: ri.otherPropertyIncome ?? null,
      foreignTaxPaidOrDeducted: ri.foreignTaxPaidOrDeducted ?? null,
      specialWithholdingTaxOrUkTaxPaid: ri.specialWithholdingTaxOrUkTaxPaid ?? null,
    };
    return {
      income,
      expenses: { ...emptyForeignPropExpenses(), ...nullify(re) } as ForeignPropertyExpenses,
    };
  }

  // ─── Amend ─────────────────────────────────────────────────────────────────

  /**
   * Amends a self-employment periodic summary via PUT.
   * @param nino - The taxpayer's National Insurance number.
   * @param businessId - HMRC income source identifier.
   * @param taxYear - HMRC tax year string, e.g. `'2024-25'`.
   * @param submissionId - HMRC submission identifier to amend.
   * @param accessToken - A valid HMRC OAuth access token.
   * @param income - Updated income figures.
   * @param expenses - Updated allowable expense figures.
   * @param disallowable - Updated non-allowable expense portions.
   * @throws `HttpErrorResponse` if the API call fails.
   */
  async amendSelfEmployment(
    nino: string,
    businessId: string,
    taxYear: string,
    submissionId: string,
    accessToken: string,
    income: SelfEmploymentIncome,
    expenses: SelfEmploymentExpenses,
    disallowable: SelfEmploymentDisallowableExpenses,
  ): Promise<void> {
    const body = {
      periodIncome: omitNulls(income),
      periodExpenses: omitNulls(expenses),
      periodDisallowableExpenses: omitNulls(disallowable),
    };
    await this.api.put<void>(
      `/individuals/self-employment/income-summary/${nino}/${taxYear}/${businessId}/${submissionId}`,
      body,
      accessToken,
      '3.0',
    );
  }

  /**
   * Amends a UK property periodic summary via PUT.
   * @param nino - The taxpayer's National Insurance number.
   * @param businessId - HMRC income source identifier.
   * @param taxYear - HMRC tax year string, e.g. `'2024-25'`.
   * @param submissionId - HMRC submission identifier to amend.
   * @param periodStartDate - ISO start date of the period.
   * @param periodEndDate - ISO end date of the period.
   * @param accessToken - A valid HMRC OAuth access token.
   * @param income - Updated income figures.
   * @param expenses - Updated expense figures.
   * @throws `HttpErrorResponse` if the API call fails.
   */
  async amendUkProperty(
    nino: string,
    businessId: string,
    taxYear: string,
    submissionId: string,
    periodStartDate: string,
    periodEndDate: string,
    accessToken: string,
    income: UkPropertyIncome,
    expenses: UkPropertyExpenses,
  ): Promise<void> {
    const body = buildPropertyBody(periodStartDate, periodEndDate, income, expenses);
    await this.api.put<void>(
      `/individuals/business/property/uk/${nino}/${taxYear}/${businessId}/period/${submissionId}`,
      body,
      accessToken,
      '4.0',
    );
  }

  /**
   * Amends a foreign property periodic summary via PUT.
   * @param nino - The taxpayer's National Insurance number.
   * @param businessId - HMRC income source identifier.
   * @param taxYear - HMRC tax year string, e.g. `'2024-25'`.
   * @param submissionId - HMRC submission identifier to amend.
   * @param periodStartDate - ISO start date of the period.
   * @param periodEndDate - ISO end date of the period.
   * @param accessToken - A valid HMRC OAuth access token.
   * @param income - Updated income figures.
   * @param expenses - Updated expense figures.
   * @throws `HttpErrorResponse` if the API call fails.
   */
  async amendForeignProperty(
    nino: string,
    businessId: string,
    taxYear: string,
    submissionId: string,
    periodStartDate: string,
    periodEndDate: string,
    accessToken: string,
    income: ForeignPropertyIncome,
    expenses: ForeignPropertyExpenses,
  ): Promise<void> {
    const body = buildForeignPropertyBody(periodStartDate, periodEndDate, income, expenses);
    await this.api.put<void>(
      `/individuals/business/property/foreign/${nino}/${taxYear}/${businessId}/period/${submissionId}`,
      body,
      accessToken,
      '6.0',
    );
  }

  /**
   * Persists a draft to localStorage so it survives navigation away.
   * @param draft - The draft to save.
   */
  saveDraft(draft: QuarterlyDraft): void {
    const key = DRAFT_KEY_PREFIX + draftKey(draft.businessId, draft.periodStartDate);
    localStorage.setItem(key, JSON.stringify(draft));
  }

  /**
   * Loads all quarterly drafts previously saved to localStorage.
   * @returns A record keyed by {@link draftKey}, containing each persisted draft.
   */
  loadAllDrafts(): Record<string, QuarterlyDraft> {
    const result: Record<string, QuarterlyDraft> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i);
      if (!storageKey?.startsWith(DRAFT_KEY_PREFIX)) continue;
      try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) continue;
        const draft = JSON.parse(raw) as QuarterlyDraft;
        result[draftKey(draft.businessId, draft.periodStartDate)] = draft;
      } catch {
        // Skip malformed entries silently.
      }
    }
    return result;
  }
}

/**
 * Builds the request body for the SE Business API periodic summary endpoint.
 * Omits `null` fields so the HMRC API doesn't receive unexpected nulls.
 */
function buildSEBody(
  periodStartDate: string,
  periodEndDate: string,
  income: SelfEmploymentIncome,
  expenses: SelfEmploymentExpenses,
  disallowable: SelfEmploymentDisallowableExpenses,
): object {
  return {
    periodDates: { periodStartDate, periodEndDate },
    periodIncome: omitNulls(income),
    periodExpenses: omitNulls(expenses),
    periodDisallowableExpenses: omitNulls(disallowable),
  };
}

/**
 * Builds the request body for the Property Business API periodic summary endpoint.
 * Omits `null` fields so the HMRC API doesn't receive unexpected nulls.
 */
function buildPropertyBody(
  fromDate: string,
  toDate: string,
  income: UkPropertyIncome,
  expenses: UkPropertyExpenses,
): object {
  const { rentAmount, rentTaxDeducted, ...restIncome } = income;
  const incomeBody: Record<string, unknown> = { ...omitNulls(restIncome) };
  if (rentAmount !== null || rentTaxDeducted !== null) {
    incomeBody['rentIncome'] = omitNulls({ amount: rentAmount, taxDeducted: rentTaxDeducted });
  }
  return {
    fromDate,
    toDate,
    income: incomeBody,
    expenses: omitNulls(expenses),
  };
}

/**
 * Builds the request body for the Foreign Property Business API periodic summary endpoint.
 * The income is wrapped in a per-country array as required by the HMRC API.
 * Omits `null` fields so the HMRC API doesn't receive unexpected nulls.
 */
function buildForeignPropertyBody(
  fromDate: string,
  toDate: string,
  income: ForeignPropertyIncome,
  expenses: ForeignPropertyExpenses,
): object {
  const incomeBody: Record<string, unknown> = {
    foreignTaxCreditRelief: income.foreignTaxCreditRelief,
  };
  if (income.rentIncome !== null) {
    incomeBody['rentIncome'] = { rentAmount: income.rentIncome };
  }
  if (income.premiumsOfLeaseGrant !== null) incomeBody['premiumsOfLeaseGrant'] = income.premiumsOfLeaseGrant;
  if (income.otherPropertyIncome !== null) incomeBody['otherPropertyIncome'] = income.otherPropertyIncome;
  if (income.foreignTaxPaidOrDeducted !== null) incomeBody['foreignTaxPaidOrDeducted'] = income.foreignTaxPaidOrDeducted;
  if (income.specialWithholdingTaxOrUkTaxPaid !== null) incomeBody['specialWithholdingTaxOrUkTaxPaid'] = income.specialWithholdingTaxOrUkTaxPaid;

  const countryEntry: Record<string, unknown> = {
    countryCode: income.countryCode,
    income: incomeBody,
  };
  const expensesBody = omitNulls(expenses);
  if (Object.keys(expensesBody).length > 0) {
    countryEntry['expenses'] = expensesBody;
  }
  return { fromDate, toDate, foreignProperty: [countryEntry] };
}

/** Removes keys whose value is `null` from an object. */
function omitNulls<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== null),
  ) as Partial<T>;
}

/**
 * Converts an object of optional numbers to one where absent keys become `null`.
 * Used to map partial HMRC API response fields to the app's nullable model types.
 */
function nullify<T extends object>(obj: T): { [K in keyof T]: T[K] | null } {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, v ?? null]),
  ) as { [K in keyof T]: T[K] | null };
}
