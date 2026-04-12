import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DataEntryStore } from '../store/data-entry.store';

@Component({
  selector: 'app-data-entry',
  templateUrl: './data-entry.component.html',
  styleUrl: './data-entry.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataEntryComponent {
  protected readonly store = inject(DataEntryStore);
}
