import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { OnboardingStore } from './onboarding.store';
import { OnboardingService } from '../service/onboarding.service';
import { AppStore } from '../../core';
import { AuthStore } from '../../auth';

const mockOnboardingService = {
  isElectron: false,
  loadProgress: vi.fn().mockResolvedValue({}),
  saveProgress: vi.fn().mockResolvedValue(undefined),
  resetProgress: vi.fn().mockResolvedValue(undefined),
};

describe('OnboardingStore', () => {
  let store: InstanceType<typeof OnboardingStore>;

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: OnboardingService, useValue: mockOnboardingService },
        AppStore,
        AuthStore,
        OnboardingStore,
      ],
    });
    store = TestBed.inject(OnboardingStore);
  });

  it('should create', () => {
    expect(store).toBeTruthy();
  });

  describe('initial state', () => {
    it('should have bannerVisible true', () => {
      expect(store.bannerVisible()).toBe(true);
    });

    it('should have empty completedSteps', () => {
      expect(store.completedSteps()).toEqual([]);
    });

    it('should have empty activeRoute', () => {
      expect(store.activeRoute()).toBe('');
    });

    it('should have null error', () => {
      expect(store.error()).toBeNull();
    });
  });

  describe('currentStep', () => {
    it('should return null when activeRoute is empty and nino is null', () => {
      expect(store.currentStep()).toBeNull();
    });

    it('should return AUTH_TAB step when on /auth route and step not completed', () => {
      TestBed.runInInjectionContext(() => store.setActiveRoute('/auth'));
      const step = store.currentStep();
      expect(step?.id).toBe('AUTH_TAB');
    });

    it('should return null for AUTH_TAB when already completed', () => {
      TestBed.runInInjectionContext(() => store.setActiveRoute('/auth'));
      const appStore = TestBed.inject(AppStore);
      // Mark AUTH_TAB completed by patching state directly via completeStep
      // (mocked service, so just test state)
      void store.completeStep('AUTH_TAB');
      const step = store.currentStep();
      expect(step?.id).not.toBe('AUTH_TAB');
    });

    it('should return NAVIGATE_TO_SOURCES when nino is set and step not completed', () => {
      const appStore = TestBed.inject(AppStore);
      appStore.setNino('AB123456C');
      const step = store.currentStep();
      expect(step?.id).toBe('NAVIGATE_TO_SOURCES');
    });
  });

  describe('showBanner', () => {
    it('should be false when bannerVisible is false', () => {
      store.toggleBannerVisible(); // starts true, now false
      expect(store.showBanner()).toBe(false);
    });

    it('should be false when there is no current step', () => {
      expect(store.showBanner()).toBe(false); // no route, no nino → no step
    });

    it('should be true when banner is visible and there is a current step', () => {
      TestBed.runInInjectionContext(() => store.setActiveRoute('/auth'));
      expect(store.showBanner()).toBe(true);
    });
  });

  describe('toggleBannerVisible', () => {
    it('should toggle bannerVisible from true to false', () => {
      store.toggleBannerVisible();
      expect(store.bannerVisible()).toBe(false);
    });

    it('should toggle bannerVisible back to true', () => {
      store.toggleBannerVisible();
      store.toggleBannerVisible();
      expect(store.bannerVisible()).toBe(true);
    });
  });

  describe('setActiveRoute', () => {
    it('should update activeRoute', () => {
      store.setActiveRoute('/obligations');
      expect(store.activeRoute()).toBe('/obligations');
    });
  });

  describe('init', () => {
    it('should load completedSteps from service for the given clientId', async () => {
      mockOnboardingService.loadProgress.mockResolvedValueOnce({
        'my-client': ['AUTH_TAB'],
      });
      await store.init('my-client');
      expect(store.completedSteps()).toEqual(['AUTH_TAB']);
    });

    it('should set empty completedSteps if clientId not in progress', async () => {
      mockOnboardingService.loadProgress.mockResolvedValueOnce({});
      await store.init('unknown-client');
      expect(store.completedSteps()).toEqual([]);
    });

    it('should be a no-op for empty clientId', async () => {
      await store.init('');
      expect(mockOnboardingService.loadProgress).not.toHaveBeenCalled();
    });

    it('should set error on service failure', async () => {
      mockOnboardingService.loadProgress.mockRejectedValueOnce(new Error('disk error'));
      await store.init('client1');
      expect(store.error()).toBe('disk error');
    });
  });

  describe('completeStep', () => {
    it('should add step to completedSteps', async () => {
      await store.completeStep('AUTH_TAB');
      expect(store.completedSteps()).toContain('AUTH_TAB');
    });

    it('should not duplicate an already completed step', async () => {
      await store.completeStep('AUTH_TAB');
      await store.completeStep('AUTH_TAB');
      expect(store.completedSteps().filter(s => s === 'AUTH_TAB')).toHaveLength(1);
    });

    it('should call saveProgress on the service', async () => {
      await store.completeStep('AUTH_TAB');
      expect(mockOnboardingService.saveProgress).toHaveBeenCalled();
    });

    it('should set error if service save fails', async () => {
      mockOnboardingService.saveProgress.mockRejectedValueOnce(new Error('save failed'));
      await store.completeStep('NAVIGATE_TO_SOURCES');
      expect(store.error()).toBe('save failed');
    });
  });

  describe('resetForClientId', () => {
    it('should call resetProgress on the service', async () => {
      await store.resetForClientId('client1');
      expect(mockOnboardingService.resetProgress).toHaveBeenCalledWith('client1');
    });

    it('should clear completedSteps if clientId matches the current auth clientId', async () => {
      await store.completeStep('AUTH_TAB');
      // AuthStore.clientId() defaults to '' and resetForClientId for '' clears state
      await store.resetForClientId('');
      expect(store.completedSteps()).toEqual([]);
    });

    it('should set error if service reset fails', async () => {
      mockOnboardingService.resetProgress.mockRejectedValueOnce(new Error('reset failed'));
      await store.resetForClientId('client1');
      expect(store.error()).toBe('reset failed');
    });
  });
});
