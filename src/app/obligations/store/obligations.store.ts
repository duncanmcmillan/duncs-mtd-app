/**
 * @fileoverview NgRx Signal Store for the Obligations feature.
 * Manages fetch state and the raw HMRC obligations API response.
 */
import { computed, inject } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { ObligationsService } from '../service/obligations.service';
import { ObligationRow, ObligationsState } from '../model/obligations.model';
import { AppStore, extractErrorMessage, ObligationsResponse } from '../../core';
import { BusinessSourcesStore } from '../../business-sources';

const initialState: ObligationsState = {
  isLoading: false,
  error: null,
  rawResponse: null,
};

/**
 * Signal store for the Obligations tab.
 * Fetches and caches the raw HMRC obligations response.
 */
export const ObligationsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    /** `true` when the store holds an error message. */
    hasError: computed(() => !!store.error()),
    /**
     * All obligation periods flattened into display-ready rows, preserving
     * their business-source context. Empty array until data is loaded.
     */
    obligationRows: computed((): ObligationRow[] => {
      const response = store.rawResponse();
      if (!response) return [];
      return response.obligations.flatMap(group =>
        group.obligationDetails.map(o => ({
          typeOfBusiness: group.typeOfBusiness ?? 'unknown',
          businessId: group.businessId,
          ...o,
        }))
      );
    }),
  })),
  withMethods((store, service = inject(ObligationsService), appStore = inject(AppStore), bizStore = inject(BusinessSourcesStore)) => ({
    /**
     * Fetches obligations from the HMRC API using the current session tokens and NINO.
     * No-op when the user is not authenticated or NINO is unavailable.
     */
    async loadObligations(): Promise<void> {
      const token = appStore.accessToken();
      const nino = appStore.nino();
      if (!token || !nino) return;

      // Use first known business source; fall back to self-employment if none loaded yet.
      const businesses = bizStore.businesses();
      const firstBiz = businesses?.[0];
      const typeOfBusiness = firstBiz?.typeOfBusiness ?? 'self-employment';
      const businessId = firstBiz?.businessId;

      patchState(store, { isLoading: true, error: null });
      try {
        const rawResponse = await service.fetchObligations(nino, token, typeOfBusiness, businessId);
        patchState(store, { rawResponse, isLoading: false });
      } catch (e: unknown) {
        patchState(store, {
          error: extractErrorMessage(e, 'Failed to load obligations'),
          isLoading: false,
        });
      }
    },

    /**
     * Loads synthetic obligations covering all three income source types plus
     * the annual SATR obligation, for UI development without authentication.
     * Includes open, overdue, and fulfilled rows so all status states are visible.
     */
    seedTestObligations(): void {
      const rawResponse: ObligationsResponse = {
        obligations: [
          {
            typeOfBusiness: 'self-employment',
            businessId: 'test-biz-se',
            obligationDetails: [
              // 2024-25: all quarters fulfilled
              { periodStartDate: '2024-07-06', periodEndDate: '2024-10-05', dueDate: '2024-11-07', status: 'fulfilled', receivedDate: '2024-10-28' },
              { periodStartDate: '2024-10-06', periodEndDate: '2025-01-05', dueDate: '2025-02-07', status: 'fulfilled', receivedDate: '2025-01-30' },
              { periodStartDate: '2025-01-06', periodEndDate: '2025-04-05', dueDate: '2025-05-07', status: 'fulfilled', receivedDate: '2025-04-28' },
              // 2025-26: Q4 open
              { periodStartDate: '2026-01-06', periodEndDate: '2026-04-05', dueDate: '2026-05-07', status: 'open' },
            ],
          },
          {
            typeOfBusiness: 'uk-property',
            businessId: 'test-biz-prop',
            obligationDetails: [
              // 2024-25: all quarters fulfilled
              { periodStartDate: '2024-07-06', periodEndDate: '2024-10-05', dueDate: '2024-11-07', status: 'fulfilled', receivedDate: '2024-11-01' },
              { periodStartDate: '2024-10-06', periodEndDate: '2025-01-05', dueDate: '2025-02-07', status: 'fulfilled', receivedDate: '2025-01-28' },
              { periodStartDate: '2025-01-06', periodEndDate: '2025-04-05', dueDate: '2025-05-07', status: 'fulfilled', receivedDate: '2025-05-01' },
              // 2025-26: Q4 open
              { periodStartDate: '2026-01-06', periodEndDate: '2026-04-05', dueDate: '2026-05-07', status: 'open' },
            ],
          },
          {
            typeOfBusiness: 'foreign-property',
            businessId: 'test-biz-fp',
            obligationDetails: [
              // 2024-25: all quarters fulfilled
              { periodStartDate: '2024-07-06', periodEndDate: '2024-10-05', dueDate: '2024-11-07', status: 'fulfilled', receivedDate: '2024-10-30' },
              { periodStartDate: '2024-10-06', periodEndDate: '2025-01-05', dueDate: '2025-02-07', status: 'fulfilled', receivedDate: '2025-01-20' },
              { periodStartDate: '2025-01-06', periodEndDate: '2025-04-05', dueDate: '2025-05-07', status: 'fulfilled', receivedDate: '2025-04-30' },
              // 2025-26: Q4 open
              { periodStartDate: '2026-01-06', periodEndDate: '2026-04-05', dueDate: '2026-05-07', status: 'open' },
            ],
          },
          {
            typeOfBusiness: 'ITSA',
            obligationDetails: [
              // 2024-25: fulfilled
              { periodStartDate: '2024-04-06', periodEndDate: '2025-04-05', dueDate: '2026-01-31', status: 'fulfilled', receivedDate: '2026-01-15' },
              // 2025-26: open
              { periodStartDate: '2025-04-06', periodEndDate: '2026-04-05', dueDate: '2027-01-31', status: 'open' },
            ],
          },
        ],
      };
      patchState(store, { rawResponse, error: null });
    },
  }))
);
