/**
 * @fileoverview First-launch privacy notice dialog.
 * Shown once on app startup when no consent record exists.
 * The user must either agree to continue or quit the application.
 */
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { PrivacyService } from '../../service/privacy.service';

/**
 * Modal dialog presenting the UK GDPR privacy notice on first launch.
 * `disableClose: true` must be set by the caller so the user cannot dismiss
 * without making an explicit choice.
 */
@Component({
  selector: 'app-privacy-dialog',
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './privacy-dialog.component.html',
  styleUrl: './privacy-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacyDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<PrivacyDialogComponent>);
  private readonly privacyService = inject(PrivacyService);

  /** Closes the application without recording consent. */
  quit(): void {
    window.close();
  }

  /**
   * Records the user's consent and closes the dialog with result `'agreed'`.
   */
  async agree(): Promise<void> {
    await this.privacyService.setConsent();
    this.dialogRef.close('agreed');
  }
}
