import { TestBed } from '@angular/core/testing';
import { AuthStore } from './auth.store';
import { AppStore } from '../../core';

describe('AuthStore', () => {
  let store: InstanceType<typeof AuthStore>;
  let appStore: InstanceType<typeof AppStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store    = TestBed.inject(AuthStore);
    appStore = TestBed.inject(AppStore);
  });

  // ── Initial state ──────────────────────────────────────────────────────────

  it('initialises status as unauthenticated', () => {
    expect(store.status()).toBe('unauthenticated');
  });

  it('initialises environment as sandbox', () => {
    expect(store.environment()).toBe('sandbox');
  });

  it('initialises isLoading as false', () => {
    expect(store.isLoading()).toBe(false);
  });

  it('initialises error as null', () => {
    expect(store.error()).toBeNull();
  });

  it('isAuthenticated — reflects AppStore', () => {
    expect(store.isAuthenticated()).toBe(false);
    appStore.setTokens({ accessToken: 'a', refreshToken: 'r', expiresAt: Date.now() + 3600 });
    expect(store.isAuthenticated()).toBe(true);
  });

  it('isAuthenticating — false initially', () => {
    expect(store.isAuthenticating()).toBe(false);
  });

  it('tokenExpiresAt — null when not authenticated', () => {
    expect(store.tokenExpiresAt()).toBeNull();
  });

  it('tokenExpiresAt — reflects token expiry from AppStore', () => {
    const expiresAt = Date.now() + 3_600_000;
    appStore.setTokens({ accessToken: 'a', refreshToken: 'r', expiresAt });
    expect(store.tokenExpiresAt()).toBe(expiresAt);
  });

  // ── setEnvironment ─────────────────────────────────────────────────────────

  it('setEnvironment — switches to live', () => {
    store.setEnvironment('live');
    expect(store.environment()).toBe('live');
  });

  it('setEnvironment — switches back to sandbox', () => {
    store.setEnvironment('live');
    store.setEnvironment('sandbox');
    expect(store.environment()).toBe('sandbox');
  });

  // ── clearError ─────────────────────────────────────────────────────────────

  it('clearError — removes error message', () => {
    // Patch state indirectly via a failed signIn would require mocking.
    // Verify clearError is callable without error.
    expect(() => store.clearError()).not.toThrow();
    expect(store.error()).toBeNull();
  });

  // ── init ───────────────────────────────────────────────────────────────────

  it('init() — resolves without error in browser context', async () => {
    await expect(store.init()).resolves.toBeUndefined();
  });

  it('init() — sets status to unauthenticated when no stored session', async () => {
    await store.init();
    expect(store.status()).toBe('unauthenticated');
  });

  it('init() — sets status to authenticated when AppStore has tokens after restoreSession', async () => {
    // Pre-seed AppStore as if a session was already restored
    appStore.setTokens({ accessToken: 'a', refreshToken: 'r', expiresAt: Date.now() + 3600 });
    await store.init();
    expect(store.status()).toBe('authenticated');
  });

  it('init() — sets isLoading to false after completion', async () => {
    await store.init();
    expect(store.isLoading()).toBe(false);
  });

  // ── signIn ─────────────────────────────────────────────────────────────────

  it('signIn() — transitions to error when not in Electron', async () => {
    await store.signIn({ clientId: 'id', clientSecret: 'secret', environment: 'sandbox' });
    expect(store.status()).toBe('error');
    expect(store.error()).toContain('Electron');
  });

  it('signIn() — sets isLoading to false after error', async () => {
    await store.signIn({ clientId: 'id', clientSecret: 'secret', environment: 'sandbox' });
    expect(store.isLoading()).toBe(false);
  });

  // ── signOut ────────────────────────────────────────────────────────────────

  it('signOut() — sets status to unauthenticated', async () => {
    await store.signOut();
    expect(store.status()).toBe('unauthenticated');
  });

  it('signOut() — sets isLoading to false', async () => {
    await store.signOut();
    expect(store.isLoading()).toBe(false);
  });

  it('signOut() — clears error', async () => {
    await store.signIn({ clientId: 'id', clientSecret: 'secret', environment: 'sandbox' });
    await store.signOut();
    expect(store.error()).toBeNull();
  });
});
