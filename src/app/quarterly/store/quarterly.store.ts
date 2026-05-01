/**
 * @fileoverview NgRx Signal Store for the Quarterly Update feature.
 * Manages draft state for each open obligation period, coordinates
 * API submissions via {@link QuarterlyService}, and persists drafts
 * to localStorage between sessions.
 */
import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { BusinessSourceItem } from '../../core';
import { AppStore, extractErrorMessage } from '../../core';
import { BusinessSourcesStore } from '../../business-sources';
import { ObligationRow, ObligationsStore } from '../../obligations';
import { QuarterlyService } from '../service/quarterly.service';
import { DataEntryStore } from '../../data-entry';
import { ExcelService } from '../../data-entry/service/data-entry/excel.service';
import { AirtableService } from '../../data-entry/service/data-entry/airtable.service';
import { GoogleSheetsService } from '../../data-entry/service/data-entry/google-sheets.service';
import { TelegramService } from '../../data-entry/service/notifications/telegram.service';
import { WhatsAppService } from '../../data-entry/service/notifications/whatsapp.service';
import {
  ForeignPropertyExpenses,
  ForeignPropertyIncome,
  QuarterlyDraft,
  QuarterlyState,
  SelfEmploymentDisallowableExpenses,
  SelfEmploymentExpenses,
  SelfEmploymentIncome,
  UkPropertyExpenses,
  UkPropertyIncome,
  draftKey,
  emptyForeignPropExpenses,
  emptyForeignPropIncome,
  emptyPropExpenses,
  emptyPropIncome,
  emptySEDisallowable,
  emptySEExpenses,
  emptySEIncome,
  taxYearFromPeriodStart,
} from '../model/quarterly.model';

const initialState: QuarterlyState = {
  isLoading: false,
  error: null,
  drafts: {},
  activeExpensesModalKey: null,
};

/**
 * Signal store for the Quarterly Update tab.
 * One draft is created per open obligation period per income source.
 */
export const QuarterlyStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    /** `true` when the store holds a global error message. */
    hasError: computed(() => !!store.error()),
    /** All drafts as a sorted array (by period start date, ascending). */
    draftList: computed((): QuarterlyDraft[] =>
      Object.values(store.drafts()).sort((a, b) =>
        a.periodStartDate.localeCompare(b.periodStartDate),
      ),
    ),
    /** The draft whose expenses modal is currently open, or `null`. */
    activeExpensesDraft: computed((): QuarterlyDraft | null => {
      const key = store.activeExpensesModalKey();
      if (!key) return null;
      return store.drafts()[key] ?? null;
    }),
  })),
  withMethods(
    (
      store,
      service = inject(QuarterlyService),
      appStore = inject(AppStore),
      bizStore = inject(BusinessSourcesStore),
      obligationsStore = inject(ObligationsStore),
      excelService = inject(ExcelService),
      airtableService = inject(AirtableService),
      googleSheetsService = inject(GoogleSheetsService),
      deStore = inject(DataEntryStore),
      telegramService = inject(TelegramService),
      whatsappService = inject(WhatsAppService),
    ) => {
      /** Applies a partial update to a single draft without touching others. */
      function applyToDraft(
        key: string,
        updater: (draft: QuarterlyDraft) => Partial<QuarterlyDraft>,
      ): void {
        const drafts = store.drafts();
        const draft = drafts[key];
        if (!draft) return;
        patchState(store, { drafts: { ...drafts, [key]: { ...draft, ...updater(draft) } } });
      }

      /**
       * Fires notifications to all enabled channels.
       * Uses Promise.allSettled so one channel failure never blocks the other.
       * @param message The formatted text to send.
       */
      async function sendNotifications(message: string): Promise<void> {
        const notif = deStore.notifications();
        await Promise.allSettled([
          notif.telegramEnabled && notif.telegram
            ? telegramService.sendMessage(notif.telegram, message)
            : Promise.resolve(),
          notif.whatsappEnabled && notif.whatsapp
            ? whatsappService.sendMessage(notif.whatsapp, message)
            : Promise.resolve(),
        ]);
      }

      return {
        /**
         * Loads business sources and obligations if not already fetched, then
         * builds one draft per open obligation period from persisted + fresh data.
         * No-op when the user is not authenticated.
         */
        async init(): Promise<void> {
          const token = appStore.accessToken();
          const nino = appStore.nino();
          if (!token || !nino) {
            patchState(store, { isLoading: false });
            return;
          }

          patchState(store, { isLoading: true, error: null });
          try {
            if (!bizStore.businesses()) {
              await bizStore.loadBusinessSources();
            }
            if (!obligationsStore.rawResponse()) {
              await obligationsStore.loadObligations();
            }

            const businesses = bizStore.businesses() ?? [];
            const savedDrafts = service.loadAllDrafts();

            // Build one draft per open obligation, merging with any saved draft.
            const drafts: Record<string, QuarterlyDraft> = {};
            for (const row of obligationsStore.obligationRows()) {
              if (row.status !== 'open') continue;
              const bid = row.businessId ?? '';
              if (!bid) continue;
              const biz = businesses.find(b => b.businessId === bid);
              if (!biz) continue;
              const key = draftKey(bid, row.periodStartDate);
              drafts[key] = savedDrafts[key] ?? buildEmptyDraft(biz, row);
            }

            patchState(store, { drafts, isLoading: false });
          } catch (e: unknown) {
            patchState(store, {
              error: extractErrorMessage(e, 'Failed to initialise quarterly update'),
              isLoading: false,
            });
          }
        },

        /**
         * Patches income fields for a self-employment draft.
         * @param key - Draft key from {@link draftKey}.
         * @param patch - Partial income fields to apply.
         */
        patchSEIncome(key: string, patch: Partial<SelfEmploymentIncome>): void {
          applyToDraft(key, draft => ({
            seIncome: { ...draft.seIncome, ...patch },
            status: draft.status === 'submitted' ? draft.status : 'draft',
          }));
        },

        /**
         * Patches allowable expense fields for a self-employment draft.
         * @param key - Draft key from {@link draftKey}.
         * @param patch - Partial expense fields to apply.
         */
        patchSEExpenses(key: string, patch: Partial<SelfEmploymentExpenses>): void {
          applyToDraft(key, draft => ({
            seExpenses: { ...draft.seExpenses, ...patch },
            status: draft.status === 'submitted' ? draft.status : 'draft',
          }));
        },

        /**
         * Patches non-allowable expense fields for a self-employment draft.
         * @param key - Draft key from {@link draftKey}.
         * @param patch - Partial disallowable expense fields to apply.
         */
        patchSEDisallowable(key: string, patch: Partial<SelfEmploymentDisallowableExpenses>): void {
          applyToDraft(key, draft => ({
            seDisallowableExpenses: { ...draft.seDisallowableExpenses, ...patch },
            status: draft.status === 'submitted' ? draft.status : 'draft',
          }));
        },

        /**
         * Patches income fields for a UK property draft.
         * @param key - Draft key from {@link draftKey}.
         * @param patch - Partial property income fields to apply.
         */
        patchPropIncome(key: string, patch: Partial<UkPropertyIncome>): void {
          applyToDraft(key, draft => ({
            propIncome: { ...draft.propIncome, ...patch },
            status: draft.status === 'submitted' ? draft.status : 'draft',
          }));
        },

        /**
         * Patches expense fields for a UK property draft.
         * @param key - Draft key from {@link draftKey}.
         * @param patch - Partial property expense fields to apply.
         */
        patchPropExpenses(key: string, patch: Partial<UkPropertyExpenses>): void {
          applyToDraft(key, draft => ({
            propExpenses: { ...draft.propExpenses, ...patch },
            status: draft.status === 'submitted' ? draft.status : 'draft',
          }));
        },

        /**
         * Patches income fields for a foreign property draft.
         * @param key - Draft key from {@link draftKey}.
         * @param patch - Partial foreign property income fields to apply.
         */
        patchForeignPropIncome(key: string, patch: Partial<ForeignPropertyIncome>): void {
          applyToDraft(key, draft => ({
            foreignPropIncome: { ...draft.foreignPropIncome, ...patch },
            status: draft.status === 'submitted' ? draft.status : 'draft',
          }));
        },

        /**
         * Patches expense fields for a foreign property draft.
         * @param key - Draft key from {@link draftKey}.
         * @param patch - Partial foreign property expense fields to apply.
         */
        patchForeignPropExpenses(key: string, patch: Partial<ForeignPropertyExpenses>): void {
          applyToDraft(key, draft => ({
            foreignPropExpenses: { ...draft.foreignPropExpenses, ...patch },
            status: draft.status === 'submitted' ? draft.status : 'draft',
          }));
        },

        /**
         * Sets the confirmation checkbox state for a draft.
         * @param key - Draft key from {@link draftKey}.
         * @param confirmed - Whether the user has confirmed the figures.
         */
        setConfirmed(key: string, confirmed: boolean): void {
          applyToDraft(key, () => ({ confirmed }));
        },

        /**
         * Persists the current draft state to localStorage and updates `lastSaved`.
         * @param key - Draft key from {@link draftKey}.
         */
        saveDraft(key: string): void {
          const draft = store.drafts()[key];
          if (!draft) return;
          const updated: QuarterlyDraft = { ...draft, lastSaved: new Date().toISOString() };
          patchState(store, { drafts: { ...store.drafts(), [key]: updated } });
          service.saveDraft(updated);
        },

        /**
         * Submits a draft to HMRC and updates the draft status on success or failure.
         * Fires notifications to all enabled channels after the outcome is known.
         * @param key - Draft key from {@link draftKey}.
         */
        async submitDraft(key: string): Promise<void> {
          const draft = store.drafts()[key];
          const token = appStore.accessToken();
          const nino = appStore.nino();
          if (!draft || !token || !nino) return;

          applyToDraft(key, () => ({ status: 'submitting', error: null }));
          try {
            let submissionId: string;
            if (draft.businessType === 'self-employment') {
              submissionId = await service.submitSelfEmployment(
                nino, draft.businessId, draft.taxYear,
                draft.periodStartDate, draft.periodEndDate, token,
                draft.seIncome, draft.seExpenses, draft.seDisallowableExpenses,
              );
            } else if (draft.businessType === 'foreign-property') {
              submissionId = await service.submitForeignProperty(
                nino, draft.businessId, draft.taxYear,
                draft.periodStartDate, draft.periodEndDate, token,
                draft.foreignPropIncome, draft.foreignPropExpenses,
              );
            } else {
              submissionId = await service.submitUkProperty(
                nino, draft.businessId, draft.taxYear,
                draft.periodStartDate, draft.periodEndDate, token,
                draft.propIncome, draft.propExpenses,
              );
            }
            const submitted: Partial<QuarterlyDraft> = {
              status: 'submitted',
              submissionId,
              lastSaved: new Date().toISOString(),
              error: null,
            };
            applyToDraft(key, () => submitted);
            service.saveDraft({ ...store.drafts()[key] });
            // Best-effort: refresh so the Obligations tab reflects the fulfilled status.
            void obligationsStore.loadObligations();
            void sendNotifications(buildMessage(draft, 'ok', submissionId));
          } catch (e: unknown) {
            const errMsg = extractErrorMessage(e, 'Submission failed — please try again');
            applyToDraft(key, () => ({
              status: 'error',
              error: errMsg,
            }));
            void sendNotifications(buildMessage(draft, 'fail', undefined, errMsg));
          }
        },

        /**
         * Opens the expenses detail modal for the given draft.
         * @param key - Draft key from {@link draftKey}.
         */
        openExpensesModal(key: string): void {
          patchState(store, { activeExpensesModalKey: key });
        },

        /** Closes the expenses detail modal. */
        closeExpensesModal(): void {
          patchState(store, { activeExpensesModalKey: null });
        },

        /**
         * Loads synthetic test drafts for UI development without authentication.
         * Creates one self-employment, one UK property, and one foreign property
         * draft with realistic figures so the full UI can be exercised in browser mode.
         */
        seedTestDrafts(): void {
          // ── Q1: Apr 6 – Jul 5 2024 ──────────────────────────────────────
          const seQ1Key   = draftKey('test-biz-se',   '2024-04-06');
          const propQ1Key = draftKey('test-biz-prop', '2024-04-06');
          const fpQ1Key   = draftKey('test-biz-fp',   '2024-04-06');

          // Q1 drafts are seeded as already-submitted so the in-year calc prompt is visible.
          const seQ1Draft: QuarterlyDraft = {
            businessId: 'test-biz-se', businessName: 'Test Shop',
            businessType: 'self-employment',
            periodStartDate: '2024-04-06', periodEndDate: '2024-07-05',
            dueDate: '2024-08-07', taxYear: '2024-25',
            seIncome: { turnover: 18450, other: null },
            seExpenses: { ...emptySEExpenses(), costOfGoods: 3200, wagesAndStaffCosts: 1500, carVanTravelExpenses: 530.50 },
            seDisallowableExpenses: emptySEDisallowable(),
            propIncome: emptyPropIncome(), propExpenses: emptyPropExpenses(),
            foreignPropIncome: emptyForeignPropIncome(), foreignPropExpenses: emptyForeignPropExpenses(),
            confirmed: true, lastSaved: '2024-08-01T10:00:00.000Z',
            submissionId: 'sub-se-q1-test', status: 'submitted', error: null,
          };

          const propQ1Draft: QuarterlyDraft = {
            businessId: 'test-biz-prop', businessName: 'UK Rental Property',
            businessType: 'uk-property',
            periodStartDate: '2024-04-06', periodEndDate: '2024-07-05',
            dueDate: '2024-08-07', taxYear: '2024-25',
            seIncome: emptySEIncome(), seExpenses: emptySEExpenses(), seDisallowableExpenses: emptySEDisallowable(),
            propIncome: { rentAmount: 4800, rentTaxDeducted: null, premiumsOfLeaseGrant: null, reversePremiums: null, otherIncome: null },
            propExpenses: { ...emptyPropExpenses(), premisesRunningCosts: 350, repairsAndMaintenance: 120 },
            foreignPropIncome: emptyForeignPropIncome(), foreignPropExpenses: emptyForeignPropExpenses(),
            confirmed: true, lastSaved: '2024-08-01T10:05:00.000Z',
            submissionId: 'sub-prop-q1-test', status: 'submitted', error: null,
          };

          const fpQ1Draft: QuarterlyDraft = {
            businessId: 'test-biz-fp', businessName: 'French Apartment',
            businessType: 'foreign-property',
            periodStartDate: '2024-04-06', periodEndDate: '2024-07-05',
            dueDate: '2024-08-07', taxYear: '2024-25',
            seIncome: emptySEIncome(), seExpenses: emptySEExpenses(), seDisallowableExpenses: emptySEDisallowable(),
            propIncome: emptyPropIncome(), propExpenses: emptyPropExpenses(),
            foreignPropIncome: {
              countryCode: 'FRA', rentIncome: 3200, foreignTaxCreditRelief: false,
              premiumsOfLeaseGrant: null, otherPropertyIncome: null,
              foreignTaxPaidOrDeducted: 240, specialWithholdingTaxOrUkTaxPaid: null,
            },
            foreignPropExpenses: { ...emptyForeignPropExpenses(), premisesRunningCosts: 280, repairsAndMaintenance: 95 },
            confirmed: true, lastSaved: '2024-08-01T10:10:00.000Z',
            submissionId: 'sub-fp-q1-test', status: 'submitted', error: null,
          };

          // ── Q2: Jul 6 – Oct 5 2024 ──────────────────────────────────────
          const seQ2Key   = draftKey('test-biz-se',   '2024-07-06');
          const propQ2Key = draftKey('test-biz-prop', '2024-07-06');
          const fpQ2Key   = draftKey('test-biz-fp',   '2024-07-06');

          const seQ2Draft: QuarterlyDraft = {
            businessId: 'test-biz-se', businessName: 'Test Shop',
            businessType: 'self-employment',
            periodStartDate: '2024-07-06', periodEndDate: '2024-10-05',
            dueDate: '2024-11-07', taxYear: '2024-25',
            seIncome: { turnover: 21300, other: null },
            seExpenses: { ...emptySEExpenses(), costOfGoods: 4100, wagesAndStaffCosts: 1500, adminCosts: 310 },
            seDisallowableExpenses: emptySEDisallowable(),
            propIncome: emptyPropIncome(), propExpenses: emptyPropExpenses(),
            foreignPropIncome: emptyForeignPropIncome(), foreignPropExpenses: emptyForeignPropExpenses(),
            confirmed: false, lastSaved: null, submissionId: null, status: 'draft', error: null,
          };

          const propQ2Draft: QuarterlyDraft = {
            businessId: 'test-biz-prop', businessName: 'UK Rental Property',
            businessType: 'uk-property',
            periodStartDate: '2024-07-06', periodEndDate: '2024-10-05',
            dueDate: '2024-11-07', taxYear: '2024-25',
            seIncome: emptySEIncome(), seExpenses: emptySEExpenses(), seDisallowableExpenses: emptySEDisallowable(),
            propIncome: { rentAmount: 4800, rentTaxDeducted: null, premiumsOfLeaseGrant: null, reversePremiums: null, otherIncome: null },
            propExpenses: { ...emptyPropExpenses(), premisesRunningCosts: 350, repairsAndMaintenance: 85 },
            foreignPropIncome: emptyForeignPropIncome(), foreignPropExpenses: emptyForeignPropExpenses(),
            confirmed: false, lastSaved: null, submissionId: null, status: 'draft', error: null,
          };

          const fpQ2Draft: QuarterlyDraft = {
            businessId: 'test-biz-fp', businessName: 'French Apartment',
            businessType: 'foreign-property',
            periodStartDate: '2024-07-06', periodEndDate: '2024-10-05',
            dueDate: '2024-11-07', taxYear: '2024-25',
            seIncome: emptySEIncome(), seExpenses: emptySEExpenses(), seDisallowableExpenses: emptySEDisallowable(),
            propIncome: emptyPropIncome(), propExpenses: emptyPropExpenses(),
            foreignPropIncome: {
              countryCode: 'FRA', rentIncome: 3200, foreignTaxCreditRelief: false,
              premiumsOfLeaseGrant: null, otherPropertyIncome: null,
              foreignTaxPaidOrDeducted: 195, specialWithholdingTaxOrUkTaxPaid: null,
            },
            foreignPropExpenses: { ...emptyForeignPropExpenses(), premisesRunningCosts: 280, repairsAndMaintenance: 110 },
            confirmed: false, lastSaved: null, submissionId: null, status: 'draft', error: null,
          };

          patchState(store, {
            drafts: {
              [seQ1Key]: seQ1Draft, [propQ1Key]: propQ1Draft, [fpQ1Key]: fpQ1Draft,
              [seQ2Key]: seQ2Draft, [propQ2Key]: propQ2Draft, [fpQ2Key]: fpQ2Draft,
            },
            error: null,
          });
        },

        /**
         * Pre-fills the given draft with figures read from the active data source
         * (Local Excel or AirTable). Values populate the form but remain editable.
         * Excel takes priority when both are enabled.
         * @param draft - The draft to pre-fill.
         * @returns A promise that resolves when the pre-fill is complete.
         */
        async prefillFromSource(draft: QuarterlyDraft): Promise<void> {
          const de = deStore.dataEntry();
          let valuesPromise: Promise<Record<string, number | null>> | null = null;

          if (de.excelEnabled && de.excel) {
            const { filePath, dateColumn, fieldMappings } = de.excel;
            const sheetName =
              draft.businessType === 'self-employment' ? de.excel.selfEmploymentSheet
              : draft.businessType === 'uk-property'   ? de.excel.ukPropertySheet
              : de.excel.foreignPropertySheet;
            if (filePath && sheetName && dateColumn) {
              valuesPromise = excelService.readRow({ filePath, sheetName, dateColumn, periodEndDate: draft.periodEndDate, fieldMappings });
            }
          } else if (de.airtableEnabled && de.airtable) {
            const { apiKey, baseId, dateColumn, fieldMappings } = de.airtable;
            const tableName =
              draft.businessType === 'self-employment' ? de.airtable.selfEmploymentTable
              : draft.businessType === 'uk-property'   ? de.airtable.ukPropertyTable
              : de.airtable.foreignPropertyTable;
            if (apiKey && baseId && tableName && dateColumn) {
              valuesPromise = airtableService.readRow({ apiKey, baseId, tableId: tableName, dateColumn, periodEndDate: draft.periodEndDate, fieldMappings });
            }
          } else if (de.googleSheetsEnabled && de.googleSheets) {
            const { spreadsheetId, apiKey, dateColumn, fieldMappings } = de.googleSheets;
            const sheetName =
              draft.businessType === 'self-employment' ? de.googleSheets.selfEmploymentSheet
              : draft.businessType === 'uk-property'   ? de.googleSheets.ukPropertySheet
              : de.googleSheets.foreignPropertySheet;
            if (spreadsheetId && apiKey && sheetName && dateColumn) {
              valuesPromise = googleSheetsService.readRow({ spreadsheetId, sheetName, apiKey, dateColumn, periodEndDate: draft.periodEndDate, fieldMappings });
            }
          }

          if (!valuesPromise) return;

          patchState(store, { isLoading: true, error: null });
          try {
            const values = await valuesPromise;
            const key = draftKey(draft.businessId, draft.periodStartDate);
            applyMappedValues(key, values, draft.businessType, applyToDraft);
            patchState(store, { isLoading: false });
          } catch (e: unknown) {
            patchState(store, { isLoading: false, error: extractErrorMessage(e, 'Failed to read data source') });
          }
        },
      };
    },
  ),
);

// ─── Private helpers ────────────────────────────────────────────────────────

/**
 * Formats an ISO date string as a short UK date without year (e.g. "6 Apr").
 * @param iso - ISO date string (YYYY-MM-DD).
 */
function fmtDateShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/**
 * Derives the quarter label (Q1–Q4) from the period start month.
 * The UK tax year begins in April: Q1=Apr, Q2=Jul, Q3=Oct, Q4=Jan.
 * @param periodStartDate - ISO date string (YYYY-MM-DD).
 */
function quarterLabel(periodStartDate: string): string {
  const month = new Date(periodStartDate).getMonth(); // 0=Jan
  if (month === 3)  return 'Q1'; // Apr
  if (month === 6)  return 'Q2'; // Jul
  if (month === 9)  return 'Q3'; // Oct
  if (month === 0)  return 'Q4'; // Jan
  return 'Q?';
}

/**
 * Derives the Final Declaration deadline date string from the HMRC tax year string.
 * For tax year "2024-25" the deadline is 31 Jan 2026.
 * @param taxYear - HMRC tax year string e.g. `'2024-25'`.
 */
function finalDeclDeadline(taxYear: string): string {
  const endYear = parseInt(taxYear.split('-')[0], 10) + 1;
  return `31 Jan ${endYear + 1}`;
}

/**
 * Formats a number as a GBP amount with two decimal places and comma separators.
 * @param n - The number to format.
 */
function fmt(n: number): string {
  return n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Sums all SE expense fields, treating `null` as zero.
 * @param d - The quarterly draft.
 */
function totalSEExp(d: QuarterlyDraft): number {
  const e = d.seExpenses;
  return [
    e.costOfGoods, e.paymentsToSubcontractors, e.wagesAndStaffCosts, e.carVanTravelExpenses,
    e.premisesRunningCosts, e.maintenanceCosts, e.adminCosts, e.businessEntertainmentCosts,
    e.advertisingCosts, e.interestOnBankOtherLoans, e.financeCharges, e.irrecoverableDebts,
    e.professionalFees, e.depreciation, e.otherExpenses, e.consolidatedExpenses,
  ].reduce<number>((sum, v) => sum + (v ?? 0), 0);
}

/**
 * Sums all UK property expense fields, treating `null` as zero.
 * @param d - The quarterly draft.
 */
function totalPropExp(d: QuarterlyDraft): number {
  const e = d.propExpenses;
  return [
    e.premisesRunningCosts, e.repairsAndMaintenance, e.financialCosts, e.professionalFees,
    e.costOfServices, e.travelCosts, e.residentialFinancialCost,
    e.broughtFwdResidentialFinancialCost, e.other, e.consolidatedExpenses,
  ].reduce<number>((sum, v) => sum + (v ?? 0), 0);
}

/**
 * Sums all foreign property expense fields, treating `null` as zero.
 * @param d - The quarterly draft.
 */
function totalFPropExp(d: QuarterlyDraft): number {
  const e = d.foreignPropExpenses;
  return [
    e.premisesRunningCosts, e.repairsAndMaintenance, e.financialCosts, e.professionalFees,
    e.costOfServices, e.travelCosts, e.other, e.consolidatedExpenses,
  ].reduce<number>((sum, v) => sum + (v ?? 0), 0);
}

/**
 * Builds a formatted notification message for a submission outcome.
 * @param draft - The draft that was submitted.
 * @param outcome - `'ok'` for success, `'fail'` for failure.
 * @param submissionId - HMRC submission ID (success only).
 * @param errorMsg - Error description (failure only).
 */
function buildMessage(
  draft: QuarterlyDraft,
  outcome: 'ok' | 'fail',
  submissionId?: string,
  errorMsg?: string,
): string {
  const typeLabel =
    draft.businessType === 'self-employment' ? 'Self Employment'
    : draft.businessType === 'uk-property'   ? 'UK Property'
    : 'Foreign Property';
  const q       = quarterLabel(draft.periodStartDate);
  const period  = `${q}: ${fmtDateShort(draft.periodStartDate)} – ${fmtDateShort(draft.periodEndDate)} ${new Date(draft.periodEndDate).getFullYear()}`;
  const deadline = finalDeclDeadline(draft.taxYear);

  if (outcome === 'ok') {
    let income: number;
    let expenses: number;
    if (draft.businessType === 'self-employment') {
      income   = (draft.seIncome.turnover ?? 0) + (draft.seIncome.other ?? 0);
      expenses = totalSEExp(draft);
    } else if (draft.businessType === 'uk-property') {
      income   = (draft.propIncome.rentAmount ?? 0) + (draft.propIncome.otherIncome ?? 0);
      expenses = totalPropExp(draft);
    } else {
      income   = (draft.foreignPropIncome.rentIncome ?? 0) + (draft.foreignPropIncome.otherPropertyIncome ?? 0);
      expenses = totalFPropExp(draft);
    }
    const profit = income - expenses;

    return [
      `✅ MTD Quarterly Submitted`,
      ``,
      `${draft.businessName} — ${typeLabel}`,
      `${period}`,
      ``,
      `Income:   £${fmt(income)}`,
      `Expenses: £${fmt(expenses)}`,
      `Profit:   £${fmt(profit)}`,
      ``,
      `Submission: ${submissionId ?? ''}`,
      ``,
      `Figures can be amended before your Final Declaration, due ${deadline}.`,
    ].join('\n');
  }

  return [
    `❌ MTD Quarterly Submission Failed`,
    ``,
    `${draft.businessName} — ${typeLabel}`,
    `${period}`,
    ``,
    `Error: ${errorMsg ?? 'Unknown error'}`,
    ``,
    `Please correct and resubmit in the app.`,
  ].join('\n');
}

/**
 * Dispatches a map of field-key → value into the correct draft patch calls
 * based on the field key prefix (`se`, `ukprop`, `fprop`) and business type.
 * @param key - Draft key from {@link draftKey}.
 * @param values - Field-key → numeric value map from ExcelService or AirtableService.
 * @param businessType - The draft's business type.
 * @param apply - The `applyToDraft` closure from the enclosing `withMethods` block.
 */
function applyMappedValues(
  key: string,
  values: Record<string, number | null>,
  businessType: 'self-employment' | 'uk-property' | 'foreign-property',
  apply: (key: string, updater: (d: QuarterlyDraft) => Partial<QuarterlyDraft>) => void,
): void {
  const seIncomePatch: Partial<SelfEmploymentIncome> = {};
  const seExpPatch: Partial<SelfEmploymentExpenses> = {};
  const seDisPatch: Partial<SelfEmploymentDisallowableExpenses> = {};
  const propIncomePatch: Partial<UkPropertyIncome> = {};
  const propExpPatch: Partial<UkPropertyExpenses> = {};
  const fpropIncomePatch: Partial<ForeignPropertyIncome> = {};
  const fpropExpPatch: Partial<ForeignPropertyExpenses> = {};

  for (const [fieldKey, value] of Object.entries(values)) {
    const [prefix, category, field] = fieldKey.split('.');
    if (!field) continue;
    if (prefix === 'se' && category === 'income')          (seIncomePatch as Record<string, unknown>)[field] = value;
    else if (prefix === 'se' && category === 'exp')        (seExpPatch as Record<string, unknown>)[field] = value;
    else if (prefix === 'se' && category === 'dis')        (seDisPatch as Record<string, unknown>)[field] = value;
    else if (prefix === 'ukprop' && category === 'income') (propIncomePatch as Record<string, unknown>)[field] = value;
    else if (prefix === 'ukprop' && category === 'exp')    (propExpPatch as Record<string, unknown>)[field] = value;
    else if (prefix === 'fprop' && category === 'income')  (fpropIncomePatch as Record<string, unknown>)[field] = value;
    else if (prefix === 'fprop' && category === 'exp')     (fpropExpPatch as Record<string, unknown>)[field] = value;
  }

  if (businessType === 'self-employment') {
    if (Object.keys(seIncomePatch).length)
      apply(key, d => ({ seIncome: { ...d.seIncome, ...seIncomePatch }, status: d.status === 'submitted' ? d.status : 'draft' }));
    if (Object.keys(seExpPatch).length)
      apply(key, d => ({ seExpenses: { ...d.seExpenses, ...seExpPatch }, status: d.status === 'submitted' ? d.status : 'draft' }));
    if (Object.keys(seDisPatch).length)
      apply(key, d => ({ seDisallowableExpenses: { ...d.seDisallowableExpenses, ...seDisPatch }, status: d.status === 'submitted' ? d.status : 'draft' }));
  } else if (businessType === 'uk-property') {
    if (Object.keys(propIncomePatch).length)
      apply(key, d => ({ propIncome: { ...d.propIncome, ...propIncomePatch }, status: d.status === 'submitted' ? d.status : 'draft' }));
    if (Object.keys(propExpPatch).length)
      apply(key, d => ({ propExpenses: { ...d.propExpenses, ...propExpPatch }, status: d.status === 'submitted' ? d.status : 'draft' }));
  } else if (businessType === 'foreign-property') {
    if (Object.keys(fpropIncomePatch).length)
      apply(key, d => ({ foreignPropIncome: { ...d.foreignPropIncome, ...fpropIncomePatch }, status: d.status === 'submitted' ? d.status : 'draft' }));
    if (Object.keys(fpropExpPatch).length)
      apply(key, d => ({ foreignPropExpenses: { ...d.foreignPropExpenses, ...fpropExpPatch }, status: d.status === 'submitted' ? d.status : 'draft' }));
  }
}

/**
 * Creates a blank draft for an income source and open obligation period.
 * @param biz - The income source returned by the Business Details API.
 * @param row - The open obligation row.
 */
function buildEmptyDraft(biz: BusinessSourceItem, row: ObligationRow): QuarterlyDraft {
  const t = biz.typeOfBusiness;
  const businessType: 'self-employment' | 'uk-property' | 'foreign-property' =
    t === 'self-employment' ? 'self-employment'
    : t === 'foreign-property' ? 'foreign-property'
    : 'uk-property';
  const businessName = biz.tradingName
    ?? (businessType === 'self-employment' ? 'Self Employment'
       : businessType === 'foreign-property' ? 'Foreign Property'
       : 'UK Property');
  return {
    businessId: biz.businessId,
    businessName,
    businessType,
    periodStartDate: row.periodStartDate,
    periodEndDate: row.periodEndDate,
    dueDate: row.dueDate,
    taxYear: taxYearFromPeriodStart(row.periodStartDate),
    seIncome: emptySEIncome(),
    seExpenses: emptySEExpenses(),
    seDisallowableExpenses: emptySEDisallowable(),
    propIncome: emptyPropIncome(),
    propExpenses: emptyPropExpenses(),
    foreignPropIncome: emptyForeignPropIncome(),
    foreignPropExpenses: emptyForeignPropExpenses(),
    confirmed: false,
    lastSaved: null,
    submissionId: null,
    status: 'draft',
    error: null,
  };
}
