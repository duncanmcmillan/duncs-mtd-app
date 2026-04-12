/**
 * @fileoverview Privacy settings page served at the `/privacy` route.
 * Displays the full privacy notice and lets the user delete all stored data.
 */
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PrivacyService } from '../../service/privacy.service';
import { AuthStore } from '../../../auth/store/auth.store';
import { extractErrorMessage } from '../../../core';

/**
 * Full-page privacy settings component.
 * Presents the UK GDPR privacy notice and a data-deletion action.
 */
@Component({
  selector: 'app-privacy-settings',
  imports: [MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './privacy-settings.component.html',
  styleUrl: './privacy-settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacySettingsComponent {
  private readonly privacyService = inject(PrivacyService);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  /** Whether a deletion operation is in progress. */
  protected readonly isLoading = signal(false);
  /** Deletion error message, or `null` if none. */
  protected readonly error = signal<string | null>(null);
  /** `true` once deletion has completed successfully. */
  protected readonly deleted = signal(false);

  /**
   * Deletes all locally stored data, signs the user out, and navigates to `/auth`.
   */
  async deleteAllData(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      await this.privacyService.deleteAllData();
      await this.authStore.signOut();
      this.deleted.set(true);
      await this.router.navigateByUrl('/auth');
    } catch (e: unknown) {
      this.error.set(extractErrorMessage(e, 'Data deletion failed'));
    } finally {
      this.isLoading.set(false);
    }
  }
}
