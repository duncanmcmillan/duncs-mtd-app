import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ObligationsService } from './obligations.service';
import { ObligationsResponse } from '../../core';

describe('ObligationsService', () => {
  let service: ObligationsService;
  let httpController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ObligationsService);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpController.verify();
  });

  it('creates', () => {
    expect(service).toBeTruthy();
  });

  it('fetchObligations() — GETs /obligations/details/{nino} with auth header', async () => {
    const nino = 'AB123456C';
    const token = 'test-token';
    const mockResponse: ObligationsResponse = { obligations: [] };

    const promise = service.fetchObligations(nino, token, '2025-04-06', '2026-04-05');

    const req = httpController.expectOne(
      (r) => r.url.includes(`/obligations/details/${nino}`),
    );
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    req.flush(mockResponse);

    await expect(promise).resolves.toEqual(mockResponse);
  });

  it('fetchObligations() — includes fromDate and toDate as query params', async () => {
    const promise = service.fetchObligations('AB123456C', 'tok', '2025-04-06', '2026-04-05');

    const req = httpController.expectOne(
      (r) =>
        r.urlWithParams.includes('fromDate=2025-04-06') &&
        r.urlWithParams.includes('toDate=2026-04-05'),
    );
    req.flush({ obligations: [] });
    await promise;
  });

  it('fetchObligations() — uses default date range when none provided', async () => {
    const promise = service.fetchObligations('AB123456C', 'tok', 'self-employment');

    const req = httpController.expectOne(
      (r) => r.urlWithParams.includes('fromDate=') && r.urlWithParams.includes('toDate='),
    );
    req.flush({ obligations: [] });
    await promise;
  });
});
