/**
 * @fileoverview NgRx Signal Store for the Business Sources feature.
 */
import { computed, inject } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { BusinessSourcesService } from '../service/business-sources.service';
import { BusinessSourcesState } from '../model/business-sources.model';
import { AppStore, extractErrorMessage } from '../../core';

const initialState: BusinessSourcesState = {
  isLoading: false,
  error: null,
  businesses: null,
};

/** Signal store for the Business Sources tab. */
export const BusinessSourcesStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    /** `true` when the store holds an error message. */
    hasError: computed(() => !!store.error()),
    /** `true` when businesses have been fetched and the list is empty. */
    isEmpty: computed(() => store.businesses()?.length === 0),
  })),
  withMethods((store, service = inject(BusinessSourcesService), appStore = inject(AppStore)) => ({
    /**
     * Fetches business income sources from the HMRC API.
     * No-op when the user is not authenticated or NINO is unavailable.
     */
    async loadBusinessSources(): Promise<void> {
      const token = appStore.accessToken();
      const nino = appStore.nino();
      if (!token || !nino) return;

      patchState(store, { isLoading: true, error: null });
      try {
        const response = await service.fetchBusinessSources(nino, token);
        patchState(store, { businesses: response.listOfBusinesses, isLoading: false });
      } catch (e: unknown) {
        patchState(store, {
          error: extractErrorMessage(e, 'Failed to load business sources'),
          isLoading: false,
        });
      }
    },
  }))
);
