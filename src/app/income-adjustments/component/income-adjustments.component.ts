/**
 * @fileoverview Income & Adjustments tab component.
 * Presents annual allowances, BSAS adjustments, and dividend declarations
 * across three income sources via a two-level section + source navigation.
 */
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, linkedSignal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { IncomeAdjustmentsStore } from '../store/income-adjustments.store';
import { IncomeAdjustmentsSection, AllowanceEntry, AdjustmentEntry } from '../model/income-adjustments.model';
import { AllowancesModalComponent } from './allowances-modal/allowances-modal.component';
import { AdjustmentsModalComponent } from './adjustments-modal/adjustments-modal.component';
import { DividendsModalComponent } from './dividends-modal/dividends-modal.component';

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
