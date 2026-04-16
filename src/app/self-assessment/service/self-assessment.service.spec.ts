import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { SelfAssessmentService } from './self-assessment.service';

const NINO     = 'AB123456C';
const TOKEN    = 'bearer-tok';
const TAX_YEAR = '2024-25';
const CALC_ID  = 'f2fb30e5-4ab6-4a29-b3c1-c7264259ff1c';

describe('SelfAssessmentService', () => {
  let service: SelfAssessmentService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SelfAssessmentService);
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

  // ── triggerCalculation ────────────────────────────────────────────────────

  it('triggerCalculation — POSTs to trigger/intent-to-finalise by default', async () => {
    const promise = service.triggerCalculation(NINO, TOKEN, TAX_YEAR);
    await Promise.resolve(); // allow fraudPrevention.getHeaders() microtask to resolve

    const req = http.expectOne(r =>
      r.url.includes(`/individuals/calculations/${NINO}/self-assessment/${TAX_YEAR}/trigger/intent-to-finalise`)
      && r.method === 'POST',
    );
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${TOKEN}`);
    expect(req.request.headers.get('Accept')).toContain('8.0');
    req.flush({ calculationId: CALC_ID });

    expect(await promise).toBe(CALC_ID);
  });

  it('triggerCalculation — POSTs to trigger/in-year when calculationType is in-year', async () => {
    const promise = service.triggerCalculation(NINO, TOKEN, TAX_YEAR, 'in-year');
    await Promise.resolve();

    const req = http.expectOne(r =>
      r.url.includes('/trigger/in-year') && r.method === 'POST',
    );
    req.flush({ calculationId: CALC_ID });
    expect(await promise).toBe(CALC_ID);
  });

  // ── retrieveCalculation ───────────────────────────────────────────────────

  it('retrieveCalculation — GETs the calculation and maps metadata', async () => {
    const promise = service.retrieveCalculation(NINO, TOKEN, TAX_YEAR, CALC_ID);
    await Promise.resolve();

    const req = http.expectOne(r =>
      r.url.includes(`/individuals/calculations/${NINO}/self-assessment/${TAX_YEAR}/${CALC_ID}`)
      && r.method === 'GET',
    );
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${TOKEN}`);
    req.flush({
      metadata: {
        calculationId: CALC_ID,
        taxYear: TAX_YEAR,
        calculationTimestamp: '2025-01-15T14:32:00Z',
        finalDeclaration: false,
      },
    });

    const result = await promise;
    expect(result.calculationId).toBe(CALC_ID);
    expect(result.taxYear).toBe(TAX_YEAR);
    expect(result.calculationTimestamp).toBe('2025-01-15T14:32:00Z');
    expect(result.crystallised).toBe(false);
  });

  it('retrieveCalculation — maps tax calculation totals', async () => {
    const promise = service.retrieveCalculation(NINO, TOKEN, TAX_YEAR, CALC_ID);
    await Promise.resolve();

    const req = http.expectOne(r => r.url.includes(CALC_ID) && r.method === 'GET');
    req.flush({
      metadata: {
        calculationId: CALC_ID, taxYear: TAX_YEAR,
        calculationTimestamp: '2025-01-15T14:32:00Z', finalDeclaration: true,
      },
      calculation: {
        taxCalculation: {
          incomeTax: {
            totalIncomeReceivedFromAllSources: 70000,
            personalAllowance: 12570,
            totalAllowancesAndDeductions: 14200,
            totalTaxableIncome: 55800,
            incomeTax: { totalAmount: 12820 },
          },
          nics: {
            class2Nics: { amount: 200 },
            class4Nics: { totalAmount: 2200 },
          },
          totalIncomeTaxAndNicsDue: 15220,
        },
      },
    });

    const result = await promise;
    expect(result.crystallised).toBe(true);
    expect(result.totalIncomeReceived).toBe(70000);
    expect(result.personalAllowance).toBe(12570);
    expect(result.totalAllowancesAndDeductions).toBe(14200);
    expect(result.totalTaxableIncome).toBe(55800);
    expect(result.incomeTaxDue).toBe(12820);
    expect(result.totalNic).toBe(2400);   // 200 + 2200
    expect(result.totalTaxDue).toBe(15220);
  });

  it('retrieveCalculation — maps businessProfitAndLoss by source type', async () => {
    const promise = service.retrieveCalculation(NINO, TOKEN, TAX_YEAR, CALC_ID);
    await Promise.resolve();

    const req = http.expectOne(r => r.url.includes(CALC_ID) && r.method === 'GET');
    req.flush({
      metadata: {
        calculationId: CALC_ID, taxYear: TAX_YEAR,
        calculationTimestamp: '2025-01-15T14:32:00Z', finalDeclaration: false,
      },
      calculation: {
        businessProfitAndLoss: [
          { typeOfBusiness: 'self-employment',      totalBusinessIncomeTaxableProfit: 45000 },
          { typeOfBusiness: 'uk-property',          totalBusinessIncomeTaxableProfit: 8000  },
          { typeOfBusiness: 'uk-property-fhl',      totalBusinessIncomeTaxableProfit: 4000  },
          { typeOfBusiness: 'foreign-property',     totalBusinessIncomeTaxableProfit: 6000  },
        ],
      },
    });

    const result = await promise;
    expect(result.selfEmploymentIncome).toBe(45000);
    expect(result.ukPropertyIncome).toBe(12000);       // 8000 + 4000
    expect(result.foreignPropertyIncome).toBe(6000);
  });

  it('retrieveCalculation — leaves income fields undefined when absent', async () => {
    const promise = service.retrieveCalculation(NINO, TOKEN, TAX_YEAR, CALC_ID);
    await Promise.resolve();

    const req = http.expectOne(r => r.url.includes(CALC_ID) && r.method === 'GET');
    req.flush({
      metadata: {
        calculationId: CALC_ID, taxYear: TAX_YEAR,
        calculationTimestamp: '2025-01-15T14:32:00Z', finalDeclaration: false,
      },
    });

    const result = await promise;
    expect(result.selfEmploymentIncome).toBeUndefined();
    expect(result.totalNic).toBeUndefined();
    expect(result.totalTaxDue).toBeUndefined();
  });

  // ── submitFinalDeclaration ────────────────────────────────────────────────

  it('submitFinalDeclaration — POSTs to the final-declaration endpoint', async () => {
    const promise = service.submitFinalDeclaration(NINO, TOKEN, TAX_YEAR, CALC_ID);
    await Promise.resolve();

    const req = http.expectOne(r =>
      r.url.includes(
        `/individuals/calculations/${NINO}/self-assessment/${TAX_YEAR}/${CALC_ID}/final-declaration`,
      )
      && r.method === 'POST',
    );
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${TOKEN}`);
    expect(req.request.headers.get('Accept')).toContain('8.0');
    req.flush(null, { status: 204, statusText: 'No Content' });

    await expect(promise).resolves.toBeUndefined();
  });
});
