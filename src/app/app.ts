import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

type ElectronWindow = Window & { versions: { node: () => string; chrome: () => string; electron: () => string } };

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('duncs-mtd-app');
  protected readonly info = `Node: ${(window as unknown as ElectronWindow).versions.node()}, Chrome: ${(window as unknown as ElectronWindow).versions.chrome()}, Electron: ${(window as unknown as ElectronWindow).versions.electron()}`;
}
