import { computed } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { QuarterlyService } from '../service/quarterly.service';
import { QuarterlyState } from '../model/quarterly.model';

const initialState: QuarterlyState = {
  isLoading: false,
  error: null,
};

export const QuarterlyStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    hasError: computed(() => !!store.error()),
  })),
  withMethods((store, service = inject(QuarterlyService)) => ({
    setLoading(isLoading: boolean): void {
      patchState(store, { isLoading });
    },
    setError(error: string | null): void {
      patchState(store, { error, isLoading: false });
    },
  }))
);
