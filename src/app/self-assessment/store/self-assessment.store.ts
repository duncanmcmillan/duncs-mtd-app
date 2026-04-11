import { computed } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { SelfAssessmentService } from '../service/self-assessment.service';
import { SelfAssessmentState } from '../model/self-assessment.model';

const initialState: SelfAssessmentState = {
  isLoading: false,
  error: null,
};

export const SelfAssessmentStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    hasError: computed(() => !!store.error()),
  })),
  withMethods((store, service = inject(SelfAssessmentService)) => ({
    setLoading(isLoading: boolean): void {
      patchState(store, { isLoading });
    },
    setError(error: string | null): void {
      patchState(store, { error, isLoading: false });
    },
  }))
);
