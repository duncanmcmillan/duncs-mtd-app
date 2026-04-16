/**
 * @fileoverview Self Assessment tab component.
 * Guides the user through the three-stage Individual Calculations workflow:
 * trigger a tax calculation → review results → submit the Final Declaration.
 */
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
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
