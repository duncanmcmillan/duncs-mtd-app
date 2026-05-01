/**
 * @fileoverview Settings modal for the Telegram Bot notification channel.
 * Reads current settings from DataEntryStore and persists changes on submit.
 */
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AppStore } from '../../../core';
import { DataEntryStore } from '../../store/data-entry.store';
import { TelegramSettings } from '../../model/data-entry.model';

/**
 * Modal for configuring the Telegram bot token and chat ID.
 * Visibility is controlled by DataEntryStore.activeModal.
 */
@Component({
  selector: 'app-telegram-settings',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule],
  templateUrl: './telegram-settings.component.html',
  styleUrl: './settings-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TelegramSettingsComponent {
  protected readonly store = inject(DataEntryStore);
  protected readonly appStore = inject(AppStore);

  protected readonly form = signal<TelegramSettings>({
    botToken: this.store.notifications().telegram?.botToken ?? '',
    chatId:   this.store.notifications().telegram?.chatId   ?? '',
  });

  /** Status of the most recent Telegram test send. */
  protected readonly testStatus = computed(() => this.store.testNotification().telegram);

  /** True when the user is not authenticated (browser / test-data mode). */
  protected readonly showTestBtn = computed(() => !this.appStore.accessToken());

  /** Updates a single field in the form signal. */
  protected setField(field: keyof TelegramSettings, value: string): void {
    this.form.update(f => ({ ...f, [field]: value }));
  }

  /** Saves settings and closes the modal. */
  protected async onSubmit(): Promise<void> {
    const current = this.store.notifications();
    await this.store.saveNotifications({ ...current, telegram: this.form() });
  }

  /** Closes the modal without saving. */
  protected onCancel(): void {
    this.store.closeModal();
  }
}
