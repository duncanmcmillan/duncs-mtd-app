import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { AppStore } from '../../core';

/**
 * Tests cover the browser-context behaviour (no Electron bridge).
 * The Electron-specific paths (signIn OAuth flow, credential storage)
 * require integration testing against the Electron main process.
 */
describe('AuthService', () => {
  let service: AuthService;
  let appStore: InstanceType<typeof AppStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service  = TestBed.inject(AuthService);
    appStore = TestBed.inject(AppStore);
  });

  // ── isElectron ─────────────────────────────────────────────────────────────

  it('isElectron — false in browser/test environment', () => {
    expect(service.isElectron).toBe(false);
  });

  // ── restoreSession ─────────────────────────────────────────────────────────

  it('restoreSession() — resolves without error outside Electron', async () => {
    await expect(service.restoreSession()).resolves.toBeUndefined();
  });

  it('restoreSession() — does not modify AppStore outside Electron', async () => {
    await service.restoreSession();
    expect(appStore.isAuthenticated()).toBe(false);
  });

  // ── loadStoredClientId ─────────────────────────────────────────────────────

  it('loadStoredClientId() — returns null outside Electron', async () => {
    const result = await service.loadStoredClientId();
    expect(result).toBeNull();
  });

  // ── signIn ─────────────────────────────────────────────────────────────────

  it('signIn() — throws outside Electron', async () => {
    await expect(
      service.signIn({ clientId: 'id', clientSecret: 'secret', environment: 'sandbox' })
    ).rejects.toThrow('Auth only available in Electron');
  });

  // ── signOut ────────────────────────────────────────────────────────────────

  it('signOut() — clears AppStore session', async () => {
    // Seed some state to clear
    appStore.setTokens({ accessToken: 'a', refreshToken: 'r', expiresAt: Date.now() + 3600 });
    appStore.setNino('AB123456C');
    expect(appStore.isAuthenticated()).toBe(true);

    await service.signOut();

    expect(appStore.isAuthenticated()).toBe(false);
    expect(appStore.nino()).toBeNull();
  });

  it('signOut() — resolves without error when no bridge is present', async () => {
    await expect(service.signOut()).resolves.toBeUndefined();
  });

  // ── clearCredentials ───────────────────────────────────────────────────────

  it('clearCredentials() — resolves without error outside Electron', async () => {
    await expect(service.clearCredentials()).resolves.toBeUndefined();
  });
});
