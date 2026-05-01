import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppSettings } from '../../model/data-entry.model';

const SETTINGS: WhatsAppSettings = {
  accessToken: 'EAA-test-token',
  phoneNumberId: '123456789012345',
  recipientNumber: '+447911123456',
};

describe('WhatsAppService', () => {
  let service: WhatsAppService;
  let httpController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(WhatsAppService);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpController.verify());

  it('creates', () => {
    expect(service).toBeTruthy();
  });

  it('POSTs to the correct Meta Graph URL with Authorization header', async () => {
    const sendPromise = service.sendMessage(SETTINGS, 'Hello');
    const req = httpController.expectOne(
      `https://graph.facebook.com/v21.0/${SETTINGS.phoneNumberId}/messages`,
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${SETTINGS.accessToken}`);
    expect(req.request.body).toEqual({
      messaging_product: 'whatsapp',
      to: SETTINGS.recipientNumber,
      type: 'text',
      text: { body: 'Hello' },
    });
    req.flush({ messages: [{ id: 'wamid.test' }] });
    await sendPromise;
  });

  it('throws when the HTTP call fails', async () => {
    const sendPromise = service.sendMessage(SETTINGS, 'Hello');
    const req = httpController.expectOne(
      `https://graph.facebook.com/v21.0/${SETTINGS.phoneNumberId}/messages`,
    );
    req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
    await expect(sendPromise).rejects.toThrow();
  });
});
