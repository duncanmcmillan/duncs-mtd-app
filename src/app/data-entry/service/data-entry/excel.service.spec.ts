import { TestBed } from '@angular/core/testing';
import { ExcelService } from './excel.service';

describe('ExcelService', () => {
  let service: ExcelService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExcelService);
  });

  it('creates', () => expect(service).toBeTruthy());

  it('isElectron is false in test environment', () => {
    expect(service.isElectron).toBe(false);
  });

  it('readRow returns empty object when bridge is absent', async () => {
    const result = await service.readRow({
      filePath: '/any.xlsx',
      sheetName: 'Sheet1',
      dateColumn: 'Date',
      periodEndDate: '2025-03-31',
      fieldMappings: { 'se.income.turnover': 'Revenue' },
    });
    expect(result).toEqual({});
  });

  it('readHeaders returns empty array when bridge is absent', async () => {
    const result = await service.readHeaders('/any.xlsx', 'Sheet1');
    expect(result).toEqual([]);
  });
});
