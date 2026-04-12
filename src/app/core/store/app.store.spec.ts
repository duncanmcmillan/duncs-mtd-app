import { TestBed } from '@angular/core/testing';
import { AppStore } from './app.store';
import { HmrcTokens, BusinessSource } from '../models';

const mockTokens: HmrcTokens = {
  accessToken:  'access-abc',
  refreshToken: 'refresh-xyz',
  expiresAt:    Date.now() + 3_600_000,
};

const mockSources: BusinessSource[] = [
  { id: 'src-1', type: 'self-employment', tradingName: 'Acme Ltd' },
  { id: 'src-2', type: 'uk-property', propertyType: 'non-fhl' },
];

describe('AppStore', () => {
  let store: InstanceType<typeof AppStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(AppStore);
  });

  // ── Initial state ──────────────────────────────────────────────────────────

  it('initialises with null tokens', () => {
    expect(store.tokens()).toBeNull();
  });

  it('initialises environment as sandbox', () => {
    expect(store.environment()).toBe('sandbox');
  });

  it('initialises isAuthenticated as false', () => {
    expect(store.isAuthenticated()).toBe(false);
  });

  it('initialises accessToken as null', () => {
    expect(store.accessToken()).toBeNull();
  });

  it('initialises isLive as false', () => {
    expect(store.isLive()).toBe(false);
  });

  // ── setTokens ──────────────────────────────────────────────────────────────

  it('setTokens — stores the provided tokens', () => {
    store.setTokens(mockTokens);
    expect(store.tokens()).toEqual(mockTokens);
  });

  it('setTokens — sets isAuthenticated to true', () => {
    store.setTokens(mockTokens);
    expect(store.isAuthenticated()).toBe(true);
  });

  it('setTokens — exposes the accessToken via computed', () => {
    store.setTokens(mockTokens);
    expect(store.accessToken()).toBe('access-abc');
  });

  it('setTokens — clears a pre-existing error', () => {
    store.setError('previous error');
    store.setTokens(mockTokens);
    expect(store.error()).toBeNull();
  });

  // ── clearSession ───────────────────────────────────────────────────────────

  it('clearSession — removes tokens', () => {
    store.setTokens(mockTokens);
    store.clearSession();
    expect(store.tokens()).toBeNull();
  });

  it('clearSession — sets isAuthenticated to false', () => {
    store.setTokens(mockTokens);
    store.clearSession();
    expect(store.isAuthenticated()).toBe(false);
  });

  it('clearSession — clears NINO', () => {
    store.setNino('AB123456C');
    store.clearSession();
    expect(store.nino()).toBeNull();
  });

  it('clearSession — clears business sources', () => {
    store.setBusinessSources(mockSources);
    store.clearSession();
    expect(store.businessSources()).toHaveLength(0);
  });

  // ── setEnvironment ─────────────────────────────────────────────────────────

  it('setEnvironment — switches to live', () => {
    store.setEnvironment('live');
    expect(store.environment()).toBe('live');
    expect(store.isLive()).toBe(true);
  });

  it('setEnvironment — switches back to sandbox', () => {
    store.setEnvironment('live');
    store.setEnvironment('sandbox');
    expect(store.environment()).toBe('sandbox');
    expect(store.isLive()).toBe(false);
  });

  // ── setNino ────────────────────────────────────────────────────────────────

  it('setNino — stores the provided NINO', () => {
    store.setNino('AB123456C');
    expect(store.nino()).toBe('AB123456C');
  });

  // ── setBusinessSources ─────────────────────────────────────────────────────

  it('setBusinessSources — stores the provided sources', () => {
    store.setBusinessSources(mockSources);
    expect(store.businessSources()).toEqual(mockSources);
  });

  it('setBusinessSources — replaces previously stored sources', () => {
    store.setBusinessSources(mockSources);
    store.setBusinessSources([]);
    expect(store.businessSources()).toHaveLength(0);
  });

  // ── setLoading ─────────────────────────────────────────────────────────────

  it('setLoading(true) — sets isLoading to true', () => {
    store.setLoading(true);
    expect(store.isLoading()).toBe(true);
  });

  it('setLoading(false) — clears isLoading', () => {
    store.setLoading(true);
    store.setLoading(false);
    expect(store.isLoading()).toBe(false);
  });

  // ── setError ───────────────────────────────────────────────────────────────

  it('setError — stores the error message', () => {
    store.setError('something went wrong');
    expect(store.error()).toBe('something went wrong');
  });

  it('setError — clears isLoading', () => {
    store.setLoading(true);
    store.setError('oops');
    expect(store.isLoading()).toBe(false);
  });

  it('setError(null) — clears the error', () => {
    store.setError('oops');
    store.setError(null);
    expect(store.error()).toBeNull();
  });
});
