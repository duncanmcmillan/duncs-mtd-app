/**
 * @fileoverview Domain model for the Self Assessment feature.
 * Covers the Individual Calculations workflow: trigger → review → Final Declaration.
 */

/**
 * Workflow stage for the Self Assessment submission process.
 * - `idle` — no calculation has been triggered yet.
 * - `ready` — a calculation has been retrieved and is awaiting review.
 * - `crystallised` — the Final Declaration has been submitted.
 */
export type SelfAssessmentStatus = 'idle' | 'ready' | 'crystallised';

/**
 * Flattened summary of an Individual Calculations API result.
 * Field names are aligned to key paths in the HMRC Individual Calculations API response.
 */
export interface TaxCalculationSummary {
  /** HMRC calculation identifier. */
  calculationId: string;
  /** Tax year string, e.g. `'2024-25'`. */
  taxYear: string;
  /** ISO 8601 timestamp when the calculation was produced. */
  calculationTimestamp: string;
  /** `true` if the Final Declaration has been submitted for this calculation. */
  crystallised: boolean;

  // ── Income ───────────────────────────────────────────────────────────
  /** Total income from self-employment sources (£). */
  selfEmploymentIncome?: number;
  /** Total income from UK property sources (£). */
  ukPropertyIncome?: number;
  /** Total income from foreign property sources (£). */
  foreignPropertyIncome?: number;
  /** Total UK dividend income received (£). */
  ukDividendIncome?: number;
  /** Sum of all income sources before deductions (£). */
  totalIncomeReceived?: number;

  // ── Allowances & deductions ──────────────────────────────────────────
  /** Personal allowance applied (£). */
  personalAllowance?: number;
  /** Total allowances and deductions applied (£). */
  totalAllowancesAndDeductions?: number;

  // ── Taxable income ───────────────────────────────────────────────────
  /** Total income after allowances and deductions (£). */
  totalTaxableIncome?: number;

  // ── Tax due ──────────────────────────────────────────────────────────
  /** Income tax charged (£). */
  incomeTaxDue?: number;
  /** Total National Insurance contributions (£). */
  totalNic?: number;
  /** Total tax and NIC due (£). */
  totalTaxDue?: number;
}

/** NgRx Signal Store state for the Self Assessment feature. */
export interface SelfAssessmentState {
  /** `true` while an API request is in flight. */
  isLoading: boolean;
  /** Error message if the last request failed, otherwise `null`. */
  error: string | null;
  /** Current workflow stage. */
  status: SelfAssessmentStatus;
  /** Retrieved tax calculation, or `null` before any calculation is loaded. */
  calculation: TaxCalculationSummary | null;
}
