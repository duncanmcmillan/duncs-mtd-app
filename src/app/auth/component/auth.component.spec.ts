import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthComponent } from './auth.component';

describe('AuthComponent', () => {
  let fixture: ComponentFixture<AuthComponent>;
  let component: AuthComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture   = TestBed.createComponent(AuthComponent);
    component = fixture.componentInstance;
  });

  // ── Creation ───────────────────────────────────────────────────────────────

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('isElectron — false in test environment', () => {
    // Access protected member via type cast for testing purposes
    expect((component as unknown as { isElectron: boolean }).isElectron).toBe(false);
  });

  // ── formatExpiry ───────────────────────────────────────────────────────────

  describe('formatExpiry()', () => {
    /** Helper to access the protected method under test. */
    function formatExpiry(expiresAt: number | null): string {
      return (component as unknown as { formatExpiry: (v: number | null) => string })
        .formatExpiry(expiresAt);
    }

    it('returns "—" when expiresAt is null', () => {
      expect(formatExpiry(null)).toBe('—');
    });

    it('returns "Expired" when expiresAt is in the past', () => {
      // Use 2 minutes in the past so Math.round gives a clearly negative value
      expect(formatExpiry(Date.now() - 120_000)).toBe('Expired');
    });

    it('returns minutes when less than 60 minutes remain', () => {
      expect(formatExpiry(Date.now() + 30 * 60_000)).toBe('30 min');
    });

    it('returns hours when 60 or more minutes remain', () => {
      expect(formatExpiry(Date.now() + 240 * 60_000)).toBe('4 hr');
    });

    it('rounds minutes correctly', () => {
      // 45.6 minutes → rounds to 46
      expect(formatExpiry(Date.now() + 45.6 * 60_000)).toBe('46 min');
    });
  });

  // ── Template ───────────────────────────────────────────────────────────────

  it('renders the auth view container', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.auth-view')).toBeTruthy();
  });

  it('shows the auth warning when not in Electron', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.auth-warning')).toBeTruthy();
  });

  it('shows the sign-in form when unauthenticated', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.auth-card')).toBeTruthy();
  });

  it('shows the setup help section', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.auth-help')).toBeTruthy();
  });
});
