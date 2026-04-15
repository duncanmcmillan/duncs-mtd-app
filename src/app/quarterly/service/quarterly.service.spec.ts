import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { QuarterlyService } from './quarterly.service';
import {
  QuarterlyDraft,
  emptySEIncome,
  emptySEExpenses,
  emptySEDisallowable,
  emptyPropIncome,
  emptyPropExpenses,
  emptyForeignPropIncome,
  emptyForeignPropExpenses,
} from '../model/quarterly.model';

// Polyfill localStorage for jsdom (not available in all Angular test environments).
const mockStorage: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (k: string) => mockStorage[k] ?? null,
  setItem: (k: string, v: string) => { mockStorage[k] = v; },
  removeItem: (k: string) => { delete mockStorage[k]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); },
  get length() { return Object.keys(mockStorage).length; },
  key: (i: number) => Object.keys(mockStorage)[i] ?? null,
});

describe('QuarterlyService', () => {
  let service: QuarterlyService;
  let httpController: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();
    service = TestBed.inject(QuarterlyService);
    httpController = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    httpController.verify();
    localStorage.clear();
  });

  it('creates', () => {
    expect(service).toBeTruthy();
  });

  describe('submitSelfEmployment()', () => {
    it('POSTs to the SE Business API with the correct path', async () => {
      const promise = service.submitSelfEmployment(
        'AB123456C', 'biz1', '2024-25',
        '2024-04-06', '2024-07-05', 'test-token',
        emptySEIncome(), emptySEExpenses(), emptySEDisallowable(),
      );
      // FraudPreventionService.getHeaders() is async, so the HTTP call is dispatched
      // on the next microtask tick. Await one tick before calling expectOne.
      await Promise.resolve();
      const req = httpController.expectOne(
        r => r.url.includes('/individuals/self-employment/income-summary/AB123456C/2024-25/biz1'),
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
      req.flush({ submissionId: 'sub-abc-123' });
      await expect(promise).resolves.toBe('sub-abc-123');
    });
  });

  describe('submitForeignProperty()', () => {
    it('POSTs to the Foreign Property Business API with the correct path', async () => {
      const promise = service.submitForeignProperty(
        'AB123456C', 'fp1', '2024-25',
        '2024-04-06', '2024-07-05', 'test-token',
        emptyForeignPropIncome(), emptyForeignPropExpenses(),
      );
      await Promise.resolve();
      const req = httpController.expectOne(
        r => r.url.includes('/individuals/business/property/foreign/AB123456C/2024-25/fp1/period'),
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
      req.flush({ submissionId: 'fp-sub-789' });
      await expect(promise).resolves.toBe('fp-sub-789');
    });
  });

  describe('submitUkProperty()', () => {
    it('POSTs to the Property Business API with the correct path', async () => {
      const promise = service.submitUkProperty(
        'AB123456C', 'prop1', '2024-25',
        '2024-04-06', '2024-07-05', 'test-token',
        emptyPropIncome(), emptyPropExpenses(),
      );
      await Promise.resolve();
      const req = httpController.expectOne(
        r => r.url.includes('/individuals/business/property/uk/AB123456C/2024-25/prop1/period'),
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
      req.flush({ submissionId: 'prop-sub-456' });
      await expect(promise).resolves.toBe('prop-sub-456');
    });
  });

  describe('saveDraft() / loadAllDrafts()', () => {
    it('roundtrips a draft through localStorage', () => {
      const draft: QuarterlyDraft = {
        businessId: 'biz1', businessName: 'Test Shop', businessType: 'self-employment',
        periodStartDate: '2024-04-06', periodEndDate: '2024-07-05',
        dueDate: '2024-08-07', taxYear: '2024-25',
        seIncome: emptySEIncome(), seExpenses: emptySEExpenses(),
        seDisallowableExpenses: emptySEDisallowable(),
        propIncome: emptyPropIncome(), propExpenses: emptyPropExpenses(),
        foreignPropIncome: emptyForeignPropIncome(), foreignPropExpenses: emptyForeignPropExpenses(),
        confirmed: false, lastSaved: null, submissionId: null,
        status: 'draft', error: null,
      };
      service.saveDraft(draft);
      const loaded = service.loadAllDrafts();
      expect(loaded['biz1_2024-04-06']).toBeTruthy();
      expect(loaded['biz1_2024-04-06'].businessName).toBe('Test Shop');
    });

    it('loadAllDrafts() returns empty object when nothing is saved', () => {
      expect(service.loadAllDrafts()).toEqual({});
    });
  });
});
