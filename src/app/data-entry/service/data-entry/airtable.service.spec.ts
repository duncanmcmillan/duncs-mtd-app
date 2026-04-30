import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AirtableService } from './airtable.service';

const BASE_PARAMS = {
  apiKey: 'test-key',
  baseId: 'appTEST',
  tableId: 'tblTEST',
  dateColumn: 'Period End',
  periodEndDate: '2024-07-05',
  fieldMappings: { 'se.income.turnover': 'Revenue' },
};

describe('AirtableService', () => {
  let service: AirtableService;
  let httpController: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AirtableService);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpController.verify();
    TestBed.resetTestingModule();
  });

  it('creates', () => expect(service).toBeTruthy());

  it('returns mapped numeric values for a matching record', async () => {
    const promise = service.readRow(BASE_PARAMS);

    const req = httpController.expectOne(r => r.url.includes('appTEST'));
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-key');
    req.flush({
      records: [
        { id: 'rec1', fields: { 'Period End': '2024-07-05', Revenue: 12500 } },
      ],
    });

    const result = await promise;
    expect(result).toEqual({ 'se.income.turnover': 12500 });
  });

  it('returns empty object when no record matches the period end date', async () => {
    const promise = service.readRow(BASE_PARAMS);

    httpController.expectOne(r => r.url.includes('appTEST')).flush({
      records: [
        { id: 'rec1', fields: { 'Period End': '2024-04-05', Revenue: 9000 } },
      ],
    });

    expect(await promise).toEqual({});
  });

  it('follows pagination offset to fetch all records', async () => {
    const promise = service.readRow(BASE_PARAMS);

    // Page 1 — no matching record, has offset
    httpController.expectOne(r => !r.params.has('offset')).flush({
      records: [{ id: 'rec1', fields: { 'Period End': '2024-04-05', Revenue: 9000 } }],
      offset: 'page2token',
    });

    // Let the async continuation run so page 2 request is issued
    await Promise.resolve();

    // Page 2 — matching record
    httpController.expectOne(r => r.params.get('offset') === 'page2token').flush({
      records: [{ id: 'rec2', fields: { 'Period End': '2024-07-05', Revenue: 12500 } }],
    });

    const result = await promise;
    expect(result).toEqual({ 'se.income.turnover': 12500 });
  });

  it('returns null for a mapped column that is absent or non-numeric', async () => {
    const promise = service.readRow({
      ...BASE_PARAMS,
      fieldMappings: { 'se.income.turnover': 'Revenue', 'se.income.other': 'Other' },
    });

    httpController.expectOne(r => r.url.includes('appTEST')).flush({
      records: [{ id: 'rec1', fields: { 'Period End': '2024-07-05', Revenue: 12500 } }],
    });

    const result = await promise;
    expect(result['se.income.turnover']).toBe(12500);
    expect(result['se.income.other']).toBeNull();
  });

  describe('readHeaders', () => {
    it('returns field names from the Metadata API when available', async () => {
      const promise = service.readHeaders('test-key', 'appTEST', 'MyTable');

      const metaReq = httpController.expectOne(r => r.url.includes('meta/bases'));
      expect(metaReq.request.headers.get('Authorization')).toBe('Bearer test-key');
      metaReq.flush({
        tables: [
          { name: 'MyTable', fields: [{ name: 'Period End' }, { name: 'Revenue' }] },
        ],
      });

      const result = await promise;
      expect(result).toEqual(['Period End', 'Revenue']);
    });

    it('falls back to first-record field keys when Metadata API fails', async () => {
      const promise = service.readHeaders('test-key', 'appTEST', 'MyTable');

      // Metadata API fails
      httpController.expectOne(r => r.url.includes('meta/bases')).flush(
        { error: 'NOT_FOUND' }, { status: 404, statusText: 'Not Found' },
      );
      // Await micro-task for catch block
      await Promise.resolve();

      // First-record fallback
      httpController.expectOne(r => r.url.includes('appTEST/MyTable')).flush({
        records: [{ id: 'rec1', fields: { Revenue: 12500, Admin: 300 } }],
      });

      const result = await promise;
      expect(result).toEqual(['Revenue', 'Admin']);
    });

    it('returns empty array when the table has no records (fallback path)', async () => {
      const promise = service.readHeaders('test-key', 'appTEST', 'EmptyTable');

      httpController.expectOne(r => r.url.includes('meta/bases')).flush(
        { error: 'NOT_FOUND' }, { status: 404, statusText: 'Not Found' },
      );
      await Promise.resolve();

      httpController.expectOne(r => r.url.includes('EmptyTable')).flush({ records: [] });

      const result = await promise;
      expect(result).toEqual([]);
    });
  });
});
