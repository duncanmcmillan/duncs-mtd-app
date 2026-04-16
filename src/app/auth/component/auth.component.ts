/**
 * @fileoverview Authentication view component.
 * Presents the HMRC sign-in form (environment toggle, credentials) and
 * the connected-state summary (token expiry, active environment).
 */
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthStore } from '../store/auth.store';
import { AuthService } from '../service/auth.service';
import { ApiEnvironment, AppStore } from '../../core';

/**
 * Standalone view component for the `/auth` route.
 *
 * Uses `OnPush` change detection; all reactive data flows through
 * signals from {@link AuthStore}. The client secret is held only in a
 * local signal and cleared from memory immediately after use.
 */
@Component({
  selector: 'app-auth',
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
})
export class AuthComponent implements OnInit {
  /** The auth feature store providing reactive state. */
  protected readonly store = inject(AuthStore);

  /** Root app store; used to read and write the user's NINO. */
  protected readonly appStore = inject(AppStore);

  /** Whether the app is running inside the Electron shell. */
  protected readonly isElectron = inject(AuthService).isElectron;

  /** The HMRC developer app client ID, pre-filled from secure storage on init. */
  protected clientId = signal('');

  /**
   * The client secret; held in memory only and cleared after each sign-in attempt.
   * It is never stored in the renderer process.
   */
  protected clientSecret = signal('');

  /** The user's National Insurance number; required for all HMRC MTD API calls. */
  protected nino = signal('');

  /**
   * Initialises the component by restoring any saved session and
   * pre-filling the client ID from secure storage.
   */
  async ngOnInit(): Promise<void> {
    await this.store.init();
    this.clientId.set(this.store.clientId());
    this.nino.set(this.appStore.nino() ?? '');
  }

  /**
   * Updates the target HMRC environment in the store.
   * @param env - The environment selected by the user.
   */
  protected setEnvironment(env: ApiEnvironment): void {
    this.store.setEnvironment(env);
  }

  /**
   * Submits the sign-in form, triggering the HMRC OAuth flow.
   * Clears the client secret signal from memory after the attempt completes.
   */
  protected async signIn(): Promise<void> {
    await this.store.signIn({
      clientId:     this.clientId(),
      clientSecret: this.clientSecret(),
      environment:  this.store.environment(),
    });
    this.clientSecret.set('');
  }

  /**
   * Saves the NINO entered by the user into the root app store.
   * The NINO is required for all HMRC MTD API calls.
   */
  protected saveNino(): void {
    const value = this.nino().trim().toUpperCase();
    if (value) this.appStore.setNino(value);
  }

  /**
   * Toggles test-data mode on or off, controlling seed button visibility
   * across all feature tabs.
   */
  protected toggleTestData(): void {
    this.appStore.setTestDataMode(!this.appStore.testDataMode());
  }

  /**
   * Signs out the current user and clears the in-memory client secret.
   */
  protected async signOut(): Promise<void> {
    await this.store.signOut();
    this.clientSecret.set('');
  }

  /**
   * Formats a token expiry timestamp as a human-readable string.
   * @param expiresAt - Unix timestamp in milliseconds, or `null`.
   * @returns A string such as `'45 min'`, `'4 hr'`, `'Expired'`, or `'—'`.
   */
  protected formatExpiry(expiresAt: number | null): string {
    if (!expiresAt) return '—';
    const mins = Math.round((expiresAt - Date.now()) / 60_000);
    if (mins < 0) return 'Expired';
    if (mins < 60) return `${mins} min`;
    return `${Math.round(mins / 60)} hr`;
  }
}
