import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { IncomeAdjustmentsComponent } from './income-adjustments.component';

describe('IncomeAdjustmentsComponent', () => {
  let component: IncomeAdjustmentsComponent;
  let fixture: ComponentFixture<IncomeAdjustmentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IncomeAdjustmentsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(IncomeAdjustmentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

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
});
