/**
 * @fileoverview NgRx Signal Store for the Income & Adjustments feature.
 * Manages allowances, adjustments, and dividend state with seed data support.
 */
import { computed, inject } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { IncomeAdjustmentsService } from '../service/income-adjustments.service';
import {
  AllowanceEntry,
  AdjustmentEntry,
  DividendEntry,
  IncomeAdjustmentsState,
} from '../model/income-adjustments.model';
import { AppStore, extractErrorMessage } from '../../core';

const initialState: IncomeAdjustmentsState = {
  isLoading: false,
  error: null,
  allowances: null,
  adjustments: null,
  dividends: null,
};

/**
 * Signal store for the Income & Adjustments tab.
 * Holds allowances, BSAS adjustments, and dividend declarations.
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

    /**
     * Loads synthetic allowances, adjustments, and dividends covering all
     * three income source types for the 2024-25 tax year, for UI development
     * without authentication.
     */
    seedTestData(): void {
      const allowances: AllowanceEntry[] = [
        {
          businessId: 'test-biz-se',
          typeOfBusiness: 'self-employment',
          taxYear: '2024-25',
          annualInvestmentAllowance: 1000,
          capitalAllowanceMainPool: 500,
          tradingIncomeAllowance: 1000,
        },
        {
          businessId: 'test-biz-prop',
          typeOfBusiness: 'uk-property',
          taxYear: '2024-25',
          annualInvestmentAllowance: 2000,
          propertyIncomeAllowance: 1000,
          otherCapitalAllowance: 300,
        },
        {
          businessId: 'test-biz-fp',
          typeOfBusiness: 'foreign-property',
          taxYear: '2024-25',
          annualInvestmentAllowance: 1500,
          propertyIncomeAllowance: 500,
          otherCapitalAllowance: 200,
        },
      ];

      const adjustments: AdjustmentEntry[] = [
        {
          businessId: 'test-biz-se',
          typeOfBusiness: 'self-employment',
          taxYear: '2024-25',
          calculationId: 'calc-se-2024',
          includedNonTaxableProfits: 200,
          basisAdjustment: 100,
          overlapReliefUsed: 50,
        },
        {
          businessId: 'test-biz-prop',
          typeOfBusiness: 'uk-property',
          taxYear: '2024-25',
          calculationId: 'calc-prop-2024',
          privateUseAdjustment: 1500,
          balancingCharge: 0,
        },
        {
          businessId: 'test-biz-fp',
          typeOfBusiness: 'foreign-property',
          taxYear: '2024-25',
          calculationId: 'calc-fp-2024',
          privateUseAdjustment: 800,
          balancingCharge: 0,
        },
      ];

      const dividends: DividendEntry = {
        taxYear: '2024-25',
        ukDividends: 2500,
        otherUkDividends: 800,
        foreignDividends: [
          { countryCode: 'DE', amount: 300, taxTakenOff: 45 },
          { countryCode: 'US', amount: 750, taxTakenOff: 112 },
        ],
      };

      patchState(store, { allowances, adjustments, dividends, error: null });
    },
  }))
);
