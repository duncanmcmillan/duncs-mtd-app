/**
 * @fileoverview Domain models for the contextual onboarding feature.
 * Defines the set of guided steps, their display messages, and the
 * persisted-progress shape stored on-disk per HMRC ClientID.
 */

/** Identifies a discrete onboarding step. */
export type OnboardingStepId = 'AUTH_TAB' | 'NAVIGATE_TO_SOURCES' | 'QUARTERLY_TAB';

/**
 * A single onboarding step with its unique identifier and display message.
 */
export interface OnboardingStep {
  /** Unique identifier for the step. */
  id: OnboardingStepId;
  /** Guidance message shown to the user in the banner. */
  message: string;
}

/**
 * The ordered list of onboarding steps shown to first-time users.
 * Steps are evaluated in order; the first incomplete step is displayed.
 */
export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'AUTH_TAB',
    message: `Depending on whether there is an active app token you may need to connect to HMRC website, by providing a ClientID and client secret and selecting 'Connect'. Provide your username and password within the HMRC website and provide permission for this software to represent you. Then, after redirection, provide and save your NINO using the data input provided.`,
  },
  {
    id: 'NAVIGATE_TO_SOURCES',
    message: `Go to the 'Source' Tab.`,
  },
  {
    id: 'QUARTERLY_TAB',
    message: `Use this tab to enter details of both income and expenses for all your quarterly income sources. You can save drafts and come back to them later, and when happy commit them to HMRC.`,
  },
];

/**
 * Shape of the onboarding progress file persisted to disk.
 * Keys are HMRC ClientIDs; values are the list of completed step IDs.
 */
export type OnboardingProgress = Record<string, OnboardingStepId[]>;
