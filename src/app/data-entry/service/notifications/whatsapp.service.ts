/**
 * @fileoverview Service for sending messages via the Meta Cloud API (WhatsApp Business).
 */
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { WhatsAppSettings } from '../../model/data-entry.model';

/**
 * Sends messages to a WhatsApp recipient via the Meta Cloud API.
 */
@Injectable({ providedIn: 'root' })
export class WhatsAppService {
  private readonly http = inject(HttpClient);

  /**
   * Sends a plain-text WhatsApp message to the configured recipient.
   * @param settings Meta Cloud API credentials and recipient number.
   * @param text The message body.
   * @throws When the HTTP call fails (non-2xx response or network error).
   */
  async sendMessage(settings: WhatsAppSettings, text: string): Promise<void> {
    const url = `https://graph.facebook.com/v21.0/${settings.phoneNumberId}/messages`;
    const headers = new HttpHeaders({ Authorization: `Bearer ${settings.accessToken}` });
    await firstValueFrom(
      this.http.post(
        url,
        {
          messaging_product: 'whatsapp',
          to: settings.recipientNumber,
          type: 'text',
          text: { body: text },
        },
        { headers },
      ),
    );
  }
}
