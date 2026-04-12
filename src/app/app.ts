/**
 * @fileoverview Root application component.
 * Bootstraps the app shell, checks GDPR consent on first launch,
 * and opens the privacy notice dialog if consent has not yet been given.
 */
import { AfterViewInit, ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { PrivacyService, PrivacyDialogComponent } from './privacy';

type ElectronWindow = Window & {
  versions: { node: () => string; chrome: () => string; electron: () => string; ping: () => Promise<string> };
};

const eWin = window as unknown as ElectronWindow;
const isElectron = !!eWin.versions;

/** Root standalone component — renders the nav shell and router outlet. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements AfterViewInit {
  private readonly dialog = inject(MatDialog);
  private readonly privacyService = inject(PrivacyService);

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
  }
}
