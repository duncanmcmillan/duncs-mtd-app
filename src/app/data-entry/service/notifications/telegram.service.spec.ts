import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TelegramService } from './telegram.service';
import { TelegramSettings } from '../../model/data-entry.model';

const SETTINGS: TelegramSettings = { botToken: 'test-token-123', chatId: '-100987654321' };

describe('TelegramService', () => {
  let service: TelegramService;
  let httpController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TelegramService);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpController.verify());

  it('creates', () => {
    expect(service).toBeTruthy();
  });

  it('POSTs to the correct Telegram URL with bot token and chat_id', async () => {
    const sendPromise = service.sendMessage(SETTINGS, 'Hello');
    const req = httpController.expectOne(
      `https://api.telegram.org/bot${SETTINGS.botToken}/sendMessage`,
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      chat_id: SETTINGS.chatId,
      text: 'Hello',
      parse_mode: 'Markdown',
    });
    req.flush({ ok: true });
    await sendPromise;
  });

  it('throws when the HTTP call fails', async () => {
    const sendPromise = service.sendMessage(SETTINGS, 'Hello');
    const req = httpController.expectOne(
      `https://api.telegram.org/bot${SETTINGS.botToken}/sendMessage`,
    );
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    await expect(sendPromise).rejects.toThrow();
  });
});
