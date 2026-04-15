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

  afterEach(() => TestBed.resetTestingModule());

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('renders the Quarterly Update heading', () => {
    const h1: HTMLElement = fixture.nativeElement.querySelector('h1');
    expect(h1.textContent).toContain('Quarterly Update');
  });

  it('shows no period tabs when unauthenticated', () => {
    const tabs: NodeList = fixture.nativeElement.querySelectorAll('.period-tab');
    expect(tabs.length).toBe(0);
  });

  it('shows no period card panel when unauthenticated', () => {
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

  it('selectedKey is null when no drafts are loaded', () => {
    const key = (component as unknown as { selectedKey: { (): string | null } }).selectedKey;
    expect(key()).toBeNull();
  });

  it('shows no period-tabs nav when unauthenticated', () => {
    const nav: HTMLElement | null = fixture.nativeElement.querySelector('.period-tabs');
    expect(nav).toBeNull();
  });
});
