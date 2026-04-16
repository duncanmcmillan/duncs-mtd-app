import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ObligationsComponent } from './obligations.component';

describe('ObligationsComponent', () => {
  let component: ObligationsComponent;
  let fixture: ComponentFixture<ObligationsComponent>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ObligationsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ObligationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('renders the Obligations heading', () => {
    const h1: HTMLElement = fixture.nativeElement.querySelector('h1');
    expect(h1.textContent).toContain('Obligations');
  });

  it('shows the unauthenticated message when not signed in', () => {
    const el: HTMLElement | null = fixture.nativeElement.querySelector('.empty-state');
    expect(el).toBeTruthy();
    expect(el!.textContent).toContain('Not authenticated');
  });

  it('does not show a loading indicator in the initial unauthenticated state', () => {
    const el: HTMLElement | null = fixture.nativeElement.querySelector('.loading');
    expect(el).toBeNull();
  });

  it('does not show an error in the initial unauthenticated state', () => {
    const el: HTMLElement | null = fixture.nativeElement.querySelector('.error');
    expect(el).toBeNull();
  });

  it('does not show raw response section before any fetch', () => {
    const el: HTMLElement | null = fixture.nativeElement.querySelector('.raw-response');
    expect(el).toBeNull();
  });
});
