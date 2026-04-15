/**
 * @fileoverview Modal component for editing annual allowances per income source.
 * Renders fields appropriate to the active source type (SE vs property).
 */
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IncomeAdjustmentsStore } from '../../store/income-adjustments.store';
import { AllowanceEntry } from '../../model/income-adjustments.model';

/** Field descriptor for a single allowance input row. */
interface AllowanceRow {
  /** Property key on {@link AllowanceEntry}. */
  field: keyof AllowanceEntry;
  /** Human-readable label. */
  label: string;
}

const SE_ALLOWANCE_ROWS: AllowanceRow[] = [
  { field: 'annualInvestmentAllowance', label: 'Annual Investment Allowance' },
  { field: 'capitalAllowanceMainPool', label: 'Capital Allowance — Main Pool' },
  { field: 'tradingIncomeAllowance', label: 'Trading Income Allowance' },
];

const PROP_ALLOWANCE_ROWS: AllowanceRow[] = [
  { field: 'annualInvestmentAllowance', label: 'Annual Investment Allowance' },
  { field: 'propertyIncomeAllowance', label: 'Property Income Allowance' },
  { field: 'otherCapitalAllowance', label: 'Other Capital Allowance' },
];

/**
 * Overlay modal for editing annual allowances for a single income source.
 * Fields shown depend on the source type read from the store's
 * {@link IncomeAdjustmentsStore.activeAllowancesEntry}.
 */
@Component({
  selector: 'app-allowances-modal',
  templateUrl: './allowances-modal.component.html',
  styleUrl: './allowances-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AllowancesModalComponent {
  protected readonly store = inject(IncomeAdjustmentsStore);

  /** Rows to display for the active source type. */
  protected get rows(): AllowanceRow[] {
    const entry = this.store.activeAllowancesEntry();
    if (!entry) return [];
    return entry.typeOfBusiness === 'self-employment' ? SE_ALLOWANCE_ROWS : PROP_ALLOWANCE_ROWS;
  }

  /** Human-readable title for the active source. */
  protected get sourceTitle(): string {
    const entry = this.store.activeAllowancesEntry();
    if (!entry) return '';
    switch (entry.typeOfBusiness) {
      case 'self-employment': return 'Self Employment';
      case 'uk-property': return 'UK Property';
      case 'foreign-property': return 'Foreign Property';
      default: return entry.typeOfBusiness;
    }
  }

  /**
   * Handles number input changes and patches the store.
   * @param field - The allowance field being updated.
   * @param event - The DOM input event.
   */
  protected onInput(field: keyof AllowanceEntry, event: Event): void {
    const entry = this.store.activeAllowancesEntry();
    if (!entry) return;
    const raw = (event.target as HTMLInputElement).value;
    const value = raw === '' ? undefined : parseFloat(raw);
    this.store.patchAllowances(entry.typeOfBusiness, { [field]: value } as Partial<AllowanceEntry>);
  }

  /** Closes the modal. */
  protected close(): void {
    this.store.closeAllowancesModal();
  }
}
