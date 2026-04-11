/**
 * @fileoverview Root application NgRx Signal Store.
 * Holds global session state: authentication tokens, active environment,
 * user NINO, and registered business income sources.
 */
import { computed } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { ApiEnvironment, BusinessSource, HmrcTokens } from '../models';

/**
 * Shape of the root application state slice managed by {@link AppStore}.
 */
interface AppState {
  /** HMRC OAuth tokens; `null` when unauthenticated. */
  tokens: HmrcTokens | null;
  /** The active HMRC API environment. */
  environment: ApiEnvironment;
  /** The user's National Insurance number; `null` until set. */
  nino: string | null;
  /** Income sources registered with HMRC for this user. */
  businessSources: BusinessSource[];
  /** Whether an async operation is in progress. */
  isLoading: boolean;
  /** Last error message; `null` when no error. */
  error: string | null;
}

const initialState: AppState = {
  tokens: null,
  environment: 'sandbox',
  nino: null,
  businessSources: [],
  isLoading: false,
  error: null,
};

/**
 * Root signal store providing global session state and computed auth selectors.
 * Provided in the root injector so it is a singleton across the app.
 */
export const AppStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    /** `true` when valid tokens are present in the store. */
    isAuthenticated: computed(() => !!store.tokens()),
    /** `true` when the active environment is `'live'`. */
    isLive: computed(() => store.environment() === 'live'),
    /** The current access token string, or `null` if unauthenticated. */
    accessToken: computed(() => store.tokens()?.accessToken ?? null),
  })),
  withMethods((store) => ({
    /**
     * Stores newly issued HMRC tokens and clears any previous error.
     * @param tokens - The access/refresh token pair received after OAuth.
     */
    setTokens(tokens: HmrcTokens): void {
      patchState(store, { tokens, error: null });
    },

    /**
     * Clears the current session, removing tokens, NINO, and business sources.
     */
    clearSession(): void {
      patchState(store, { tokens: null, nino: null, businessSources: [] });
    },

    /**
     * Updates the active HMRC API environment.
     * @param environment - `'sandbox'` or `'live'`.
     */
    setEnvironment(environment: ApiEnvironment): void {
      patchState(store, { environment });
    },

    /**
     * Sets the authenticated user's National Insurance number.
     * @param nino - A valid UK NINO, e.g. `'AB123456C'`.
     */
    setNino(nino: string): void {
      patchState(store, { nino });
    },

    /**
     * Replaces the list of HMRC-registered business income sources.
     * @param businessSources - The full list of sources for this user.
     */
    setBusinessSources(businessSources: BusinessSource[]): void {
      patchState(store, { businessSources });
    },

    /**
     * Sets the global loading state for async operations.
     * @param isLoading - `true` to indicate an operation is in progress.
     */
    setLoading(isLoading: boolean): void {
      patchState(store, { isLoading });
    },

    /**
     * Records an error message and clears the loading state.
     * @param error - The error message to display, or `null` to clear.
     */
    setError(error: string | null): void {
      patchState(store, { error, isLoading: false });
    },
  }))
);
