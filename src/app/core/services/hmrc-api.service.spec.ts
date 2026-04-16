import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HmrcApiService } from './hmrc-api.service';

/**
 * Note: Methods that require the Electron IPC bridge (startOAuthFlow,
 * storeTokens, loadTokens, clearTokens) are tested only for their
 * browser-context (non-Electron) behaviour here. Electron paths require
 * integration testing against the main process.
 */
describe('HmrcApiService', () => {
  let service: HmrcApiService;
  let httpController: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service        = TestBed.inject(HmrcApiService);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpController.verify();
    TestBed.resetTestingModule();
  });

  // ── environment signal ─────────────────────────────────────────────────────

  it('defaults environment to sandbox', () => {
    expect(service.environment()).toBe('sandbox');
  });

  it('setEnvironment — switches to live', () => {
    service.setEnvironment('live');
    expect(service.environment()).toBe('live');
  });

  it('setEnvironment — switches back to sandbox', () => {
    service.setEnvironment('live');
    service.setEnvironment('sandbox');
    expect(service.environment()).toBe('sandbox');
  });

  // ── get() ──────────────────────────────────────────────────────────────────

  it('get() — sends GET to the sandbox base URL', async () => {
    const promise = service.get<{ id: string }>('/test/path', 'my-token');
    await Promise.resolve();

    const req = httpController.expectOne('https://test-api.service.hmrc.gov.uk/test/path');
    expect(req.request.method).toBe('GET');
    req.flush({ id: '123' });

    const result = await promise;
    expect(result).toEqual({ id: '123' });
  });

  it('get() — sends correct Authorization header', async () => {
    const promise = service.get('/any', 'bearer-token');
    await Promise.resolve();

    const req = httpController.expectOne('https://test-api.service.hmrc.gov.uk/any');
    expect(req.request.headers.get('Authorization')).toBe('Bearer bearer-token');
    req.flush({});
    await promise;
  });

  it('get() — sends correct Accept header', async () => {
    const promise = service.get('/any', 'tok');
    await Promise.resolve();

    const req = httpController.expectOne('https://test-api.service.hmrc.gov.uk/any');
    expect(req.request.headers.get('Accept')).toBe('application/vnd.hmrc.1.0+json');
    req.flush({});
    await promise;
  });

  it('get() — uses live base URL when environment is live', async () => {
    service.setEnvironment('live');
    const promise = service.get('/live-path', 'tok');
    await Promise.resolve();

    const req = httpController.expectOne('https://api.service.hmrc.gov.uk/live-path');
    req.flush({});
    await promise;
  });

  // ── post() ─────────────────────────────────────────────────────────────────

  it('post() — sends POST with JSON body', async () => {
    const body    = { amount: 100 };
    const promise = service.post<{ ok: boolean }>('/submit', body, 'tok');
    await Promise.resolve();

    const req = httpController.expectOne('https://test-api.service.hmrc.gov.uk/submit');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ ok: true });

    const result = await promise;
    expect(result).toEqual({ ok: true });
  });

  it('post() — sends Content-Type application/json', async () => {
    const promise = service.post('/submit', {}, 'tok');
    await Promise.resolve();

    const req = httpController.expectOne('https://test-api.service.hmrc.gov.uk/submit');
    expect(req.request.headers.get('Content-Type')).toBe('application/json');
    req.flush({});
    await promise;
  });

  // ── Electron-only methods (browser context) ────────────────────────────────

  it('startOAuthFlow() — throws outside Electron', async () => {
    await expect(service.startOAuthFlow()).rejects.toThrow('OAuth only available in Electron');
  });

  it('loadTokens() — returns null outside Electron', async () => {
    const result = await service.loadTokens();
    expect(result).toBeNull();
  });

  it('storeTokens() — resolves without error outside Electron', async () => {
    const tokens = { accessToken: 'a', refreshToken: 'r', expiresAt: Date.now() + 3600 };
    await expect(service.storeTokens(tokens)).resolves.toBeUndefined();
  });

  it('clearTokens() — resolves without error outside Electron', async () => {
    await expect(service.clearTokens()).resolves.toBeUndefined();
  });
});
