import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { IncomeAdjustmentsComponent } from './income-adjustments.component';

describe('IncomeAdjustmentsComponent', () => {
  let component: IncomeAdjustmentsComponent;
  let fixture: ComponentFixture<IncomeAdjustmentsComponent>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [IncomeAdjustmentsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(IncomeAdjustmentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('renders the Income & Adjustments heading', () => {
    const h1: HTMLElement = fixture.nativeElement.querySelector('h1');
    expect(h1.textContent).toContain('Income');
    expect(h1.textContent).toContain('Adjustments');
  });

  it('shows the unauthenticated empty state before data loads', () => {
    const el: HTMLElement | null = fixture.nativeElement.querySelector('.empty-state');
    expect(el).toBeTruthy();
    expect(el!.textContent).toContain('Not authenticated');
  });

  it('does not show a loading indicator in the initial state', () => {
    const el: HTMLElement | null = fixture.nativeElement.querySelector('.loading');
    expect(el).toBeNull();
  });

  it('does not show an error in the initial state', () => {
    const el: HTMLElement | null = fixture.nativeElement.querySelector('.status--error');
    expect(el).toBeNull();
  });

  it('does not show panels before data is loaded', () => {
    const panel: HTMLElement | null = fixture.nativeElement.querySelector('.ia-panel');
    expect(panel).toBeNull();
  });

  it('shows section nav and source tabs after seeding test data', () => {
    const store = (component as unknown as { store: { seedTestData: () => void } }).store;
    store.seedTestData();
    fixture.detectChanges();

    const sectionNav: HTMLElement | null = fixture.nativeElement.querySelector('.section-nav');
    expect(sectionNav).toBeTruthy();

    const sourceTabs = fixture.nativeElement.querySelectorAll('.source-tab');
    expect(sourceTabs.length).toBe(3);
  });

  it('shows the allowances table after seeding', () => {
    const store = (component as unknown as { store: { seedTestData: () => void } }).store;
    store.seedTestData();
    fixture.detectChanges();

    const table: HTMLElement | null = fixture.nativeElement.querySelector('.fields-table');
    expect(table).toBeTruthy();
  });

  it('shows Confirm & Submit button in allowances panel after seeding', () => {
    const store = (component as unknown as { store: { seedTestData: () => void } }).store;
    store.seedTestData();
    fixture.detectChanges();

    const btn: HTMLElement | null = fixture.nativeElement.querySelector('.btn--primary');
    expect(btn?.textContent?.trim()).toBe('Confirm & Submit to HMRC');
  });

  it('shows View History button in allowances panel after seeding', () => {
    const store = (component as unknown as { store: { seedTestData: () => void } }).store;
    store.seedTestData();
    fixture.detectChanges();

    const buttons: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.btn--outline');
    const labels = Array.from(buttons).map(b => b.textContent?.trim());
    expect(labels).toContain('View History');
  });

  it('shows history panel after clicking View History', () => {
    const store = (component as unknown as { store: { seedTestData: () => void } }).store;
    store.seedTestData();
    fixture.detectChanges();

    const historyBtn: HTMLElement = Array.from(
      fixture.nativeElement.querySelectorAll('.btn--outline') as NodeListOf<HTMLElement>,
    ).find(b => b.textContent?.trim() === 'View History')!;
    historyBtn.click();
    fixture.detectChanges();

    const panel: HTMLElement | null = fixture.nativeElement.querySelector('.history-panel');
    expect(panel).toBeTruthy();
  });

  it('shows Confirm & Submit button in dividends section after seeding', () => {
    const store = (component as unknown as { store: { seedTestData: () => void } }).store;
    store.seedTestData();
    fixture.detectChanges();

    // Switch to dividends section
    const sectionBtns: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.section-nav-btn');
    const dividendsBtn = Array.from(sectionBtns).find(b => b.textContent?.trim() === 'Dividends')!;
    dividendsBtn.click();
    fixture.detectChanges();

    const btn: HTMLElement | null = fixture.nativeElement.querySelector('.btn--primary');
    expect(btn?.textContent?.trim()).toBe('Confirm & Submit to HMRC');
  });

  it('shows grouped adjustment rows in adjustments section after seeding', () => {
    const store = (component as unknown as { store: { seedTestData: () => void } }).store;
    store.seedTestData();
    fixture.detectChanges();

    // Switch to adjustments section
    const sectionBtns: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.section-nav-btn');
    const adjBtn = Array.from(sectionBtns).find(b => b.textContent?.trim() === 'Adjustments')!;
    adjBtn.click();
    fixture.detectChanges();

    const groupHeaders = fixture.nativeElement.querySelectorAll('.adj-group-header');
    expect(groupHeaders.length).toBeGreaterThan(0);
  });
});
