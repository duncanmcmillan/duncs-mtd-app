/**
 * @fileoverview Self Assessment tab component.
 * Guides the user through the three-stage Individual Calculations workflow:
 * trigger a tax calculation → review results → submit the Final Declaration.
 */
import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { SelfAssessmentStore } from '../store/self-assessment.store';

/**
 * Displays the end-of-year Self Assessment (Individual Calculations) workflow.
 * On init, triggers a no-op load; test data can be seeded via {@link SelfAssessmentStore}.
 */
@Component({
  selector: 'app-self-assessment',
  imports: [CurrencyPipe, DatePipe],
  templateUrl: './self-assessment.component.html',
  styleUrl: './self-assessment.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelfAssessmentComponent implements OnInit {
  protected readonly store = inject(SelfAssessmentStore);

  /**
   * The UK tax year to display in the page header.
   * Uses the loaded calculation's year when available; otherwise derives
   * the current UK tax year from today's date.
   */
  protected readonly taxYear = computed((): string => {
    const calc = this.store.calculation();
    if (calc) return calc.taxYear;
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const d = now.getDate();
    const start = m > 4 || (m === 4 && d >= 6) ? y : y - 1;
    return `${start}-${String(start + 1).slice(2)}`;
  });

  /** @inheritdoc */
  ngOnInit(): void {
    void this.store.loadData();
  }

  /** Triggers an Individual Calculations 'intent-to-finalise' request. */
  protected onTrigger(): void {
    void this.store.triggerCalculation();
  }

  /** Submits the Final Declaration (crystallisation) for the current calculation. */
  protected onSubmit(): void {
    void this.store.submitFinalDeclaration();
  }

  /** Resets the workflow to the idle state to allow recalculation. */
  protected onReset(): void {
    this.store.reset();
  }

  /** Loads synthetic test data for UI development without authentication. */
  protected onLoadTestData(): void {
    this.store.seedTestData();
  }
}
