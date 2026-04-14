import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { QuarterlyComponent } from './quarterly.component';

describe('QuarterlyComponent', () => {
  let component: QuarterlyComponent;
  let fixture: ComponentFixture<QuarterlyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuarterlyComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(QuarterlyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('renders the Quarterly Update heading', () => {
    const h1: HTMLElement = fixture.nativeElement.querySelector('h1');
    expect(h1.textContent).toContain('Quarterly Update');
  });

  it('shows no period cards when unauthenticated', () => {
    const cards: NodeList = fixture.nativeElement.querySelectorAll('.period-card');
    expect(cards.length).toBe(0);
  });

  it('does not show the expenses modal initially', () => {
    const modal: HTMLElement | null = fixture.nativeElement.querySelector('app-expenses-modal');
    expect(modal).toBeNull();
  });

  it('shows the empty-state message when not authenticated', () => {
    const status: HTMLElement | null = fixture.nativeElement.querySelector('.status');
    expect(status).toBeTruthy();
  });
});
