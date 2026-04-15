/**
 * @fileoverview Obligations tab component. Fetches and displays HMRC MTD
 * obligations for the authenticated user.
 */
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ObligationsStore } from '../store/obligations.store';

/**
 * Displays all HMRC obligations for the current user as a structured table.
 * On init, triggers a fetch via {@link ObligationsStore}.
 */
@Component({
  selector: 'app-obligations',
  imports: [DatePipe],
  templateUrl: './obligations.component.html',
  styleUrl: './obligations.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ObligationsComponent implements OnInit {
  protected readonly store = inject(ObligationsStore);

  /** @inheritdoc */
  ngOnInit(): void {
    void this.store.loadObligations();
  }

  /**
   * Returns the number of whole days until the given due date.
   * Negative values indicate the obligation is overdue.
   * @param dueDate - ISO date string (YYYY-MM-DD).
   */
  protected daysUntilDue(dueDate: string): number {
    return Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86_400_000);
  }

  /**
   * Returns a human-readable label for an income source type.
   * @param typeOfBusiness - The raw `typeOfBusiness` string from the obligations API.
   */
  protected sourceLabel(typeOfBusiness: string): string {
    switch (typeOfBusiness) {
      case 'self-employment': return 'Self Employment';
      case 'uk-property': return 'UK Property';
      case 'foreign-property': return 'Foreign Property';
      case 'ITSA': return 'Annual Return';
      default: return typeOfBusiness;
    }
  }

  /** Loads synthetic test obligations for UI development without authentication. */
  protected onLoadTestData(): void {
    this.store.seedTestObligations();
  }
}
