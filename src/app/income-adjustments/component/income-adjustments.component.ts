/**
 * @fileoverview Income & Adjustments tab component.
 * Presents annual allowances, BSAS adjustments, and dividend declarations
 * across three income sources via a two-level section + source navigation.
 */
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, linkedSignal, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { AppStore } from '../../core';
import { IncomeAdjustmentsStore } from '../store/income-adjustments.store';
import { IncomeAdjustmentsSection, AllowanceEntry, AdjustmentEntry } from '../model/income-adjustments.model';
import { AllowancesModalComponent } from './allowances-modal/allowances-modal.component';
import { AdjustmentsModalComponent } from './adjustments-modal/adjustments-modal.component';
import { DividendsModalComponent } from './dividends-modal/dividends-modal.component';

/** A single numeric row within an adjustment group. */
interface AdjRow { label: string; value: number; }
/** A named group of adjustment rows shown in the Adjustments panel. */
interface AdjGroup { heading: string; rows: AdjRow[]; }

/**
 * Displays HMRC annual allowances, BSAS adjustments, and dividend income using
 * a two-level navigation: section tabs (top) and income-source tabs (second row).
 * On init, triggers a no-op load; test data can be seeded via {@link IncomeAdjustmentsStore}.
 */
@Component({
  selector: 'app-income-adjustments',
  imports: [CurrencyPipe, AllowancesModalComponent, AdjustmentsModalComponent, DividendsModalComponent],
  templateUrl: './income-adjustments.component.html',
  styleUrl: './income-adjustments.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncomeAdjustmentsComponent implements OnInit {
  protected readonly store = inject(IncomeAdjustmentsStore);
  protected readonly appStore = inject(AppStore);

  // ── Section navigation (level 1) ────────────────────────────────────────────

  /** The fixed ordered list of sections. */
  protected readonly sectionList: IncomeAdjustmentsSection[] = ['allowances', 'adjustments', 'dividends'];

  /** Currently selected section; defaults to `'allowances'`. */
  protected readonly selectedSection = linkedSignal<IncomeAdjustmentsSection>(() => 'allowances');

  // ── Source navigation (level 2, shown for allowances + adjustments) ──────────

  /**
   * Income source types available for the selected section.
   * Empty for the Dividends section.
   */
  protected readonly sourceList = computed((): string[] => {
    if (this.selectedSection() === 'dividends') return [];
    return this.store.sourceTypes();
  });

  /**
   * Currently selected income source; auto-resets to the first source
   * whenever the section changes or new data loads.
   */
  protected readonly selectedSource = linkedSignal<string | null>(() => {
    const list = this.sourceList();
    return list.length > 0 ? list[0] : null;
  });

  // ── Filtered panel data ──────────────────────────────────────────────────────

  /** Allowance entry for the currently selected income source. */
  protected readonly selectedAllowances = computed((): AllowanceEntry | null => {
    const src = this.selectedSource();
    if (!src) return null;
    return (this.store.allowances() ?? []).find(e => e.typeOfBusiness === src) ?? null;
  });

  /** Adjustment entry for the currently selected income source. */
  protected readonly selectedAdjustments = computed((): AdjustmentEntry | null => {
    const src = this.selectedSource();
    if (!src) return null;
    return (this.store.adjustments() ?? []).find(e => e.typeOfBusiness === src) ?? null;
  });

  /** `true` when data has been loaded (any section has non-null content). */
  protected readonly hasData = computed((): boolean =>
    this.store.allowances() !== null || this.store.adjustments() !== null || this.store.dividends() !== null
  );

  // ── Submit status signals ────────────────────────────────────────────────────

  /**
   * Submit status for the allowances section.
   * Auto-resets to `'idle'` whenever the selected source changes.
   */
  protected readonly allowancesSubmitStatus = linkedSignal<'idle' | 'submitting' | 'submitted'>(() => {
    this.selectedSource();
    return 'idle';
  });

  /**
   * Submit status for the adjustments section.
   * Auto-resets to `'idle'` whenever the selected source changes.
   */
  protected readonly adjustmentsSubmitStatus = linkedSignal<'idle' | 'submitting' | 'submitted'>(() => {
    this.selectedSource();
    return 'idle';
  });

  /** Submit status for the dividends section. */
  protected readonly dividendsSubmitStatus = signal<'idle' | 'submitting' | 'submitted'>('idle');

  /**
   * Whether the historical allowances panel is expanded.
   * Auto-resets to `false` when the selected source changes.
   */
  protected readonly showAllowancesHistory = linkedSignal<boolean>(() => {
    this.selectedSource();
    return false;
  });

  // ── Adjustment groups ────────────────────────────────────────────────────────

  /**
   * Adjustment rows for the selected source, grouped into Income, Expenses, and Additions.
   * Groups with no non-null values are omitted.
   */
  protected readonly adjustmentGroups = computed((): AdjGroup[] => {
    const entry = this.selectedAdjustments();
    if (!entry) return [];

    const pair = (label: string, v: number | undefined): AdjRow | null =>
      v != null ? { label, value: v } : null;

    const income: AdjRow[] = [
      pair('Included Non-Taxable Profits', entry.includedNonTaxableProfits),
      pair('Basis Adjustment', entry.basisAdjustment),
      pair('Overlap Relief Used', entry.overlapReliefUsed),
      pair('Accounting Adjustment', entry.accountingAdjustment),
      pair('Averaging Adjustment', entry.averagingAdjustment),
      pair('Outstanding Business Income', entry.outstandingBusinessIncome),
    ].filter((r): r is AdjRow => r !== null);

    const expenses: AdjRow[] = [
      pair('Balancing Charge (BPRA)', entry.balancingChargeBpra),
      pair('Balancing Charge (Other)', entry.balancingChargeOther),
      pair('Private Use Adjustment', entry.privateUseAdjustment),
      pair('Balancing Charge', entry.balancingCharge),
      pair('BPRA Balancing Charges', entry.businessPremisesRenovationAllowanceBalancingCharges),
    ].filter((r): r is AdjRow => r !== null);

    const additions: AdjRow[] = [
      pair('Goods & Services Own Use', entry.goodsAndServicesOwnUse),
      pair('Transition Profit', entry.transitionProfitAmount),
      pair('Transition Profit Acceleration', entry.transitionProfitAccelerationAmount),
    ].filter((r): r is AdjRow => r !== null);

    return [
      { heading: 'Income', rows: income },
      { heading: 'Expenses', rows: expenses },
      { heading: 'Additions', rows: additions },
    ].filter(g => g.rows.length > 0);
  });

  /** @inheritdoc */
  ngOnInit(): void {
    void this.store.loadData();
  }

  // ── Navigation handlers ──────────────────────────────────────────────────────

  /**
   * Selects the given top-level section.
   * @param section - The section to activate.
   */
  protected selectSection(section: IncomeAdjustmentsSection): void {
    this.selectedSection.set(section);
  }

  /**
   * Selects the given income source tab.
   * @param type - The `typeOfBusiness` string.
   */
  protected selectSource(type: string): void {
    this.selectedSource.set(type);
  }

  // ── Modal handlers ───────────────────────────────────────────────────────────

  /**
   * Opens the allowances edit modal for the currently selected source.
   */
  protected openAllowancesModal(): void {
    const src = this.selectedSource();
    if (src) this.store.openAllowancesModal(src);
  }

  /**
   * Opens the adjustments edit modal for the currently selected source.
   */
  protected openAdjustmentsModal(): void {
    const src = this.selectedSource();
    if (src) this.store.openAdjustmentsModal(src);
  }

  /** Opens the dividends edit modal. */
  protected openDividendsModal(): void {
    this.store.openDividendsModal();
  }

  // ── Submit / history handlers ────────────────────────────────────────────────

  /**
   * Stubs submission of allowances to HMRC.
   * Sets status to `'submitting'` then resolves to `'submitted'` after a short delay.
   */
  protected onSubmitAllowances(): void {
    this.allowancesSubmitStatus.set('submitting');
    setTimeout(() => this.allowancesSubmitStatus.set('submitted'), 1200);
  }

  /**
   * Stubs submission of adjustments to HMRC.
   * Sets status to `'submitting'` then resolves to `'submitted'` after a short delay.
   */
  protected onSubmitAdjustments(): void {
    this.adjustmentsSubmitStatus.set('submitting');
    setTimeout(() => this.adjustmentsSubmitStatus.set('submitted'), 1200);
  }

  /**
   * Stubs submission of dividends to HMRC.
   * Sets status to `'submitting'` then resolves to `'submitted'` after a short delay.
   */
  protected onSubmitDividends(): void {
    this.dividendsSubmitStatus.set('submitting');
    setTimeout(() => this.dividendsSubmitStatus.set('submitted'), 1200);
  }

  /** Toggles the historical allowances panel visibility. */
  protected onToggleAllowancesHistory(): void {
    this.showAllowancesHistory.update(v => !v);
  }

  // ── Template helpers ─────────────────────────────────────────────────────────

  /**
   * Returns a human-readable label for an income source type.
   * @param typeOfBusiness - The raw `typeOfBusiness` string.
   */
  protected sourceLabel(typeOfBusiness: string): string {
    switch (typeOfBusiness) {
      case 'self-employment': return 'Self Employment';
      case 'uk-property': return 'UK Property';
      case 'foreign-property': return 'Foreign Property';
      default: return typeOfBusiness;
    }
  }

  /**
   * Returns a human-readable label for a section.
   * @param section - The section identifier.
   */
  protected sectionLabel(section: IncomeAdjustmentsSection): string {
    switch (section) {
      case 'allowances': return 'Allowances';
      case 'adjustments': return 'Adjustments';
      case 'dividends': return 'Dividends';
    }
  }

  /** Loads synthetic test data for UI development without authentication. */
  protected onLoadTestData(): void {
    this.store.seedTestData();
  }
}
