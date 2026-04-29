/**
 * @fileoverview Stub service for the Telegram Bot notification channel.
 * Will send messages via the Telegram Bot API. No-op implementation until wired up.
 */
import { Injectable } from '@angular/core';

/**
 * Service stub for sending Telegram notifications.
 * Implement `sendMessage()` in a follow-up PR once the notification
 * trigger points and message templates are agreed.
 */
@Injectable({ providedIn: 'root' })
export class TelegramService {
  /**
   * Placeholder — sends a message to the configured Telegram chat.
   * @param message The text to send.
   */
  async sendMessage(_message: string): Promise<void> {
    // TODO: implement Telegram Bot API call
  }
}
