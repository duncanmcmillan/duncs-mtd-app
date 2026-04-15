/**
 * @fileoverview Modal component for viewing and editing the detailed breakdown
 * of expenses for a quarterly update draft. Supports both self-employment
 * (allowable + non-allowable) and UK property expense categories.
 */
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { QuarterlyStore } from '../../store/quarterly.store';
import {
  QuarterlyDraft,
  SelfEmploymentExpenses,
  SelfEmploymentDisallowableExpenses,
  UkPropertyExpenses,
  draftKey,
} from '../../model/quarterly.model';

/** A labelled row in the expenses form. */
interface ExpenseRow<T extends object> {
  /** Display label for the expense line. */
  label: string;
  /** The key in the expense object this row maps to. */
  field: keyof T;
}

/** Allowable self-employment expense rows in display order. */
const SE_EXPENSE_ROWS: ExpenseRow<SelfEmploymentExpenses>[] = [
  { label: 'Cost of goods', field: 'costOfGoods' },
  { label: 'Payments to subcontractors', field: 'paymentsToSubcontractors' },
  { label: 'Wages and staff costs', field: 'wagesAndStaffCosts' },
  { label: 'Car, van and travel', field: 'carVanTravelExpenses' },
  { label: 'Premises running costs', field: 'premisesRunningCosts' },
  { label: 'Repairs and maintenance', field: 'maintenanceCosts' },
  { label: 'Administration costs', field: 'adminCosts' },
  { label: 'Business entertainment', field: 'businessEntertainmentCosts' },
  { label: 'Advertising and marketing', field: 'advertisingCosts' },
  { label: 'Interest on loans', field: 'interestOnBankOtherLoans' },
  { label: 'Finance charges', field: 'financeCharges' },
  { label: 'Irrecoverable (bad) debts', field: 'irrecoverableDebts' },
  { label: 'Professional fees', field: 'professionalFees' },
  { label: 'Depreciation', field: 'depreciation' },
  { label: 'Other expenses', field: 'otherExpenses' },
];

/** Non-allowable (disallowable) self-employment expense rows. */
const SE_DISALLOWABLE_ROWS: ExpenseRow<SelfEmploymentDisallowableExpenses>[] = [
  { label: 'Cost of goods', field: 'costOfGoodsDisallowable' },
  { label: 'Payments to subcontractors', field: 'paymentsToSubcontractorsDisallowable' },
  { label: 'Wages and staff costs', field: 'wagesAndStaffCostsDisallowable' },
  { label: 'Car, van and travel', field: 'carVanTravelExpensesDisallowable' },
  { label: 'Premises running costs', field: 'premisesRunningCostsDisallowable' },
  { label: 'Repairs and maintenance', field: 'maintenanceCostsDisallowable' },
  { label: 'Administration costs', field: 'adminCostsDisallowable' },
  { label: 'Business entertainment', field: 'businessEntertainmentCostsDisallowable' },
  { label: 'Advertising and marketing', field: 'advertisingCostsDisallowable' },
  { label: 'Interest on loans', field: 'interestOnBankOtherLoansDisallowable' },
  { label: 'Finance charges', field: 'financeChargesDisallowable' },
  { label: 'Irrecoverable (bad) debts', field: 'irrecoverableDebtsDisallowable' },
  { label: 'Professional fees', field: 'professionalFeesDisallowable' },
  { label: 'Depreciation', field: 'depreciationDisallowable' },
  { label: 'Other expenses', field: 'otherExpensesDisallowable' },
];

/** UK property expense rows in display order. */
const PROP_EXPENSE_ROWS: ExpenseRow<UkPropertyExpenses>[] = [
  { label: 'Premises running costs', field: 'premisesRunningCosts' },
  { label: 'Repairs and maintenance', field: 'repairsAndMaintenance' },
  { label: 'Financial costs (mortgage interest)', field: 'financialCosts' },
  { label: 'Professional fees', field: 'professionalFees' },
  { label: 'Cost of services', field: 'costOfServices' },
  { label: 'Travel costs', field: 'travelCosts' },
  { label: 'Residential finance cost', field: 'residentialFinancialCost' },
  { label: 'Brought-forward residential finance cost', field: 'broughtFwdResidentialFinancialCost' },
  { label: 'Other expenses', field: 'other' },
];

/**
 * Full-screen modal overlay for entering the detailed breakdown of
 * quarterly expenses for a single income source draft.
 * Reads and writes directly to {@link QuarterlyStore}.
 */
@Component({
  selector: 'app-expenses-modal',
  imports: [],
  templateUrl: './expenses-modal.component.html',
  styleUrl: './expenses-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpensesModalComponent {
  /** @internal */
  protected readonly store = inject(QuarterlyStore);

  /** @internal */
  protected readonly seExpenseRows = SE_EXPENSE_ROWS;
  /** @internal */
  protected readonly seDisallowableRows = SE_DISALLOWABLE_ROWS;
  /** @internal */
  protected readonly propExpenseRows = PROP_EXPENSE_ROWS;

  /** Currently active tab: `'allowable'` or `'disallowable'` (SE only). */
  protected activeTab: 'allowable' | 'disallowable' = 'allowable';

  /** @internal */
  protected draftKey(draft: QuarterlyDraft): string {
    return draftKey(draft.businessId, draft.periodStartDate);
  }

  /**
   * Handles numeric input changes for SE allowable expenses.
   * @param key - Draft key.
   * @param field - The expense field being changed.
   * @param event - The DOM input event.
   */
  protected onSEExpenseInput(
    key: string,
    field: keyof SelfEmploymentExpenses,
    event: Event,
  ): void {
    const value = parseNullableNumber((event.target as HTMLInputElement).value);
    this.store.patchSEExpenses(key, { [field]: value } as Partial<SelfEmploymentExpenses>);
  }

  /**
   * Handles numeric input changes for SE non-allowable expenses.
   * @param key - Draft key.
   * @param field - The disallowable expense field being changed.
   * @param event - The DOM input event.
   */
  protected onSEDisallowableInput(
    key: string,
    field: keyof SelfEmploymentDisallowableExpenses,
    event: Event,
  ): void {
    const value = parseNullableNumber((event.target as HTMLInputElement).value);
    this.store.patchSEDisallowable(key, {
      [field]: value,
    } as Partial<SelfEmploymentDisallowableExpenses>);
  }

  /**
   * Handles numeric input changes for UK property expenses.
   * @param key - Draft key.
   * @param field - The property expense field being changed.
   * @param event - The DOM input event.
   */
  protected onPropExpenseInput(
    key: string,
    field: keyof UkPropertyExpenses,
    event: Event,
  ): void {
    const value = parseNullableNumber((event.target as HTMLInputElement).value);
    this.store.patchPropExpenses(key, { [field]: value } as Partial<UkPropertyExpenses>);
  }

  /** Closes the modal via the store. */
  protected close(): void {
    this.store.closeExpensesModal();
  }
}

/** Parses an input string to a number, returning `null` for empty/invalid. */
function parseNullableNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = parseFloat(trimmed);
  return isNaN(n) ? null : n;
}
