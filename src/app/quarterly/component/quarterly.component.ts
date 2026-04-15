/**
 * @fileoverview Quarterly Update tab component. Displays one card per open
 * obligation period, allowing the user to enter income and expense figures,
 * save drafts, and submit to HMRC.
 */
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, linkedSignal } from '@angular/core';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { QuarterlyStore } from '../store/quarterly.store';
import { ExpensesModalComponent } from './expenses-modal/expenses-modal.component';
import {
  ForeignPropertyIncome,
  QuarterlyDraft,
  SelfEmploymentIncome,
  UkPropertyIncome,
  draftKey,
  totalForeignPropExpenses,
  totalForeignPropIncome,
  totalPropExpenses,
  totalPropIncome,
  totalSEExpenses,
  totalSEIncome,
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

  /**
   * Tracks which period tab is selected; automatically selects the first draft
   * whenever the draft list changes (e.g. after init or seedTestDrafts).
   */
  protected readonly selectedKey = linkedSignal(() => {
    const list = this.store.draftList();
    return list.length > 0 ? draftKey(list[0].businessId, list[0].periodStartDate) : null;
  });

  /** The currently selected draft, or `null` when no drafts are loaded. */
  protected readonly selectedDraft = computed((): QuarterlyDraft | null => {
    const key = this.selectedKey();
    return key ? (this.store.drafts()[key] ?? null) : null;
  });

  /** @inheritdoc */
  ngOnInit(): void {
    void this.store.init();
  }

  // ─── Tab navigation ────────────────────────────────────────────────────────

  /**
   * Selects the given period tab.
   * @param key - Draft key from {@link draftKey}.
   */
  protected selectTab(key: string): void {
    this.selectedKey.set(key);
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
    if (draft.businessType === 'self-employment') return totalSEIncome(draft.seIncome);
    if (draft.businessType === 'foreign-property') return totalForeignPropIncome(draft.foreignPropIncome);
    return totalPropIncome(draft.propIncome);
  }

  /**
   * Returns the total expenses amount for a draft regardless of source type.
   * @param draft - The draft to compute.
   */
  protected totalExpensesFor(draft: QuarterlyDraft): number {
    if (draft.businessType === 'self-employment') return totalSEExpenses(draft.seExpenses);
    if (draft.businessType === 'foreign-property') return totalForeignPropExpenses(draft.foreignPropExpenses);
    return totalPropExpenses(draft.propExpenses);
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

  /**
   * Handles numeric input for a foreign property income field.
   * @param key - Draft key.
   * @param field - The foreign property income field name.
   * @param event - DOM input event.
   */
  protected onForeignPropIncomeInput(key: string, field: keyof ForeignPropertyIncome, event: Event): void {
    const value = parseNullableNumber((event.target as HTMLInputElement).value);
    this.store.patchForeignPropIncome(key, { [field]: value } as Partial<ForeignPropertyIncome>);
  }

  /**
   * Handles text input for the foreign property country code field.
   * @param key - Draft key.
   * @param event - DOM input event.
   */
  protected onForeignPropCountryCodeInput(key: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value.toUpperCase().slice(0, 3);
    this.store.patchForeignPropIncome(key, { countryCode: value });
  }

  /**
   * Handles the Foreign Tax Credit Relief checkbox change.
   * @param key - Draft key.
   * @param event - DOM change event from the checkbox.
   */
  protected onForeignTaxCreditReliefChange(key: string, event: Event): void {
    this.store.patchForeignPropIncome(key, { foreignTaxCreditRelief: (event.target as HTMLInputElement).checked });
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
