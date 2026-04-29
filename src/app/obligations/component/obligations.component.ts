/**
 * @fileoverview Obligations tab component. Fetches and displays HMRC MTD
 * obligations for the authenticated user, grouped by tax year and income source.
 */
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, linkedSignal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { AppStore } from '../../core';
import { ObligationsStore } from '../store/obligations.store';
import { ObligationRow } from '../model/obligations.model';

/**
 * Displays HMRC obligations using a two-level navigation identical to the
 * Quarterly Update tab: tax-year selector (top) and income-source tabs (second row).
 * On init, triggers a fetch via {@link ObligationsStore}.
 */
@Component({
  selector: 'app-obligations',
  imports: [DatePipe],
  templateUrl: './obligations.component.html',
  styleUrl: './obligations.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ObligationsComponent implements OnInit {
  protected readonly store = inject(ObligationsStore);
  protected readonly appStore = inject(AppStore);
  private readonly router = inject(Router);

  // ── Two-level navigation ────────────────────────────────────────────────────

  /** Unique HMRC tax years derived from all obligation rows, sorted ascending. */
  protected readonly taxYearList = computed((): string[] => {
    const seen = new Set<string>();
    const years: string[] = [];
    for (const row of this.store.obligationRows()) {
      const ty = this.taxYearFor(row.periodStartDate);
      if (!seen.has(ty)) { seen.add(ty); years.push(ty); }
    }
    return years.sort();
  });

  /**
   * Currently selected tax year; auto-selects the first entry whenever the
   * year list changes (e.g. after data loads or seed is applied).
   */
  protected readonly selectedTaxYear = linkedSignal<string | null>(() => {
    const list = this.taxYearList();
    return list.length > 0 ? list[0] : null;
  });

  /** Unique source types that have obligations in the selected tax year. */
  protected readonly sourceList = computed((): string[] => {
    const ty = this.selectedTaxYear();
    if (!ty) return [];
    const seen = new Set<string>();
    const sources: string[] = [];
    for (const row of this.store.obligationRows()) {
      if (this.taxYearFor(row.periodStartDate) === ty && !seen.has(row.typeOfBusiness)) {
        seen.add(row.typeOfBusiness);
        sources.push(row.typeOfBusiness);
      }
    }
    return sources;
  });

  /**
   * Currently selected income source type; auto-resets to the first source
   * whenever the active tax year changes.
   */
  protected readonly selectedSource = linkedSignal<string | null>(() => {
    const list = this.sourceList();
    return list.length > 0 ? list[0] : null;
  });

  /** Obligation rows for the selected tax year and source type. */
  protected readonly selectedRows = computed((): ObligationRow[] => {
    const ty = this.selectedTaxYear();
    const src = this.selectedSource();
    if (!ty || !src) return [];
    return this.store.obligationRows().filter(r =>
      this.taxYearFor(r.periodStartDate) === ty && r.typeOfBusiness === src
    );
  });

  /** @inheritdoc */
  ngOnInit(): void {
    void this.store.loadObligations();
  }

  // ── Navigation handlers ─────────────────────────────────────────────────────

  /**
   * Selects the given tax year (top-level nav).
   * @param taxYear - Tax year string e.g. `'2024-25'`.
   */
  protected selectTaxYear(taxYear: string): void {
    this.selectedTaxYear.set(taxYear);
  }

  /**
   * Selects the given income source tab.
   * @param type - The `typeOfBusiness` string.
   */
  protected selectSource(type: string): void {
    this.selectedSource.set(type);
  }

  // ── Template helpers ────────────────────────────────────────────────────────

  /**
   * Returns the HMRC tax year string for a given obligation period start date.
   * The UK tax year runs from 6 April to 5 April.
   * @param periodStartDate - ISO date string (YYYY-MM-DD).
   */
  protected taxYearFor(periodStartDate: string): string {
    const d = new Date(periodStartDate);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    if (m > 4 || (m === 4 && day >= 6)) {
      return `${y}-${String(y + 1).slice(2)}`;
    }
    return `${y - 1}-${String(y).slice(2)}`;
  }

  /**
   * Returns the aggregate obligation status for a source type within a tax year.
   * @param type - `typeOfBusiness` string.
   * @param taxYear - Tax year string.
   */
  protected sourceStatus(type: string, taxYear: string): 'overdue' | 'open' | 'fulfilled' {
    const rows = this.store.obligationRows().filter(r =>
      this.taxYearFor(r.periodStartDate) === taxYear && r.typeOfBusiness === type
    );
    if (rows.some(r => r.status === 'open' && this.daysUntilDue(r.dueDate) <= 0)) return 'overdue';
    if (rows.some(r => r.status === 'open')) return 'open';
    return 'fulfilled';
  }

  /**
   * Returns the number of whole days until the given due date.
   * Negative values indicate the obligation is overdue.
   * @param dueDate - ISO date string (YYYY-MM-DD).
   */
  protected daysUntilDue(dueDate: string): number {
    return Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86_400_000);
  }

  /**
   * Returns a human-readable label for an income source type.
   * @param typeOfBusiness - The raw `typeOfBusiness` string from the obligations API.
   */
  protected sourceLabel(typeOfBusiness: string): string {
    switch (typeOfBusiness) {
      case 'self-employment': return 'Self Employment';
      case 'uk-property': return 'UK Property';
      case 'foreign-property': return 'Foreign Property';
      case 'ITSA': return 'Annual Return';
      default: return typeOfBusiness;
    }
  }

  /**
   * Returns the label for the action button in a given obligation row.
   * @param row - The obligation row.
   */
  protected actionLabel(row: ObligationRow): string {
    return row.status === 'fulfilled' ? 'View' : 'Create / Amend';
  }

  /**
   * Navigates to the appropriate tab for a given obligation row.
   * ITSA obligations route to the Self Assessment tab; all other income sources
   * route to the Quarterly Update tab with the period and business pre-selected.
   * @param row - The obligation row whose action button was clicked.
   */
  protected onAction(row: ObligationRow): void {
    if (row.typeOfBusiness === 'ITSA') {
      void this.router.navigate(['/self-assessment'], {
        state: { taxYear: this.taxYearFor(row.periodStartDate) },
      });
    } else {
      void this.router.navigate(['/quarterly'], {
        state: { periodStart: row.periodStartDate, businessId: row.businessId },
      });
    }
  }

  /** Loads synthetic test obligations for UI development without authentication. */
  protected onLoadTestData(): void {
    this.store.seedTestObligations();
  }
}
