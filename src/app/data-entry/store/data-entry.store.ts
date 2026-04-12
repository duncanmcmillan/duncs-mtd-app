import { computed } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { DataEntryService } from '../service/data-entry.service';
import { DataEntryState } from '../model/data-entry.model';

const initialState: DataEntryState = {
  isLoading: false,
  error: null,
};

export const DataEntryStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    hasError: computed(() => !!store.error()),
  })),
  withMethods((store, service = inject(DataEntryService)) => ({
    setLoading(isLoading: boolean): void {
      patchState(store, { isLoading });
    },
    setError(error: string | null): void {
      patchState(store, { error, isLoading: false });
    },
  }))
);
