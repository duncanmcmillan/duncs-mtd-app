/**
 * @fileoverview NgRx Signal Store for the Self Assessment feature.
 * Manages the Individual Calculations workflow state: trigger, review, and crystallise.
 */
import { computed, inject } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { SelfAssessmentService } from '../service/self-assessment.service';
import {
  SelfAssessmentState,
  TaxCalculationSummary,
} from '../model/self-assessment.model';
import { AppStore, extractErrorMessage } from '../../core';

const initialState: SelfAssessmentState = {
  isLoading: false,
  error: null,
  status: 'idle',
  calculation: null,
};

/**
 * Signal store for the Self Assessment tab.
 * Holds workflow status, tax calculation results, and error state.
 */
export const SelfAssessmentStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    /** `true` when the store holds an error message. */
    hasError: computed(() => !!store.error()),
  })),
  withMethods((store, service = inject(SelfAssessmentService), appStore = inject(AppStore)) => ({

    /**
     * Placeholder for future API-backed initialisation.
     * No-op when the user is not authenticated.
     */
    async loadData(): Promise<void> {
      const token = appStore.accessToken();
      const nino = appStore.nino();
      if (!token || !nino) return;

      patchState(store, { isLoading: true, error: null });
      try {
        // Restore persisted status or load latest calculation — to be implemented
        patchState(store, { isLoading: false });
      } catch (e: unknown) {
        patchState(store, {
          error: extractErrorMessage(e, 'Failed to load Self Assessment data'),
          isLoading: false,
        });
      }
    },

    /**
     * Triggers an Individual Calculations 'intent-to-finalise' request and
     * retrieves the resulting tax calculation.
     */
    async triggerCalculation(): Promise<void> {
      const token = appStore.accessToken();
      const nino = appStore.nino();
      if (!token || !nino) return;

      patchState(store, { isLoading: true, error: null });
      try {
        const taxYear = '2024-25'; // TODO: derive from AppStore or user selection
        const calculationId = await service.triggerCalculation(nino, token, taxYear);
        const calculation = await service.retrieveCalculation(nino, token, taxYear, calculationId);
        patchState(store, { isLoading: false, status: 'ready', calculation });
      } catch (e: unknown) {
        patchState(store, {
          error: extractErrorMessage(e, 'Failed to trigger tax calculation'),
          isLoading: false,
        });
      }
    },

    /**
     * Submits the Final Declaration (crystallisation) for the current calculation.
     */
    async submitFinalDeclaration(): Promise<void> {
      const calc = store.calculation();
      const token = appStore.accessToken();
      const nino = appStore.nino();
      if (!calc || !token || !nino) return;

      patchState(store, { isLoading: true, error: null });
      try {
        await service.submitFinalDeclaration(nino, token, calc.taxYear, calc.calculationId);
        patchState(store, {
          isLoading: false,
          status: 'crystallised',
          calculation: { ...calc, crystallised: true },
        });
      } catch (e: unknown) {
        patchState(store, {
          error: extractErrorMessage(e, 'Failed to submit Final Declaration'),
          isLoading: false,
        });
      }
    },

    /** Resets the workflow back to the idle state, clearing any loaded calculation. */
    reset(): void {
      patchState(store, { status: 'idle', calculation: null, error: null });
    },

    /**
     * Loads synthetic tax calculation data for UI development without authentication.
     */
    seedTestData(): void {
      const calculation: TaxCalculationSummary = {
        calculationId: 'f2fb30e5-4d7a-11ee-be56-0242ac120002',
        taxYear: '2024-25',
        calculationTimestamp: '2025-01-15T14:32:00Z',
        crystallised: false,
        selfEmploymentIncome: 45000,
        ukPropertyIncome: 12000,
        foreignPropertyIncome: 8000,
        ukDividendIncome: 3300,
        totalIncomeReceived: 68300,
        personalAllowance: 12570,
        totalAllowancesAndDeductions: 14200,
        totalTaxableIncome: 54100,
        incomeTaxDue: 12820,
        totalNic: 2400,
        totalTaxDue: 15220,
      };
      patchState(store, { status: 'ready', calculation, error: null });
    },
  }))
);
