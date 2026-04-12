import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { vi } from 'vitest';
import { PrivacyDialogComponent } from './privacy-dialog.component';
import { PrivacyService } from '../../service/privacy.service';

// jsdom does not implement mql.addListener — polyfill for CDK BreakpointObserver
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('PrivacyDialogComponent', () => {
  let component: PrivacyDialogComponent;
  let fixture: ComponentFixture<PrivacyDialogComponent>;
  let dialogRefClose: ReturnType<typeof vi.fn>;
  let setConsent: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    dialogRefClose = vi.fn();
    setConsent = vi.fn().mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [PrivacyDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: { close: dialogRefClose } },
        { provide: PrivacyService, useValue: { setConsent } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PrivacyDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the privacy notice title', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Privacy Notice');
  });

  it('agree() calls setConsent and closes the dialog with "agreed"', async () => {
    await component.agree();
    expect(setConsent).toHaveBeenCalled();
    expect(dialogRefClose).toHaveBeenCalledWith('agreed');
  });
});
