import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { GoogleSheetsSettingsComponent } from './google-sheets-settings.component';

describe('GoogleSheetsSettingsComponent', () => {
  let component: GoogleSheetsSettingsComponent;
  let fixture: ComponentFixture<GoogleSheetsSettingsComponent>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [GoogleSheetsSettingsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(GoogleSheetsSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('renders the modal title', () => {
    const title: HTMLElement = fixture.nativeElement.querySelector('#google-sheets-modal-title');
    expect(title.textContent?.trim()).toContain('Google Sheets Settings');
  });

  it('renders all required input fields', () => {
    const inputs: NodeList = fixture.nativeElement.querySelectorAll('input[matInput]');
    // spreadsheetId, apiKey, dateColumn, selfEmploymentSheet, ukPropertySheet, foreignPropertySheet, Claude API key
    expect(inputs.length).toBe(7);
  });

  it('renders cancel and save buttons', () => {
    const buttons: NodeList = fixture.nativeElement.querySelectorAll('button');
    const texts = Array.from(buttons).map((b) => (b as HTMLElement).textContent?.trim());
    expect(texts).toContain('Cancel');
    expect(texts.some(t => t?.includes('Save'))).toBe(true);
  });
});
