/**
 * @fileoverview Service for sending messages via the Telegram Bot API.
 */
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { TelegramSettings } from '../../model/data-entry.model';

/**
 * Sends messages to a Telegram chat via the Telegram Bot API.
 */
@Injectable({ providedIn: 'root' })
export class TelegramService {
  private readonly http = inject(HttpClient);

  /**
   * Sends a text message to the configured Telegram chat.
   * @param settings Telegram bot token and target chat ID.
   * @param text The message body (Markdown supported).
   * @throws When the HTTP call fails (non-2xx response or network error).
   */
  async sendMessage(settings: TelegramSettings, text: string): Promise<void> {
    const url = `https://api.telegram.org/bot${settings.botToken}/sendMessage`;
    await firstValueFrom(
      this.http.post(url, { chat_id: settings.chatId, text, parse_mode: 'Markdown' }),
    );
  }
}
