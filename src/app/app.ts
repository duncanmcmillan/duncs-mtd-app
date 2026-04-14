/**
 * @fileoverview Root application component.
 * Bootstraps the app shell, checks GDPR consent on first launch,
 * opens the privacy notice dialog if consent has not yet been given,
 * and initialises the onboarding store for the current user.
 */
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { PrivacyService, PrivacyDialogComponent } from './privacy';
import { AuthStore } from './auth';
import { OnboardingStore, OnboardingBannerComponent } from './onboarding';

type ElectronWindow = Window & {
  versions: { node: () => string; chrome: () => string; electron: () => string; ping: () => Promise<string> };
};

const eWin = window as unknown as ElectronWindow;
const isElectron = !!eWin.versions;

/** Root standalone component — renders the nav shell and router outlet. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, OnboardingBannerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements AfterViewInit {
  private readonly dialog = inject(MatDialog);
  private readonly privacyService = inject(PrivacyService);
  private readonly onboardingStore = inject(OnboardingStore);
  private readonly authStore = inject(AuthStore);

  protected readonly title = signal('duncs-mtd-app');
  protected readonly info = isElectron
    ? `Node: ${eWin.versions.node()}  Chrome: ${eWin.versions.chrome()}  Electron: ${eWin.versions.electron()}`
    : 'Browser';

  async ngAfterViewInit(): Promise<void> {
    if (!isElectron) return;

    const response = await eWin.versions.ping();
    console.log(response);

    const consented = await this.privacyService.checkConsent();
    if (!consented) {
      this.dialog.open(PrivacyDialogComponent, { disableClose: true });
    }

    await this.onboardingStore.init(this.authStore.clientId());
  }

  /**
   * Toggles the onboarding banner visibility when F1 is pressed.
   * @param event - The keyboard event.
   */
  @HostListener('document:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'F1') {
      event.preventDefault();
      this.onboardingStore.toggleBannerVisible();
    }
  }
}
