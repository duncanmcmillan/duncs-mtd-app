import { AfterViewInit, Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

type ElectronWindow = Window & {
  versions: { node: () => string; chrome: () => string; electron: () => string; ping: () => Promise<string> };
};

const eWin = window as unknown as ElectronWindow;
const isElectron = !!eWin.versions;

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements AfterViewInit {
  protected readonly title = signal('duncs-mtd-app');
  protected readonly info = isElectron
    ? `Node: ${eWin.versions.node()}  Chrome: ${eWin.versions.chrome()}  Electron: ${eWin.versions.electron()}`
    : 'Browser';

  async ngAfterViewInit() {
    if (!isElectron) return;
    const response = await eWin.versions.ping();
    console.log(response);
  }
}
