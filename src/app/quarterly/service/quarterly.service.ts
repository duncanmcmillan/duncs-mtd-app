/**
 * @fileoverview Service for submitting HMRC MTD quarterly updates via the
 * Self Employment Business API v3 and Property Business API v4, and for
 * persisting in-progress drafts to localStorage.
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
  draftKey,
} from '../model/quarterly.model';

/** Response body from the SE Business API periodic summary create/amend endpoint. */
interface SelfEmploymentSubmitResponse {
  /** HMRC-assigned identifier for the submitted periodic summary. */
  submissionId: string;
}

/** Response body from the Property Business API periodic summary create endpoint. */
interface UkPropertySubmitResponse {
  /** HMRC-assigned identifier for the submitted periodic summary. */
  submissionId: string;
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
    const response = await this.api.post<UkPropertySubmitResponse>(
      `/individuals/business/property/uk/${nino}/${taxYear}/${businessId}/period`,
      body,
      accessToken,
      '4.0',
    );
    return response.submissionId;
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

/** Removes keys whose value is `null` from an object. */
function omitNulls<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== null),
  ) as Partial<T>;
}
