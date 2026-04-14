import { vi } from 'vitest';

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

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { OnboardingBannerComponent } from './onboarding-banner.component';
import { OnboardingStore } from '../store/onboarding.store';
import { OnboardingService } from '../service/onboarding.service';
import { AppStore } from '../../core';
import { AuthStore } from '../../auth';
import { ONBOARDING_STEPS } from '../model/onboarding.model';

const mockOnboardingService = {
  isElectron: false,
  loadProgress: vi.fn().mockResolvedValue({}),
  saveProgress: vi.fn().mockResolvedValue(undefined),
  resetProgress: vi.fn().mockResolvedValue(undefined),
};

describe('OnboardingBannerComponent', () => {
  let component: OnboardingBannerComponent;
  let fixture: ComponentFixture<OnboardingBannerComponent>;
  let store: InstanceType<typeof OnboardingStore>;

  beforeEach(async () => {
    vi.clearAllMocks();
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [OnboardingBannerComponent],
      providers: [
        provideRouter([]),
        { provide: OnboardingService, useValue: mockOnboardingService },
        AppStore,
        AuthStore,
        OnboardingStore,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OnboardingBannerComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(OnboardingStore);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('when showBanner is false', () => {
    it('should not render the banner', () => {
      const banner = fixture.nativeElement.querySelector('.onboarding-banner');
      expect(banner).toBeNull();
    });
  });

  describe('when showBanner is true', () => {
    beforeEach(() => {
      // Navigate to /auth to trigger AUTH_TAB step
      store.setActiveRoute('/auth');
      fixture.detectChanges();
    });

    it('should render the banner', () => {
      const banner = fixture.nativeElement.querySelector('.onboarding-banner');
      expect(banner).not.toBeNull();
    });

    it('should display the current step message', () => {
      const message = fixture.nativeElement.querySelector('.onboarding-banner__message');
      expect(message.textContent.trim()).toContain(ONBOARDING_STEPS[0].message.slice(0, 20));
    });

    it('should have role=status and aria-live=polite', () => {
      const banner = fixture.nativeElement.querySelector('.onboarding-banner');
      expect(banner.getAttribute('role')).toBe('status');
      expect(banner.getAttribute('aria-live')).toBe('polite');
    });

    it('should have a close button with aria-label', () => {
      const btn = fixture.nativeElement.querySelector('button');
      expect(btn).not.toBeNull();
      expect(btn.getAttribute('aria-label')).toBe('Dismiss onboarding tip');
    });

    it('should call completeStep when close button is clicked', async () => {
      const btn = fixture.nativeElement.querySelector('button');
      btn.click();
      fixture.detectChanges();
      await fixture.whenStable();
      expect(mockOnboardingService.saveProgress).toHaveBeenCalled();
    });
  });

  describe('toggleBannerVisible', () => {
    it('should hide the banner when toggled off', () => {
      store.setActiveRoute('/auth');
      fixture.detectChanges();
      store.toggleBannerVisible();
      fixture.detectChanges();
      const banner = fixture.nativeElement.querySelector('.onboarding-banner');
      expect(banner).toBeNull();
    });
  });
});
