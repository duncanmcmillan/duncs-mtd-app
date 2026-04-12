import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ObligationsStore } from '../store/obligations.store';

@Component({
  selector: 'app-obligations',
  templateUrl: './obligations.component.html',
  styleUrl: './obligations.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ObligationsComponent {
  protected readonly store = inject(ObligationsStore);
}
