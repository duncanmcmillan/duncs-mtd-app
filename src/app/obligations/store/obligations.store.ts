/**
 * @fileoverview NgRx Signal Store for the Obligations feature.
 * Manages fetch state and the raw HMRC obligations API response.
 */
import { computed, inject } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { ObligationsService } from '../service/obligations.service';
import { ObligationRow, ObligationsState } from '../model/obligations.model';
import { AppStore, extractErrorMessage } from '../../core';
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
  }))
);
