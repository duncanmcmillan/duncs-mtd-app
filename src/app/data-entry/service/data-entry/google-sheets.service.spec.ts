import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { GoogleSheetsService } from './google-sheets.service';

const BASE_PARAMS = {
  spreadsheetId: 'sheet123',
  sheetName: 'SE-2024',
  apiKey: 'test-api-key',
  dateColumn: 'Quarter End Date',
  periodEndDate: '2024-07-05',
  fieldMappings: { 'se.income.turnover': 'Revenue' },
};

const SHEET_URL = 'https://sheets.googleapis.com/v4/spreadsheets/sheet123/values/SE-2024';

describe('GoogleSheetsService', () => {
  let service: GoogleSheetsService;
  let httpController: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(GoogleSheetsService);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpController.verify();
    TestBed.resetTestingModule();
  });

  it('creates', () => expect(service).toBeTruthy());

  it('returns mapped numeric values for a matching row', async () => {
    const promise = service.readRow(BASE_PARAMS);

    const req = httpController.expectOne(r => r.url === SHEET_URL && r.params.get('key') === 'test-api-key');
    req.flush({
      values: [
        ['Quarter End Date', 'Revenue'],
        ['2024-07-05', '18450'],
      ],
    });

    const result = await promise;
    expect(result).toEqual({ 'se.income.turnover': 18450 });
  });

  it('returns empty object when no row matches the period end date', async () => {
    const promise = service.readRow(BASE_PARAMS);

    httpController.expectOne(r => r.url === SHEET_URL).flush({
      values: [
        ['Quarter End Date', 'Revenue'],
        ['2024-04-05', '9000'],
      ],
    });

    expect(await promise).toEqual({});
  });

  it('returns empty object when the sheet has fewer than 2 rows', async () => {
    const promise = service.readRow(BASE_PARAMS);

    httpController.expectOne(r => r.url === SHEET_URL).flush({
      values: [['Quarter End Date', 'Revenue']],
    });

    expect(await promise).toEqual({});
  });

  it('returns empty object when the date column is not found', async () => {
    const promise = service.readRow({ ...BASE_PARAMS, dateColumn: 'NonExistent' });

    httpController.expectOne(r => r.url === SHEET_URL).flush({
      values: [
        ['Quarter End Date', 'Revenue'],
        ['2024-07-05', '18450'],
      ],
    });

    expect(await promise).toEqual({});
  });

  it('parses string numeric values with commas', async () => {
    const promise = service.readRow(BASE_PARAMS);

    httpController.expectOne(r => r.url === SHEET_URL).flush({
      values: [
        ['Quarter End Date', 'Revenue'],
        ['2024-07-05', '18,450.50'],
      ],
    });

    const result = await promise;
    expect(result['se.income.turnover']).toBeCloseTo(18450.5);
  });

  it('returns null for a mapped column that is absent or empty', async () => {
    const promise = service.readRow({
      ...BASE_PARAMS,
      fieldMappings: { 'se.income.turnover': 'Revenue', 'se.income.other': 'Other Income' },
    });

    httpController.expectOne(r => r.url === SHEET_URL).flush({
      values: [
        ['Quarter End Date', 'Revenue'],
        ['2024-07-05', '18450'],
      ],
    });

    const result = await promise;
    expect(result['se.income.turnover']).toBe(18450);
    expect(result['se.income.other']).toBeNull();
  });

  it('throws when the Sheets API returns an HTTP error', async () => {
    const promise = service.readRow(BASE_PARAMS);

    httpController.expectOne(r => r.url === SHEET_URL).flush(
      { error: { code: 403, message: 'API key invalid' } },
      { status: 403, statusText: 'Forbidden' },
    );

    await expect(promise).rejects.toThrow();
  });

  describe('readHeaders', () => {
    it('returns the first row as an array of header strings', async () => {
      const promise = service.readHeaders('sheet123', 'test-api-key', 'SE-2024');

      const req = httpController.expectOne(r => r.url.includes('SE-2024!1:1'));
      expect(req.request.params.get('key')).toBe('test-api-key');
      req.flush({ values: [['Quarter End Date', 'Revenue', 'Admin Costs']] });

      const result = await promise;
      expect(result).toEqual(['Quarter End Date', 'Revenue', 'Admin Costs']);
    });

    it('returns empty array when the sheet is empty', async () => {
      const promise = service.readHeaders('sheet123', 'test-api-key', 'EmptySheet');

      httpController.expectOne(r => r.url.includes('EmptySheet')).flush({});

      expect(await promise).toEqual([]);
    });

    it('throws when the Sheets API returns an HTTP error', async () => {
      const promise = service.readHeaders('sheet123', 'bad-key', 'SE-2024');

      httpController.expectOne(r => r.url.includes('SE-2024')).flush(
        { error: { code: 400, message: 'Bad Request' } },
        { status: 400, statusText: 'Bad Request' },
      );

      await expect(promise).rejects.toThrow();
    });
  });
});
