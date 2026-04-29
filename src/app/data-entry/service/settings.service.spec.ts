import { TestBed } from '@angular/core/testing';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  let service: SettingsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SettingsService);
  });

  it('creates', () => {
    expect(service).toBeTruthy();
  });

  it('isElectron is false in browser/test environment', () => {
    expect(service.isElectron).toBe(false);
  });

  it('loadDataEntry() returns null when not in Electron', async () => {
    const result = await service.loadDataEntry();
    expect(result).toBeNull();
  });

  it('saveDataEntry() is a no-op when not in Electron', async () => {
    await expect(
      service.saveDataEntry({ manualEnabled: true, airtableEnabled: false, excelEnabled: false, googleSheetsEnabled: false })
    ).resolves.toBeUndefined();
  });

  it('loadNotifications() returns null when not in Electron', async () => {
    const result = await service.loadNotifications();
    expect(result).toBeNull();
  });

  it('saveNotifications() is a no-op when not in Electron', async () => {
    await expect(
      service.saveNotifications({ telegramEnabled: false, whatsappEnabled: false })
    ).resolves.toBeUndefined();
  });
});
