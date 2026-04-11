import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AdjustmentsStore } from '../store/adjustments.store';

@Component({
  selector: 'app-adjustments',
  templateUrl: './adjustments.component.html',
  styleUrl: './adjustments.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdjustmentsComponent {
  protected readonly store = inject(AdjustmentsStore);
}
