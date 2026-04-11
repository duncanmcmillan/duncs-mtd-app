import { computed } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { ObligationsService } from '../service/obligations.service';
import { ObligationsState } from '../model/obligations.model';

const initialState: ObligationsState = {
  isLoading: false,
  error: null,
};

export const ObligationsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    hasError: computed(() => !!store.error()),
  })),
  withMethods((store, service = inject(ObligationsService)) => ({
    setLoading(isLoading: boolean): void {
      patchState(store, { isLoading });
    },
    setError(error: string | null): void {
      patchState(store, { error, isLoading: false });
    },
  }))
);
