/**
 * @fileoverview Quarterly Update tab component. Displays one card per open
 * obligation period, allowing the user to enter income and expense figures,
 * save drafts, and submit to HMRC.
 */
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { QuarterlyStore } from '../store/quarterly.store';
import { ExpensesModalComponent } from './expenses-modal/expenses-modal.component';
import {
  QuarterlyDraft,
  SelfEmploymentIncome,
  UkPropertyIncome,
  draftKey,
  totalSEExpenses,
  totalSEIncome,
  totalPropExpenses,
  totalPropIncome,
} from '../model/quarterly.model';

/**
 * Main view for the Quarterly Update tab.
 * Initialises drafts from open obligations on mount and renders a workflow
 * card for each open period.
 */
@Component({
  selector: 'app-quarterly',
  imports: [DatePipe, CurrencyPipe, ExpensesModalComponent],
  templateUrl: './quarterly.component.html',
  styleUrl: './quarterly.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuarterlyComponent implements OnInit {
  /** @internal */
  protected readonly store = inject(QuarterlyStore);

  /** @inheritdoc */
  ngOnInit(): void {
    void this.store.init();
  }

  // ─── Template helpers ──────────────────────────────────────────────────────

  /**
   * Returns a stable template-tracking key for a draft.
   * @param draft - The draft to key.
   */
  protected keyFor(draft: QuarterlyDraft): string {
    return draftKey(draft.businessId, draft.periodStartDate);
  }

  /**
   * Returns the total income amount for a draft regardless of source type.
   * @param draft - The draft to compute.
   */
  protected totalIncomeFor(draft: QuarterlyDraft): number {
    return draft.businessType === 'self-employment'
      ? totalSEIncome(draft.seIncome)
      : totalPropIncome(draft.propIncome);
  }

  /**
   * Returns the total expenses amount for a draft regardless of source type.
   * @param draft - The draft to compute.
   */
  protected totalExpensesFor(draft: QuarterlyDraft): number {
    return draft.businessType === 'self-employment'
      ? totalSEExpenses(draft.seExpenses)
      : totalPropExpenses(draft.propExpenses);
  }

  // ─── Income input handlers ─────────────────────────────────────────────────

  /**
   * Handles numeric input for a self-employment income field.
   * @param key - Draft key.
   * @param field - The income field name.
   * @param event - DOM input event.
   */
  protected onSEIncomeInput(key: string, field: keyof SelfEmploymentIncome, event: Event): void {
    const value = parseNullableNumber((event.target as HTMLInputElement).value);
    this.store.patchSEIncome(key, { [field]: value } as Partial<SelfEmploymentIncome>);
  }

  /**
   * Handles numeric input for a UK property income field.
   * @param key - Draft key.
   * @param field - The property income field name.
   * @param event - DOM input event.
   */
  protected onPropIncomeInput(key: string, field: keyof UkPropertyIncome, event: Event): void {
    const value = parseNullableNumber((event.target as HTMLInputElement).value);
    this.store.patchPropIncome(key, { [field]: value } as Partial<UkPropertyIncome>);
  }

  // ─── Action handlers ───────────────────────────────────────────────────────

  /**
   * Toggles the confirmation checkbox for a draft.
   * @param key - Draft key.
   * @param event - DOM change event from the checkbox.
   */
  protected onConfirmChange(key: string, event: Event): void {
    this.store.setConfirmed(key, (event.target as HTMLInputElement).checked);
  }

  /**
   * Saves the draft to localStorage and navigates away.
   * @param key - Draft key.
   */
  protected onSaveDraft(key: string): void {
    this.store.saveDraft(key);
  }

  /**
   * Triggers HMRC submission for the given draft.
   * @param key - Draft key.
   */
  protected onSubmit(key: string): void {
    void this.store.submitDraft(key);
  }

  /**
   * Opens the expenses detail modal for a draft.
   * @param key - Draft key.
   */
  protected openExpensesModal(key: string): void {
    this.store.openExpensesModal(key);
  }

  /** Loads synthetic test drafts for UI development without authentication. */
  protected onLoadTestData(): void {
    this.store.seedTestDrafts();
  }
}

/** Parses an input string to a number, returning `null` for empty/invalid values. */
function parseNullableNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = parseFloat(trimmed);
  return isNaN(n) ? null : n;
}
