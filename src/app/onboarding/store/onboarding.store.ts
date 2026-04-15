/**
 * @fileoverview NgRx Signal Store for the onboarding feature.
 * Tracks which setup steps the user has completed, derives the currently
 * relevant step from route and app state, and persists progress to disk
 * via {@link OnboardingService}.
 */
import { computed, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { filter } from 'rxjs';
import { AppStore, extractErrorMessage } from '../../core';
import { AuthStore } from '../../auth';
import { OnboardingService } from '../service/onboarding.service';
import {
  ONBOARDING_STEPS,
  OnboardingStep,
  OnboardingStepId,
} from '../model/onboarding.model';

/** Internal state shape for the onboarding feature store. */
interface OnboardingState {
  /** Whether the onboarding banner is visible (toggled via F1). */
  bannerVisible: boolean;
  /** Current router URL, updated on every `NavigationEnd` event. */
  activeRoute: string;
  /** Step IDs that the current user has already completed. */
  completedSteps: OnboardingStepId[];
  /** Last error message; `null` when no error. */
  error: string | null;
}

const initialState: OnboardingState = {
  bannerVisible: true,
  activeRoute: '',
  completedSteps: [],
  error: null,
};

/**
 * Feature signal store for contextual user onboarding.
 * Evaluates the active route and NINO availability to surface the
 * next relevant onboarding step, persisting completion per ClientID.
 */
export const OnboardingStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store, appStore = inject(AppStore)) => ({
    /**
     * The next incomplete onboarding step relevant to the current context,
     * or `null` if all applicable steps are done.
     */
    currentStep: computed((): OnboardingStep | null => {
      const completed = store.completedSteps();
      const route = store.activeRoute();
      const nino = appStore.nino();

      if (!completed.includes('AUTH_TAB') && route.startsWith('/auth')) {
        return ONBOARDING_STEPS.find(s => s.id === 'AUTH_TAB') ?? null;
      }

      if (!completed.includes('NAVIGATE_TO_SOURCES') && nino !== null) {
        return ONBOARDING_STEPS.find(s => s.id === 'NAVIGATE_TO_SOURCES') ?? null;
      }

      if (!completed.includes('QUARTERLY_TAB') && route.startsWith('/quarterly')) {
        return ONBOARDING_STEPS.find(s => s.id === 'QUARTERLY_TAB') ?? null;
      }

      return null;
    }),
  })),
  withComputed((store) => ({
    /**
     * `true` when the banner should be rendered — visible flag is on
     * and there is an active step to display.
     */
    showBanner: computed(() => store.bannerVisible() && store.currentStep() !== null),
  })),
  withMethods(
    (
      store,
      onboardingService = inject(OnboardingService),
      authStore = inject(AuthStore),
    ) => ({
      /**
       * Loads persisted progress for the given ClientID and hydrates the store.
       * @param clientId - The HMRC ClientID to load progress for.
       */
      async init(clientId: string): Promise<void> {
        if (!clientId) return;
        try {
          const progress = await onboardingService.loadProgress();
          const completedSteps = progress[clientId] ?? [];
          patchState(store, { completedSteps, error: null });
        } catch (e: unknown) {
          patchState(store, { error: extractErrorMessage(e, 'Failed to load onboarding progress') });
        }
      },

      /**
       * Marks a step as complete and persists the updated progress.
       * @param id - The ID of the step to mark complete.
       */
      async completeStep(id: OnboardingStepId): Promise<void> {
        const current = store.completedSteps();
        if (current.includes(id)) return;
        const updated = [...current, id];
        patchState(store, { completedSteps: updated });
        try {
          await onboardingService.saveProgress(authStore.clientId(), updated);
        } catch (e: unknown) {
          patchState(store, { error: extractErrorMessage(e, 'Failed to save onboarding progress') });
        }
      },

      /** Flips the banner visibility. Used by the F1 keyboard shortcut. */
      toggleBannerVisible(): void {
        patchState(store, { bannerVisible: !store.bannerVisible() });
      },

      /**
       * Resets persisted progress for the given ClientID and clears local
       * completed steps if it matches the active ClientID.
       * @param clientId - The ClientID whose progress to reset.
       */
      async resetForClientId(clientId: string): Promise<void> {
        try {
          await onboardingService.resetProgress(clientId);
          if (authStore.clientId() === clientId) {
            patchState(store, { completedSteps: [] });
          }
        } catch (e: unknown) {
          patchState(store, { error: extractErrorMessage(e, 'Failed to reset onboarding progress') });
        }
      },

      /**
       * Updates the active route string. Called from the router subscription
       * in the store hook.
       * @param url - The URL after redirects from a `NavigationEnd` event.
       */
      setActiveRoute(url: string): void {
        patchState(store, { activeRoute: url });
      },
    }),
  ),
  withHooks((store) => {
    const router = inject(Router);
    return {
      onInit() {
        // Seed the current URL in case navigation already happened before the store was created.
        if (router.url && router.url !== '/') {
          store.setActiveRoute(router.url);
        }
        router.events
          .pipe(filter(e => e instanceof NavigationEnd))
          .subscribe(e => {
            const url = (e as NavigationEnd).urlAfterRedirects;
            store.setActiveRoute(url);
            if (url.startsWith('/business-sources')) {
              void store.completeStep('NAVIGATE_TO_SOURCES');
            }
          });
      },
    };
  }),
);
