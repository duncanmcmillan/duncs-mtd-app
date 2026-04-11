import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SelfAssessmentStore } from '../store/self-assessment.store';

@Component({
  selector: 'app-self-assessment',
  templateUrl: './self-assessment.component.html',
  styleUrl: './self-assessment.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelfAssessmentComponent {
  protected readonly store = inject(SelfAssessmentStore);
}
