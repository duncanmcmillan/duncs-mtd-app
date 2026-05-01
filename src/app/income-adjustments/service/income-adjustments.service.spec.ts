import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { IncomeAdjustmentsService } from './income-adjustments.service';
import { AllowanceEntry, AdjustmentEntry, DividendEntry } from '../model/income-adjustments.model';

const NINO  = 'AB123456C';
const TOKEN = 'bearer-tok';
const BIZ_ID = 'XKIS00000000988';
const TAX_YEAR = '2024-25';
const CALC_ID  = 'c75f40a6-a3df-4429-a697-471eeec46435';

const SE_ALLOWANCE: AllowanceEntry = {
  businessId: BIZ_ID,
  typeOfBusiness: 'self-employment',
  taxYear: TAX_YEAR,
  annualInvestmentAllowance: 50000,
  capitalAllowanceMainPool: 12500,
};

const SE_ADJUSTMENT: AdjustmentEntry = {
  businessId: BIZ_ID,
  typeOfBusiness: 'self-employment',
  taxYear: TAX_YEAR,
  calculationId: CALC_ID,
  turnover: 500,
  otherIncome: 200,
  costOfGoods: -150,
  costOfGoodsDisallowable: 100,
};

const DIVIDEND_ENTRY: DividendEntry = {
  taxYear: TAX_YEAR,
  ukDividends: 2500,
  otherUkDividends: 800,
  foreignDividends: [
    { countryCode: 'DEU', amount: 300, taxableAmount: 255, taxTakenOff: 45 },
  ],
};

describe('IncomeAdjustmentsService', () => {
  let service: IncomeAdjustmentsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(IncomeAdjustmentsService);
    http    = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  // ── creates ───────────────────────────────────────────────────────────────

  it('creates', () => {
    expect(service).toBeTruthy();
  });

  // ── submitAllowances ──────────────────────────────────────────────────────

  it('submitAllowances — PUTs to the SE annual submission endpoint', async () => {
    const promise = service.submitAllowances(SE_ALLOWANCE, NINO, TOKEN);
    await Promise.resolve();

    const req = http.expectOne(r =>
      r.url.includes(`/individuals/business/self-employment/${NINO}/${BIZ_ID}/annual/${TAX_YEAR}`)
      && r.method === 'PUT',
    );
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${TOKEN}`);
    expect(req.request.headers.get('Accept')).toContain('5.0');
    expect(req.request.body['allowances']['annualInvestmentAllowance']).toBe(50000);
    expect(req.request.body['allowances']['capitalAllowanceMainPool']).toBe(12500);
    req.flush(null, { status: 204, statusText: 'No Content' });

    await expect(promise).resolves.toBeUndefined();
  });

  it('submitAllowances — omits undefined fields from the body', async () => {
    const entry: AllowanceEntry = {
      businessId: BIZ_ID,
      typeOfBusiness: 'self-employment',
      taxYear: TAX_YEAR,
      tradingIncomeAllowance: 1000,
    };
    const promise = service.submitAllowances(entry, NINO, TOKEN);
    await Promise.resolve();

    const req = http.expectOne(r => r.url.includes(BIZ_ID) && r.method === 'PUT');
    expect(req.request.body['allowances']).toEqual({ tradingIncomeAllowance: 1000 });
    req.flush(null, { status: 204, statusText: 'No Content' });

    await expect(promise).resolves.toBeUndefined();
  });

  it('submitAllowances — throws for non-SE business types', async () => {
    const entry: AllowanceEntry = { ...SE_ALLOWANCE, typeOfBusiness: 'uk-property' };
    await expect(service.submitAllowances(entry, NINO, TOKEN)).rejects.toThrow();
  });

  // ── triggerBsas ───────────────────────────────────────────────────────────

  it('triggerBsas — POSTs to the BSAS trigger endpoint and returns calculationId', async () => {
    const promise = service.triggerBsas(SE_ADJUSTMENT, NINO, TOKEN);
    await Promise.resolve();

    const req = http.expectOne(r =>
      r.url.includes(`/individuals/self-assessment/adjustable-summary/${NINO}/trigger`)
      && r.method === 'POST',
    );
    expect(req.request.headers.get('Accept')).toContain('7.0');
    expect(req.request.body['typeOfBusiness']).toBe('self-employment');
    expect(req.request.body['businessId']).toBe(BIZ_ID);
    expect(req.request.body['accountingPeriod']['startDate']).toBe('2024-04-06');
    expect(req.request.body['accountingPeriod']['endDate']).toBe('2025-04-05');
    req.flush({ calculationId: CALC_ID });

    expect(await promise).toBe(CALC_ID);
  });

  // ── submitBsasAdjustments ─────────────────────────────────────────────────

  it('submitBsasAdjustments — POSTs to the SE adjust endpoint with nested body', async () => {
    const promise = service.submitBsasAdjustments(SE_ADJUSTMENT, NINO, TOKEN);
    await Promise.resolve();

    const req = http.expectOne(r =>
      r.url.includes(`/self-employment/${CALC_ID}/adjust/${TAX_YEAR}`)
      && r.method === 'POST',
    );
    expect(req.request.headers.get('Accept')).toContain('7.0');
    expect(req.request.body['income']['turnover']).toBe(500);
    expect(req.request.body['income']['other']).toBe(200);
    expect(req.request.body['expenses']['costOfGoods']).toBe(-150);
    expect(req.request.body['additions']['costOfGoodsDisallowable']).toBe(100);
    req.flush(null, { status: 200, statusText: 'OK' });

    await expect(promise).resolves.toBeUndefined();
  });

  it('submitBsasAdjustments — omits empty top-level objects from body', async () => {
    const entry: AdjustmentEntry = {
      businessId: BIZ_ID,
      typeOfBusiness: 'self-employment',
      taxYear: TAX_YEAR,
      calculationId: CALC_ID,
      turnover: 100,
      // no expenses or additions
    };
    const promise = service.submitBsasAdjustments(entry, NINO, TOKEN);
    await Promise.resolve();

    const req = http.expectOne(r => r.url.includes(CALC_ID) && r.method === 'POST');
    expect(req.request.body['income']).toBeDefined();
    expect(req.request.body['expenses']).toBeUndefined();
    expect(req.request.body['additions']).toBeUndefined();
    req.flush(null, { status: 200, statusText: 'OK' });

    await expect(promise).resolves.toBeUndefined();
  });

  it('submitBsasAdjustments — throws when calculationId is missing', async () => {
    const entry: AdjustmentEntry = { ...SE_ADJUSTMENT, calculationId: undefined };
    await expect(service.submitBsasAdjustments(entry, NINO, TOKEN)).rejects.toThrow();
  });

  // ── submitUkDividends ─────────────────────────────────────────────────────

  it('submitUkDividends — PUTs to the UK dividends endpoint', async () => {
    const promise = service.submitUkDividends(DIVIDEND_ENTRY, NINO, TOKEN);
    await Promise.resolve();

    const req = http.expectOne(r =>
      r.url.includes(`/individuals/dividends-income/uk/${NINO}/${TAX_YEAR}`)
      && r.method === 'PUT',
    );
    expect(req.request.headers.get('Accept')).toContain('2.0');
    expect(req.request.body['ukDividends']).toBe(2500);
    expect(req.request.body['otherUkDividends']).toBe(800);
    req.flush(null, { status: 200, statusText: 'OK' });

    await expect(promise).resolves.toBeUndefined();
  });

  // ── submitForeignDividends ────────────────────────────────────────────────

  it('submitForeignDividends — PUTs to the foreign dividends endpoint', async () => {
    const promise = service.submitForeignDividends(DIVIDEND_ENTRY, NINO, TOKEN);
    await Promise.resolve();

    const req = http.expectOne(r =>
      r.url.includes(`/individuals/dividends-income/${NINO}/${TAX_YEAR}`)
      && !r.url.includes('/uk/')
      && r.method === 'PUT',
    );
    expect(req.request.headers.get('Accept')).toContain('2.0');
    const fd = req.request.body['foreignDividend'][0];
    expect(fd['countryCode']).toBe('DEU');
    expect(fd['amountBeforeTax']).toBe(300);
    expect(fd['taxableAmount']).toBe(255);
    expect(fd['taxTakenOff']).toBe(45);
    req.flush(null, { status: 200, statusText: 'OK' });

    await expect(promise).resolves.toBeUndefined();
  });

  it('submitForeignDividends — defaults taxableAmount to amount when not set', async () => {
    const entry: DividendEntry = {
      taxYear: TAX_YEAR,
      foreignDividends: [{ countryCode: 'FRA', amount: 500 }],
    };
    const promise = service.submitForeignDividends(entry, NINO, TOKEN);
    await Promise.resolve();

    const req = http.expectOne(r => r.url.includes(`/dividends-income/${NINO}`) && r.method === 'PUT');
    expect(req.request.body['foreignDividend'][0]['taxableAmount']).toBe(500);
    req.flush(null, { status: 200, statusText: 'OK' });

    await expect(promise).resolves.toBeUndefined();
  });
});
