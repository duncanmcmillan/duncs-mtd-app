import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ObligationsStore } from './obligations.store';
import { AppStore } from '../../core';

describe('ObligationsStore', () => {
  let store: InstanceType<typeof ObligationsStore>;
  let appStore: InstanceType<typeof AppStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(ObligationsStore);
    appStore = TestBed.inject(AppStore);
  });

  // ── Initial state ────────────────────────────────────────────────────────

  it('initialises isLoading as false', () => {
    expect(store.isLoading()).toBe(false);
  });

  it('initialises error as null', () => {
    expect(store.error()).toBeNull();
  });

  it('initialises rawResponse as null', () => {
    expect(store.rawResponse()).toBeNull();
  });

  it('hasError — false initially', () => {
    expect(store.hasError()).toBe(false);
  });

  // ── loadObligations ──────────────────────────────────────────────────────

  it('loadObligations() — no-op when no access token', async () => {
    await store.loadObligations();
    expect(store.isLoading()).toBe(false);
    expect(store.rawResponse()).toBeNull();
  });

  it('loadObligations() — no-op when no NINO', async () => {
    appStore.setTokens({ accessToken: 'tok', refreshToken: 'r', expiresAt: Date.now() + 3600 });
    await store.loadObligations();
    expect(store.isLoading()).toBe(false);
    expect(store.rawResponse()).toBeNull();
  });
});
