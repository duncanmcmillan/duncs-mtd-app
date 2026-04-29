/**
 * @fileoverview Quarterly Update tab component. Displays one card per open
 * obligation period, allowing the user to enter income and expense figures,
 * save drafts, and submit to HMRC.
 */
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, linkedSignal, signal } from '@angular/core';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';
import { AppStore } from '../../core';
import { QuarterlyStore } from '../store/quarterly.store';
import { SelfAssessmentStore } from '../../self-assessment/store/self-assessment.store';
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

/** A unique reporting period derived from the draft list. */
interface PeriodEntry {
  /** ISO period start date. */
  startDate: string;
  /** ISO period end date. */
  endDate: string;
  /** ISO due date for submissions in this period. */
  dueDate: string;
}

/** Navigation state passed from the Obligations tab. */
interface ObligationsNavState {
  /** ISO period start date to pre-select. */
  periodStart?: string;
  /** Business ID to pre-select within the period. */
  businessId?: string;
}

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
  protected readonly appStore = inject(AppStore);
  private readonly saStore = inject(SelfAssessmentStore);
  private readonly router = inject(Router);

  /**
   * Navigation state captured at component creation time (during navigation).
   * Used to pre-select the period and source when arriving from the Obligations tab.
   */
  private readonly navState: ObligationsNavState =
    (this.router.getCurrentNavigation()?.extras?.state ?? {}) as ObligationsNavState;

  /** Unique reporting periods derived from the draft list, sorted ascending. */
  protected readonly periodList = computed((): PeriodEntry[] => {
    const seen = new Set<string>();
    const periods: PeriodEntry[] = [];
    for (const draft of this.store.draftList()) {
      if (!seen.has(draft.periodStartDate)) {
        seen.add(draft.periodStartDate);
        periods.push({ startDate: draft.periodStartDate, endDate: draft.periodEndDate, dueDate: draft.dueDate });
      }
    }
    return periods;
  });

  /**
   * The currently selected period start date; auto-selects the first period
   * whenever the period list changes (e.g. after init or seedTestDrafts).
   */
  protected readonly selectedPeriod = linkedSignal<string | null>(() => {
    const list = this.periodList();
    return list.length > 0 ? list[0].startDate : null;
  });

  /** All drafts for the currently selected period, in draftList order. */
  protected readonly periodDrafts = computed((): QuarterlyDraft[] => {
    const period = this.selectedPeriod();
    if (!period) return [];
    return this.store.draftList().filter(d => d.periodStartDate === period);
  });

  /**
   * The currently selected income-source key within the active period;
   * auto-resets to the first source whenever the active period changes.
   */
  protected readonly selectedKey = linkedSignal<string | null>(() => {
    const drafts = this.periodDrafts();
    return drafts.length > 0 ? draftKey(drafts[0].businessId, drafts[0].periodStartDate) : null;
  });

  /** The currently selected draft, or `null` when no drafts are loaded. */
  protected readonly selectedDraft = computed((): QuarterlyDraft | null => {
    const key = this.selectedKey();
    return key ? (this.store.drafts()[key] ?? null) : null;
  });

  /** Key of the draft that was most recently saved (cleared after 2 s). */
  protected readonly savedFeedbackKey = signal<string | null>(null);

  /** `true` when at least one draft in the store has been submitted. */
  protected readonly hasAnySubmission = computed((): boolean =>
    this.store.draftList().some(d => d.status === 'submitted'),
  );

  /** @inheritdoc */
  ngOnInit(): void {
    const { periodStart, businessId } = this.navState;
    void this.store.init().then(() => {
      if (periodStart) {
        this.selectedPeriod.set(periodStart);
      }
      if (businessId && periodStart) {
        this.selectedKey.set(draftKey(businessId, periodStart));
      }
    });
  }

  // ─── Tab navigation ────────────────────────────────────────────────────────

  /**
   * Selects the given period (top-level nav).
   * @param startDate - ISO period start date.
   */
  protected selectPeriod(startDate: string): void {
    this.selectedPeriod.set(startDate);
  }

  /**
   * Selects the given income-source tab within the active period.
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
   * Saves the draft to localStorage and briefly shows a saved confirmation.
   * @param key - Draft key.
   */
  protected onSaveDraft(key: string): void {
    this.store.saveDraft(key);
    this.savedFeedbackKey.set(key);
    setTimeout(() => {
      this.savedFeedbackKey.set(null);
    }, 2000);
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

  /**
   * Triggers an in-year tax calculation (when authenticated) or seeds test data,
   * then navigates to the Self Assessment tab.
   */
  protected onViewInYearCalc(): void {
    if (this.appStore.isAuthenticated()) {
      const submitted = this.store.draftList().find(d => d.status === 'submitted');
      if (submitted) {
        void this.saStore.triggerInYearCalculation(submitted.taxYear);
      }
    } else {
      this.saStore.seedTestData();
    }
    void this.router.navigate(['/self-assessment']);
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
