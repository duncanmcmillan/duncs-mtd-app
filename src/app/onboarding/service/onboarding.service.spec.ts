import { TestBed } from '@angular/core/testing';
import { OnboardingService } from './onboarding.service';

describe('OnboardingService', () => {
  let service: OnboardingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OnboardingService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should not be electron in test environment', () => {
    expect(service.isElectron).toBe(false);
  });

  describe('loadProgress', () => {
    it('should return empty object in browser context', async () => {
      const result = await service.loadProgress();
      expect(result).toEqual({});
    });
  });

  describe('saveProgress', () => {
    it('should be a no-op in browser context', async () => {
      await expect(service.saveProgress('client1', ['AUTH_TAB'])).resolves.toBeUndefined();
    });
  });

  describe('resetProgress', () => {
    it('should be a no-op in browser context', async () => {
      await expect(service.resetProgress('client1')).resolves.toBeUndefined();
    });
  });
});
