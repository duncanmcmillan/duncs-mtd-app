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
          } catch (e: unknown) {
            applyToDraft(key, () => ({
              status: 'error',
              error: extractErrorMessage(e, 'Submission failed — please try again'),
            }));
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
            confirmed: false, lastSaved: null, submissionId: null, status: 'draft', error: null,
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
            confirmed: false, lastSaved: null, submissionId: null, status: 'draft', error: null,
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
            confirmed: false, lastSaved: null, submissionId: null, status: 'draft', error: null,
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
      };
    },
  ),
);

// ─── Private helpers ────────────────────────────────────────────────────────

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
