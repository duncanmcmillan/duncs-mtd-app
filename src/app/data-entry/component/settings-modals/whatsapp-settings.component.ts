/**
 * @fileoverview Settings modal for the WhatsApp (Meta Cloud API) notification channel.
 * Reads current settings from DataEntryStore and persists changes on submit.
 */
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AppStore } from '../../../core';
import { DataEntryStore } from '../../store/data-entry.store';
import { WhatsAppSettings } from '../../model/data-entry.model';

/**
 * Modal for configuring the WhatsApp access token, phone number ID, and recipient.
 * Visibility is controlled by DataEntryStore.activeModal.
 */
@Component({
  selector: 'app-whatsapp-settings',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule],
  templateUrl: './whatsapp-settings.component.html',
  styleUrl: './settings-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WhatsAppSettingsComponent {
  protected readonly store = inject(DataEntryStore);
  protected readonly appStore = inject(AppStore);

  protected readonly form = signal<WhatsAppSettings>({
    accessToken:     this.store.notifications().whatsapp?.accessToken     ?? '',
    phoneNumberId:   this.store.notifications().whatsapp?.phoneNumberId   ?? '',
    recipientNumber: this.store.notifications().whatsapp?.recipientNumber ?? '',
  });

  /** Status of the most recent WhatsApp test send. */
  protected readonly testStatus = computed(() => this.store.testNotification().whatsapp);

  /** True when the user is not authenticated (browser / test-data mode). */
  protected readonly showTestBtn = computed(() => !this.appStore.accessToken());

  /** Updates a single field in the form signal. */
  protected setField(field: keyof WhatsAppSettings, value: string): void {
    this.form.update(f => ({ ...f, [field]: value }));
  }

  /** Saves settings and closes the modal. */
  protected async onSubmit(): Promise<void> {
    const current = this.store.notifications();
    await this.store.saveNotifications({ ...current, whatsapp: this.form() });
  }

  /** Closes the modal without saving. */
  protected onCancel(): void {
    this.store.closeModal();
  }
}
