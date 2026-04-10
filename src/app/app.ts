import { AfterViewInit, Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

type ElectronWindow = Window & {
  versions: { node: () => string; chrome: () => string; electron: () => string; ping: () => Promise<string> };
};

const eWin = window as unknown as ElectronWindow;

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements AfterViewInit {
  protected readonly title = signal('duncs-mtd-app');
  protected readonly info = `Node: ${eWin.versions.node()}, Chrome: ${eWin.versions.chrome()}, Electron: ${eWin.versions.electron()}`;

  async ngAfterViewInit() {
    const response = await eWin.versions.ping();
    console.log(response);
  }
}
