import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ClaudeApiService, FIELD_DEFINITIONS } from './claude-api.service';

describe('ClaudeApiService', () => {
  let service: ClaudeApiService;
  let httpController: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ClaudeApiService);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpController.verify();
    TestBed.resetTestingModule();
  });

  it('creates', () => expect(service).toBeTruthy());

  it('FIELD_DEFINITIONS contains se.income.turnover', () => {
    const keys = FIELD_DEFINITIONS.map(f => f.key);
    expect(keys).toContain('se.income.turnover');
  });

  it('sends correct headers to Anthropic API', async () => {
    const promise = service.suggestMappings('sk-ant-test', ['Revenue', 'Admin'], FIELD_DEFINITIONS);

    const req = httpController.expectOne('https://api.anthropic.com/v1/messages');
    expect(req.request.headers.get('x-api-key')).toBe('sk-ant-test');
    expect(req.request.headers.get('anthropic-version')).toBe('2023-06-01');
    expect(req.request.body.model).toBe('claude-haiku-4-5-20251001');

    req.flush({ content: [{ type: 'text', text: '{"Revenue":"se.income.turnover"}' }] });
    const result = await promise;
    expect(result).toEqual({ Revenue: 'se.income.turnover' });
  });

  it('returns empty object when response contains no JSON', async () => {
    const promise = service.suggestMappings('sk-ant-test', ['Revenue'], FIELD_DEFINITIONS);

    httpController.expectOne('https://api.anthropic.com/v1/messages').flush({
      content: [{ type: 'text', text: 'No mapping found.' }],
    });

    const result = await promise;
    expect(result).toEqual({});
  });
});
