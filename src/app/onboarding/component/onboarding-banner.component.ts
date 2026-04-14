/**
 * @fileoverview Fixed-bottom banner that guides first-time users through
 * key onboarding steps. Rendered by the root app shell; toggled via F1.
 */
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { OnboardingStore } from '../store/onboarding.store';

/**
 * Fixed-bottom informational banner showing the current onboarding step.
 * Rendered only when {@link OnboardingStore#showBanner} is `true`.
 */
@Component({
  selector: 'app-onboarding-banner',
  imports: [],
  templateUrl: './onboarding-banner.component.html',
  styleUrl: './onboarding-banner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingBannerComponent {
  /** @internal */
  protected readonly store = inject(OnboardingStore);

  /**
   * Marks the currently displayed step as complete, dismissing the banner.
   * @internal
   */
  protected dismissStep(): void {
    const step = this.store.currentStep();
    if (step) {
      void this.store.completeStep(step.id);
    }
  }
}
