import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { QuarterlyStore } from '../store/quarterly.store';

@Component({
  selector: 'app-quarterly',
  templateUrl: './quarterly.component.html',
  styleUrl: './quarterly.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuarterlyComponent {
  protected readonly store = inject(QuarterlyStore);
}
