/**
 * @fileoverview NgRx Signal Store for the authentication feature.
 * Coordinates UI state (loading, error, status) with the {@link AuthService}
 * and reflects the session state held in {@link AppStore}.
 */
import { computed, inject } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { AuthService } from '../service/auth.service';
import { AuthConfig, AuthState } from '../model/auth.model';
import { AppStore, extractErrorMessage } from '../../core';

const initialState: AuthState = {
  status:      'unauthenticated',
  clientId:    '',
  environment: 'sandbox',
  isLoading:   false,
  error:       null,
};

/**
 * Feature signal store for the HMRC authentication flow.
 * Bridges the UI component with {@link AuthService} and exposes
 * derived state computed from {@link AppStore}.
 */
export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store, appStore = inject(AppStore)) => ({
    /** `true` when the root AppStore holds valid tokens. */
    isAuthenticated: computed(() => appStore.isAuthenticated()),
    /** `true` while the OAuth flow is in progress. */
    isAuthenticating: computed(() => store.status() === 'authenticating'),
    /** Unix ms expiry of the current access token, or `null` if none. */
    tokenExpiresAt: computed(() => appStore.tokens()?.expiresAt ?? null),
  })),
  withMethods((store, authService = inject(AuthService), appStore = inject(AppStore)) => ({

    /**
     * Initialises the auth store on app start.
     * Attempts to restore a saved session and loads the stored client ID.
     * Updates status to `'authenticated'` if a valid session is found.
     */
    async init(): Promise<void> {
      patchState(store, { isLoading: true });
      try {
        await authService.restoreSession();
        const clientId = await authService.loadStoredClientId();
        patchState(store, {
          clientId:    clientId ?? '',
          environment: appStore.environment(),
          status:      appStore.isAuthenticated() ? 'authenticated' : 'unauthenticated',
          isLoading:   false,
        });
      } catch (e: unknown) {
        patchState(store, {
          status:    'error',
          error:     extractErrorMessage(e, 'Session restore failed'),
          isLoading: false,
        });
      }
    },

    /**
     * Initiates the HMRC OAuth sign-in flow.
     * Sets status to `'authenticating'` while the browser flow runs,
     * then transitions to `'authenticated'` on success or `'error'` on failure.
     * @param config - Credentials and target environment from the sign-in form.
     */
    async signIn(config: AuthConfig): Promise<void> {
      patchState(store, { status: 'authenticating', isLoading: true, error: null });
      try {
        await authService.signIn(config);
        patchState(store, {
          status:      'authenticated',
          clientId:    config.clientId,
          environment: config.environment,
          isLoading:   false,
        });
      } catch (e: unknown) {
        patchState(store, {
          status:    'error',
          error:     extractErrorMessage(e, 'Sign in failed'),
          isLoading: false,
        });
      }
    },

    /**
     * Signs out the current user and resets auth state to `'unauthenticated'`.
     */
    async signOut(): Promise<void> {
      patchState(store, { isLoading: true });
      try {
        await authService.signOut();
      } catch {
        // Sign-out errors are non-critical; session is cleared locally regardless.
      }
      patchState(store, { status: 'unauthenticated', isLoading: false, error: null });
    },

    /**
     * Updates the target HMRC API environment without triggering a sign-in.
     * @param environment - `'sandbox'` or `'live'`.
     */
    setEnvironment(environment: 'sandbox' | 'live'): void {
      patchState(store, { environment });
    },

    /** Clears the current error message from the store. */
    clearError(): void {
      patchState(store, { error: null });
    },
  }))
);
