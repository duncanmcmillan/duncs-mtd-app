import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { DataEntryBannerComponent } from './data-entry-banner.component';
import { DataEntryStore } from '../../store/data-entry.store';

describe('DataEntryBannerComponent', () => {
  let component: DataEntryBannerComponent;
  let fixture: ComponentFixture<DataEntryBannerComponent>;
  let store: InstanceType<typeof DataEntryStore>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [DataEntryBannerComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();
    store = TestBed.inject(DataEntryStore);
    fixture = TestBed.createComponent(DataEntryBannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('renders nothing when no method is active', () => {
    const banner: HTMLElement | null = fixture.nativeElement.querySelector('.de-banner');
    expect(banner).toBeNull();
  });

  it('shows label and detail when Excel is enabled', async () => {
    await store.saveDataEntry({
      manualEnabled: false,
      airtableEnabled: false,
      excelEnabled: true,
      googleSheetsEnabled: false,
      excel: { filePath: '/income.xlsx', dateColumn: '', fieldMappings: {} },
    });
    fixture.detectChanges();

    const label: HTMLElement | null = fixture.nativeElement.querySelector('.de-banner-label');
    expect(label?.textContent?.trim()).toBe('Local Excel');

    const detail: HTMLElement | null = fixture.nativeElement.querySelector('.de-banner-detail');
    expect(detail?.textContent?.trim()).toContain('/income.xlsx');
  });

  it('shows AirTable label when AirTable is enabled', async () => {
    await store.saveDataEntry({
      manualEnabled: false,
      airtableEnabled: true,
      excelEnabled: false,
      googleSheetsEnabled: false,
      airtable: { apiKey: 'key', baseId: 'appXXX', dateColumn: '', fieldMappings: {} },
    });
    fixture.detectChanges();

    const label: HTMLElement | null = fixture.nativeElement.querySelector('.de-banner-label');
    expect(label?.textContent?.trim()).toBe('AirTable');
  });

  it('emits refreshClick when the refresh button is clicked', async () => {
    await store.saveDataEntry({
      manualEnabled: false,
      airtableEnabled: false,
      excelEnabled: true,
      googleSheetsEnabled: false,
      excel: { filePath: '/income.xlsx', dateColumn: '', fieldMappings: {} },
    });
    fixture.detectChanges();

    let emitted = 0;
    component.refreshClick.subscribe(() => emitted++);

    const btn: HTMLElement = fixture.nativeElement.querySelector('.de-banner-refresh');
    btn.click();
    expect(emitted).toBe(1);
  });
});
