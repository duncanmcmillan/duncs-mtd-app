import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AirtableSettingsComponent } from './airtable-settings.component';

describe('AirtableSettingsComponent', () => {
  let component: AirtableSettingsComponent;
  let fixture: ComponentFixture<AirtableSettingsComponent>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [AirtableSettingsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AirtableSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('renders the modal title', () => {
    const title: HTMLElement = fixture.nativeElement.querySelector('#airtable-modal-title');
    expect(title.textContent?.trim()).toContain('AirTable Settings');
  });

  it('renders four input fields', () => {
    const inputs: NodeList = fixture.nativeElement.querySelectorAll('input[matInput]');
    expect(inputs.length).toBe(4);
  });

  it('renders cancel and save buttons', () => {
    const buttons: NodeList = fixture.nativeElement.querySelectorAll('button');
    const texts = Array.from(buttons).map((b) => (b as HTMLElement).textContent?.trim());
    expect(texts).toContain('Cancel');
    expect(texts.some(t => t?.includes('Save'))).toBe(true);
  });
});
