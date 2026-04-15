/**
 * @fileoverview Modal component for editing BSAS adjustments per income source.
 */
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IncomeAdjustmentsStore } from '../../store/income-adjustments.store';
import { AdjustmentEntry } from '../../model/income-adjustments.model';

/** Field descriptor for a single numeric adjustment input row. */
interface AdjustmentRow {
  /** Property key on {@link AdjustmentEntry}. */
  field: keyof AdjustmentEntry;
  /** Human-readable label. */
  label: string;
}

const SE_ADJUSTMENT_ROWS: AdjustmentRow[] = [
  { field: 'includedNonTaxableProfits', label: 'Included Non-Taxable Profits' },
  { field: 'basisAdjustment', label: 'Basis Adjustment' },
  { field: 'overlapReliefUsed', label: 'Overlap Relief Used' },
];

const PROP_ADJUSTMENT_ROWS: AdjustmentRow[] = [
  { field: 'privateUseAdjustment', label: 'Private Use Adjustment' },
  { field: 'balancingCharge', label: 'Balancing Charge' },
];

/**
 * Overlay modal for editing BSAS adjustment figures for a single income source.
 * Includes a text field for the Calculation ID required by the BSAS API.
 */
@Component({
  selector: 'app-adjustments-modal',
  templateUrl: './adjustments-modal.component.html',
  styleUrl: './adjustments-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdjustmentsModalComponent {
  protected readonly store = inject(IncomeAdjustmentsStore);

  /** Rows to display for the active source type. */
  protected get rows(): AdjustmentRow[] {
    const entry = this.store.activeAdjustmentsEntry();
    if (!entry) return [];
    return entry.typeOfBusiness === 'self-employment' ? SE_ADJUSTMENT_ROWS : PROP_ADJUSTMENT_ROWS;
  }

  /** Human-readable title for the active source. */
  protected get sourceTitle(): string {
    const entry = this.store.activeAdjustmentsEntry();
    if (!entry) return '';
    switch (entry.typeOfBusiness) {
      case 'self-employment': return 'Self Employment';
      case 'uk-property': return 'UK Property';
      case 'foreign-property': return 'Foreign Property';
      default: return entry.typeOfBusiness;
    }
  }

  /**
   * Handles calculation ID text changes.
   * @param event - The DOM input event.
   */
  protected onCalcIdInput(event: Event): void {
    const entry = this.store.activeAdjustmentsEntry();
    if (!entry) return;
    const value = (event.target as HTMLInputElement).value || undefined;
    this.store.patchAdjustments(entry.typeOfBusiness, { calculationId: value });
  }

  /**
   * Handles numeric field changes and patches the store.
   * @param field - The adjustment field being updated.
   * @param event - The DOM input event.
   */
  protected onInput(field: keyof AdjustmentEntry, event: Event): void {
    const entry = this.store.activeAdjustmentsEntry();
    if (!entry) return;
    const raw = (event.target as HTMLInputElement).value;
    const value = raw === '' ? undefined : parseFloat(raw);
    this.store.patchAdjustments(entry.typeOfBusiness, { [field]: value } as Partial<AdjustmentEntry>);
  }

  /** Closes the modal. */
  protected close(): void {
    this.store.closeAdjustmentsModal();
  }
}
