import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { DataEntryComponent } from './data-entry.component';

describe('DataEntryComponent', () => {
  let component: DataEntryComponent;
  let fixture: ComponentFixture<DataEntryComponent>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [DataEntryComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(DataEntryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('renders the page heading', () => {
    const h1: HTMLElement = fixture.nativeElement.querySelector('h1');
    expect(h1.textContent).toContain('Data Entry');
  });

  it('renders two sub-tab buttons', () => {
    const tabs: NodeList = fixture.nativeElement.querySelectorAll('[role="tab"]');
    expect(tabs.length).toBe(2);
  });

  it('shows Data Entry tab as active by default', () => {
    const tabs: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('[role="tab"]'));
    const activeTab = tabs.find(t => t.getAttribute('aria-selected') === 'true');
    expect(activeTab?.textContent?.trim()).toBe('Data Entry');
  });

  it('shows 4 method cards on the Data Entry tab', () => {
    const cards: NodeList = fixture.nativeElement.querySelectorAll('app-method-card');
    expect(cards.length).toBe(4);
  });

  it('switching to Notifications tab shows 2 method cards', () => {
    const tabs: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('[role="tab"]'));
    const notifTab = tabs.find(t => t.textContent?.trim() === 'Notifications') as HTMLElement;
    notifTab.click();
    fixture.detectChanges();
    const cards: NodeList = fixture.nativeElement.querySelectorAll('app-method-card');
    expect(cards.length).toBe(2);
  });

  it('no settings modal is shown initially', () => {
    const modals = [
      'app-airtable-settings',
      'app-excel-settings',
      'app-google-sheets-settings',
      'app-telegram-settings',
      'app-whatsapp-settings',
    ].map(sel => fixture.nativeElement.querySelector(sel));
    expect(modals.every(m => m === null)).toBe(true);
  });
});
