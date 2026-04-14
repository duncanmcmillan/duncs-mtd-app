import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ExpensesModalComponent } from './expenses-modal.component';

describe('ExpensesModalComponent', () => {
  let component: ExpensesModalComponent;
  let fixture: ComponentFixture<ExpensesModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpensesModalComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ExpensesModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('renders nothing when no draft is active', () => {
    // activeExpensesDraft() returns null by default, so the @if block is empty
    const panel: HTMLElement | null = fixture.nativeElement.querySelector('.modal-panel');
    expect(panel).toBeNull();
  });

  it('defaults activeTab to allowable', () => {
    expect((component as unknown as { activeTab: string }).activeTab).toBe('allowable');
  });

  it('exposes seExpenseRows for the template', () => {
    const rows = (component as unknown as { seExpenseRows: unknown[] }).seExpenseRows;
    expect(rows.length).toBeGreaterThan(0);
  });

  it('exposes propExpenseRows for the template', () => {
    const rows = (component as unknown as { propExpenseRows: unknown[] }).propExpenseRows;
    expect(rows.length).toBeGreaterThan(0);
  });
});
