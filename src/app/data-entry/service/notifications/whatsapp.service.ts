/**
 * @fileoverview Stub service for the WhatsApp (Meta Cloud API) notification channel.
 * Will send messages via the Meta Cloud API. No-op implementation until wired up.
 */
import { Injectable } from '@angular/core';

/**
 * Service stub for sending WhatsApp notifications via the Meta Cloud API.
 * Implement `sendMessage()` in a follow-up PR once the notification
 * trigger points and message templates are agreed.
 */
@Injectable({ providedIn: 'root' })
export class WhatsAppService {
  /**
   * Placeholder — sends a WhatsApp message to the configured recipient.
   * @param message The text to send.
   */
  async sendMessage(_message: string): Promise<void> {
    // TODO: implement Meta Cloud API (WhatsApp) call
  }
}
