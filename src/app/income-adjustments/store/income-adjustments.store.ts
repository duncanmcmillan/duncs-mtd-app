/**
 * @fileoverview NgRx Signal Store for the Income & Adjustments feature.
 * Manages allowances, BSAS adjustments, dividend state, modal visibility, and seed data.
 */
import { computed, inject } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { IncomeAdjustmentsService } from '../service/income-adjustments.service';
import {
  AllowanceEntry,
  AdjustmentEntry,
  DividendEntry,
  ForeignDividend,
  IncomeAdjustmentsState,
} from '../model/income-adjustments.model';
import { AppStore, extractErrorMessage } from '../../core';

const initialState: IncomeAdjustmentsState = {
  isLoading: false,
  error: null,
  allowances: null,
  adjustments: null,
  dividends: null,
  activeAllowancesSource: null,
  activeAdjustmentsSource: null,
  dividendsModalOpen: false,
};

/**
 * Signal store for the Income & Adjustments tab.
 * Holds allowances, BSAS adjustments, dividend declarations, and modal state.
 */
export const IncomeAdjustmentsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    /** `true` when the store holds an error message. */
    hasError: computed(() => !!store.error()),

    /**
     * Unique income source types present in the allowances and adjustments
     * data, preserving insertion order.
     */
    sourceTypes: computed((): string[] => {
      const seen = new Set<string>();
      const sources: string[] = [];
      for (const e of [...(store.allowances() ?? []), ...(store.adjustments() ?? [])]) {
        if (!seen.has(e.typeOfBusiness)) {
          seen.add(e.typeOfBusiness);
          sources.push(e.typeOfBusiness);
        }
      }
      return sources;
    }),

    /** The allowance entry whose edit modal is currently open, or `null`. */
    activeAllowancesEntry: computed((): AllowanceEntry | null => {
      const src = store.activeAllowancesSource();
      if (!src) return null;
      return (store.allowances() ?? []).find(e => e.typeOfBusiness === src) ?? null;
    }),

    /** The adjustment entry whose edit modal is currently open, or `null`. */
    activeAdjustmentsEntry: computed((): AdjustmentEntry | null => {
      const src = store.activeAdjustmentsSource();
      if (!src) return null;
      return (store.adjustments() ?? []).find(e => e.typeOfBusiness === src) ?? null;
    }),
  })),
  withMethods((store, service = inject(IncomeAdjustmentsService), appStore = inject(AppStore)) => ({
    /**
     * Placeholder for future API-backed data load.
     * No-op when the user is not authenticated.
     */
    async loadData(): Promise<void> {
      const token = appStore.accessToken();
      const nino = appStore.nino();
      if (!token || !nino) return;

      patchState(store, { isLoading: true, error: null });
      try {
        // API calls will be added in a future step
        patchState(store, { isLoading: false });
      } catch (e: unknown) {
        patchState(store, {
          error: extractErrorMessage(e, 'Failed to load income adjustments'),
          isLoading: false,
        });
      }
    },

    // ── Allowances submit ──────────────────────────────────────────────────────

    /**
     * Submits annual allowances for the given income source to HMRC.
     * No-op when the user is not authenticated.
     * @param source - The `typeOfBusiness` of the entry to submit.
     */
    async submitAllowances(source: string): Promise<void> {
      const token = appStore.accessToken();
      const nino = appStore.nino();
      if (!token || !nino) return;

      const entry = (store.allowances() ?? []).find(e => e.typeOfBusiness === source);
      if (!entry) return;

      patchState(store, { isLoading: true, error: null });
      try {
        await service.submitAllowances(entry, nino, token);
        patchState(store, { isLoading: false });
      } catch (e: unknown) {
        patchState(store, {
          error: extractErrorMessage(e, 'Failed to submit allowances'),
          isLoading: false,
        });
        throw e;
      }
    },

    // ── BSAS Adjustments submit ────────────────────────────────────────────────

    /**
     * Triggers a BSAS and submits SE accounting adjustments for the given source.
     * If the entry already has a `calculationId`, the trigger step is skipped.
     * No-op when the user is not authenticated.
     * @param source - The `typeOfBusiness` of the entry to submit.
     */
    async submitAdjustments(source: string): Promise<void> {
      const token = appStore.accessToken();
      const nino = appStore.nino();
      if (!token || !nino) return;

      const entry = (store.adjustments() ?? []).find(e => e.typeOfBusiness === source);
      if (!entry) return;

      patchState(store, { isLoading: true, error: null });
      try {
        let calculationId = entry.calculationId;

        if (!calculationId) {
          // Step 22: trigger the BSAS to obtain a calculationId
          calculationId = await service.triggerBsas(entry, nino, token);
          // Persist the calculationId so the user can see it and re-use it
          patchState(store, {
            adjustments: (store.adjustments() ?? []).map(e =>
              e.typeOfBusiness === source ? { ...e, calculationId } : e,
            ),
          });
        }

        // Step 24: submit the accounting adjustments
        const updatedEntry = { ...entry, calculationId };
        await service.submitBsasAdjustments(updatedEntry, nino, token);
        patchState(store, { isLoading: false });
      } catch (e: unknown) {
        patchState(store, {
          error: extractErrorMessage(e, 'Failed to submit BSAS adjustments'),
          isLoading: false,
        });
        throw e;
      }
    },

    // ── Dividends submit ───────────────────────────────────────────────────────

    /**
     * Submits dividend income declarations to HMRC.
     * Calls the UK dividends sub-endpoint and/or the foreign dividends endpoint
     * depending on which fields are populated.
     * No-op when the user is not authenticated.
     */
    async submitDividends(): Promise<void> {
      const token = appStore.accessToken();
      const nino = appStore.nino();
      if (!token || !nino) return;

      const entry = store.dividends();
      if (!entry) return;

      patchState(store, { isLoading: true, error: null });
      try {
        const hasUk = entry.ukDividends != null || entry.otherUkDividends != null;
        const hasForeign = (entry.foreignDividends ?? []).length > 0;

        if (hasUk) await service.submitUkDividends(entry, nino, token);
        if (hasForeign) await service.submitForeignDividends(entry, nino, token);
        patchState(store, { isLoading: false });
      } catch (e: unknown) {
        patchState(store, {
          error: extractErrorMessage(e, 'Failed to submit dividends'),
          isLoading: false,
        });
        throw e;
      }
    },

    // ── Modal open / close ───────────────────────────────────────────────────

    /**
     * Opens the allowances edit modal for the given income source.
     * @param source - The `typeOfBusiness` string.
     */
    openAllowancesModal(source: string): void {
      patchState(store, { activeAllowancesSource: source });
    },

    /** Closes the allowances edit modal. */
    closeAllowancesModal(): void {
      patchState(store, { activeAllowancesSource: null });
    },

    /**
     * Opens the adjustments edit modal for the given income source.
     * @param source - The `typeOfBusiness` string.
     */
    openAdjustmentsModal(source: string): void {
      patchState(store, { activeAdjustmentsSource: source });
    },

    /** Closes the adjustments edit modal. */
    closeAdjustmentsModal(): void {
      patchState(store, { activeAdjustmentsSource: null });
    },

    /** Opens the dividends edit modal. */
    openDividendsModal(): void {
      patchState(store, { dividendsModalOpen: true });
    },

    /** Closes the dividends edit modal. */
    closeDividendsModal(): void {
      patchState(store, { dividendsModalOpen: false });
    },

    // ── Patch methods ────────────────────────────────────────────────────────

    /**
     * Merges a partial update into the allowance entry for the given source.
     * @param source - The `typeOfBusiness` to update.
     * @param patch - Fields to merge.
     */
    patchAllowances(source: string, patch: Partial<AllowanceEntry>): void {
      const current = store.allowances() ?? [];
      patchState(store, {
        allowances: current.map(e => e.typeOfBusiness === source ? { ...e, ...patch } : e),
      });
    },

    /**
     * Merges a partial update into the adjustment entry for the given source.
     * @param source - The `typeOfBusiness` to update.
     * @param patch - Fields to merge.
     */
    patchAdjustments(source: string, patch: Partial<AdjustmentEntry>): void {
      const current = store.adjustments() ?? [];
      patchState(store, {
        adjustments: current.map(e => e.typeOfBusiness === source ? { ...e, ...patch } : e),
      });
    },

    /**
     * Merges a partial update into the dividend entry.
     * @param patch - Fields to merge.
     */
    patchDividends(patch: Partial<DividendEntry>): void {
      const current = store.dividends();
      if (!current) return;
      patchState(store, { dividends: { ...current, ...patch } });
    },

    /**
     * Updates a single foreign dividend row by index.
     * @param index - Zero-based index into the `foreignDividends` array.
     * @param patch - Fields to merge.
     */
    patchForeignDividend(index: number, patch: Partial<ForeignDividend>): void {
      const current = store.dividends();
      if (!current) return;
      const foreignDividends = [...(current.foreignDividends ?? [])];
      foreignDividends[index] = { ...foreignDividends[index], ...patch };
      patchState(store, { dividends: { ...current, foreignDividends } });
    },

    /** Appends an empty foreign dividend row. */
    addForeignDividend(): void {
      const current = store.dividends();
      if (!current) return;
      const foreignDividends = [...(current.foreignDividends ?? []), { countryCode: '', amount: 0 }];
      patchState(store, { dividends: { ...current, foreignDividends } });
    },

    /**
     * Removes the foreign dividend row at the given index.
     * @param index - Zero-based index to remove.
     */
    removeForeignDividend(index: number): void {
      const current = store.dividends();
      if (!current) return;
      const foreignDividends = (current.foreignDividends ?? []).filter((_, i) => i !== index);
      patchState(store, { dividends: { ...current, foreignDividends } });
    },

    // ── Seed data ────────────────────────────────────────────────────────────

    /**
     * Loads synthetic allowances, adjustments, and dividends covering SE
     * for the 2024-25 tax year, for UI development without authentication.
     */
    seedTestData(): void {
      const allowances: AllowanceEntry[] = [
        {
          businessId: 'test-biz-se',
          typeOfBusiness: 'self-employment',
          taxYear: '2024-25',
          annualInvestmentAllowance: 50000,
          capitalAllowanceMainPool: 12500,
          capitalAllowanceSpecialRatePool: 3200,
          zeroEmissionsCarAllowance: 8000,
          businessPremisesRenovationAllowance: 5000,
        },
        {
          businessId: 'test-biz-prop',
          typeOfBusiness: 'uk-property',
          taxYear: '2024-25',
          annualInvestmentAllowance: 10000,
          electricChargePointAllowance: 2500,
          zeroEmissionsGoodsVehicleAllowance: 6000,
          costOfReplacingDomesticItems: 1800,
        },
        {
          businessId: 'test-biz-fp',
          typeOfBusiness: 'foreign-property',
          taxYear: '2024-25',
          annualInvestmentAllowance: 5000,
          otherCapitalAllowance: 1200,
          propertyIncomeAllowance: 1000,
        },
      ];

      const adjustments: AdjustmentEntry[] = [
        {
          businessId: 'test-biz-se',
          typeOfBusiness: 'self-employment',
          taxYear: '2024-25',
          // BSAS income adjustments
          turnover: 500,
          otherIncome: 200,
          // BSAS expense adjustments
          costOfGoods: -150,
          wagesAndStaffCosts: 300,
          professionalFees: -75,
        },
        {
          businessId: 'test-biz-prop',
          typeOfBusiness: 'uk-property',
          taxYear: '2024-25',
          privateUseAdjustment: 1500,
          balancingCharge: 800,
          nonResidentLandlord: false,
          rentARoomJointlyLet: true,
        },
        {
          businessId: 'test-biz-fp',
          typeOfBusiness: 'foreign-property',
          taxYear: '2024-25',
          privateUseAdjustment: 600,
          nonResidentLandlord: true,
        },
      ];

      const dividends: DividendEntry = {
        taxYear: '2024-25',
        ukDividends: 2500,
        otherUkDividends: 800,
        foreignDividends: [
          { countryCode: 'DEU', amount: 300, taxableAmount: 255, taxTakenOff: 45 },
          { countryCode: 'USA', amount: 750, taxableAmount: 638, taxTakenOff: 112 },
        ],
      };

      patchState(store, { allowances, adjustments, dividends, error: null });
    },
  }))
);
