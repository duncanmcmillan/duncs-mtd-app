import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RecordsStore } from '../store/records.store';

@Component({
  selector: 'app-records',
  templateUrl: './records.component.html',
  styleUrl: './records.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecordsComponent {
  protected readonly store = inject(RecordsStore);
}
