import { TestBed } from '@angular/core/testing';
import { PrivacyService } from './privacy.service';

describe('PrivacyService', () => {
  let service: PrivacyService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PrivacyService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should report isElectron false in browser context', () => {
    expect(service.isElectron).toBe(false);
  });

  it('checkConsent returns false in browser context', async () => {
    const result = await service.checkConsent();
    expect(result).toBe(false);
  });

  it('setConsent resolves without error in browser context', async () => {
    await expect(service.setConsent()).resolves.toBeUndefined();
  });

  it('deleteAllData resolves without error in browser context', async () => {
    await expect(service.deleteAllData()).resolves.toBeUndefined();
  });
});
