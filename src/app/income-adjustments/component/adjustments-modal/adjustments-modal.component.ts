/**
 * @fileoverview Modal component for editing BSAS adjustments per income source.
 * Renders numeric adjustment fields and boolean status flags appropriate to
 * the active source type (SE: 11 numeric fields; Property: 3 numeric + 3 boolean flags).
 */
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IncomeAdjustmentsStore } from '../../store/income-adjustments.store';
import { AdjustmentEntry } from '../../model/income-adjustments.model';

/** Keys of {@link AdjustmentEntry} that hold numeric adjustment values. */
type NumericAdjKey =
  | 'includedNonTaxableProfits' | 'basisAdjustment' | 'overlapReliefUsed'
  | 'accountingAdjustment' | 'averagingAdjustment' | 'outstandingBusinessIncome'
  | 'balancingChargeBpra' | 'balancingChargeOther' | 'goodsAndServicesOwnUse'
  | 'transitionProfitAmount' | 'transitionProfitAccelerationAmount'
  | 'privateUseAdjustment' | 'balancingCharge'
  | 'businessPremisesRenovationAllowanceBalancingCharges';

/** Keys of {@link AdjustmentEntry} that hold boolean status flags. */
type BoolAdjKey = 'nonResidentLandlord' | 'periodOfGraceAdjustment' | 'rentARoomJointlyLet';

/** Field descriptor for a single numeric adjustment input row. */
interface AdjustmentRow {
  /** Property key (numeric fields only). */
  field: NumericAdjKey;
  /** Human-readable label. */
  label: string;
  /** If `true`, the field may hold a negative value. */
  allowNegative?: boolean;
}

/** Field descriptor for a boolean status flag row. */
interface FlagRow {
  /** Property key (boolean fields only). */
  field: BoolAdjKey;
  /** Human-readable label. */
  label: string;
  /** Additional context shown below the label. */
  note?: string;
}

const SE_ADJUSTMENT_ROWS: AdjustmentRow[] = [
  { field: 'includedNonTaxableProfits', label: 'Included Non-Taxable Profits' },
  { field: 'basisAdjustment', label: 'Basis Adjustment', allowNegative: true },
  { field: 'overlapReliefUsed', label: 'Overlap Relief Used' },
  { field: 'accountingAdjustment', label: 'Accounting Adjustment' },
  { field: 'averagingAdjustment', label: 'Averaging Adjustment', allowNegative: true },
  { field: 'outstandingBusinessIncome', label: 'Outstanding Business Income' },
  { field: 'balancingChargeBpra', label: 'Balancing Charge (BPRA)' },
  { field: 'balancingChargeOther', label: 'Balancing Charge (Other)' },
  { field: 'goodsAndServicesOwnUse', label: 'Goods and Services Own Use' },
  { field: 'transitionProfitAmount', label: 'Transition Profit Amount' },
  { field: 'transitionProfitAccelerationAmount', label: 'Transition Profit Acceleration' },
];

const PROP_ADJUSTMENT_ROWS: AdjustmentRow[] = [
  { field: 'privateUseAdjustment', label: 'Private Use Adjustment' },
  { field: 'balancingCharge', label: 'Balancing Charge' },
  { field: 'businessPremisesRenovationAllowanceBalancingCharges', label: 'BPRA Balancing Charges' },
];

const PROP_FLAG_ROWS: FlagRow[] = [
  {
    field: 'nonResidentLandlord',
    label: 'Non-Resident Landlord',
    note: 'The landlord is not resident in the UK for tax purposes',
  },
  {
    field: 'periodOfGraceAdjustment',
    label: 'Period of Grace Adjustment',
    note: 'Property qualified for FHL last year but not this year (FHL only)',
  },
  {
    field: 'rentARoomJointlyLet',
    label: 'Rent a Room — Jointly Let',
    note: 'Rent a Room income is shared with another person',
  },
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

  /** Numeric adjustment rows for the active source type. */
  protected get rows(): AdjustmentRow[] {
    const entry = this.store.activeAdjustmentsEntry();
    if (!entry) return [];
    return entry.typeOfBusiness === 'self-employment' ? SE_ADJUSTMENT_ROWS : PROP_ADJUSTMENT_ROWS;
  }

  /** Boolean flag rows — only shown for property source types. */
  protected get flagRows(): FlagRow[] {
    const entry = this.store.activeAdjustmentsEntry();
    if (!entry || entry.typeOfBusiness === 'self-employment') return [];
    return PROP_FLAG_ROWS;
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
   * @param field - The numeric adjustment field being updated.
   * @param event - The DOM input event.
   */
  protected onInput(field: NumericAdjKey, event: Event): void {
    const entry = this.store.activeAdjustmentsEntry();
    if (!entry) return;
    const raw = (event.target as HTMLInputElement).value;
    const value = raw === '' ? undefined : parseFloat(raw);
    this.store.patchAdjustments(entry.typeOfBusiness, { [field]: value } as Partial<AdjustmentEntry>);
  }

  /**
   * Handles boolean flag checkbox changes and patches the store.
   * @param field - The boolean flag field being updated.
   * @param event - The DOM change event.
   */
  protected onFlagChange(field: BoolAdjKey, event: Event): void {
    const entry = this.store.activeAdjustmentsEntry();
    if (!entry) return;
    const checked = (event.target as HTMLInputElement).checked;
    this.store.patchAdjustments(entry.typeOfBusiness, { [field]: checked } as Partial<AdjustmentEntry>);
  }

  /** Closes the modal. */
  protected close(): void {
    this.store.closeAdjustmentsModal();
  }
}
