import { computed } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { AdjustmentsService } from '../service/adjustments.service';
import { AdjustmentsState } from '../model/adjustments.model';

const initialState: AdjustmentsState = {
  isLoading: false,
  error: null,
};

export const AdjustmentsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    hasError: computed(() => !!store.error()),
  })),
  withMethods((store, service = inject(AdjustmentsService)) => ({
    setLoading(isLoading: boolean): void {
      patchState(store, { isLoading });
    },
    setError(error: string | null): void {
      patchState(store, { error, isLoading: false });
    },
  }))
);
