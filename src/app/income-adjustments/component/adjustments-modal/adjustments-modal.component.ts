/**
 * @fileoverview Modal component for editing BSAS accounting adjustments per income source.
 * SE sources render income, expenses, and additions groups matching the BSAS v7.0 schema.
 * Property sources render annual-submission adjustment fields.
 */
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IncomeAdjustmentsStore } from '../../store/income-adjustments.store';
import { AdjustmentEntry } from '../../model/income-adjustments.model';

/** Keys of {@link AdjustmentEntry} that hold numeric adjustment values. */
type NumericAdjKey =
  // SE BSAS income
  | 'turnover' | 'otherIncome'
  // SE BSAS expenses
  | 'costOfGoods' | 'paymentsToSubcontractors' | 'wagesAndStaffCosts'
  | 'carVanTravelExpenses' | 'premisesRunningCosts' | 'maintenanceCosts'
  | 'adminCosts' | 'interestOnBankOtherLoans' | 'financeCharges'
  | 'irrecoverableDebts' | 'professionalFees' | 'depreciation'
  | 'otherExpenses' | 'advertisingCosts' | 'businessEntertainmentCosts'
  // SE BSAS additions (disallowable)
  | 'costOfGoodsDisallowable' | 'paymentsToSubcontractorsDisallowable'
  | 'wagesAndStaffCostsDisallowable' | 'carVanTravelExpensesDisallowable'
  | 'premisesRunningCostsDisallowable' | 'maintenanceCostsDisallowable'
  | 'adminCostsDisallowable' | 'interestOnBankOtherLoansDisallowable'
  | 'financeChargesDisallowable' | 'irrecoverableDebtsDisallowable'
  | 'professionalFeesDisallowable' | 'depreciationDisallowable'
  | 'otherExpensesDisallowable' | 'advertisingCostsDisallowable'
  | 'businessEntertainmentCostsDisallowable'
  // Property annual submission
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

/** A labelled group of numeric adjustment rows shown in the modal. */
interface AdjustmentGroup {
  /** Display heading for the group. */
  heading: string;
  /** Ordered rows within the group. */
  rows: AdjustmentRow[];
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

const SE_ADJUSTMENT_GROUPS: AdjustmentGroup[] = [
  {
    heading: 'Income',
    rows: [
      { field: 'turnover',    label: 'Turnover',    allowNegative: true },
      { field: 'otherIncome', label: 'Other Income', allowNegative: true },
    ],
  },
  {
    heading: 'Expenses',
    rows: [
      { field: 'costOfGoods',                label: 'Cost of Goods',                allowNegative: true },
      { field: 'paymentsToSubcontractors',   label: 'Payments to Subcontractors',   allowNegative: true },
      { field: 'wagesAndStaffCosts',         label: 'Wages and Staff Costs',        allowNegative: true },
      { field: 'carVanTravelExpenses',       label: 'Car, Van and Travel Expenses', allowNegative: true },
      { field: 'premisesRunningCosts',       label: 'Premises Running Costs',       allowNegative: true },
      { field: 'maintenanceCosts',           label: 'Maintenance Costs',            allowNegative: true },
      { field: 'adminCosts',                 label: 'Admin Costs',                  allowNegative: true },
      { field: 'interestOnBankOtherLoans',   label: 'Interest on Bank / Other Loans', allowNegative: true },
      { field: 'financeCharges',             label: 'Finance Charges',              allowNegative: true },
      { field: 'irrecoverableDebts',         label: 'Irrecoverable Debts',          allowNegative: true },
      { field: 'professionalFees',           label: 'Professional Fees',            allowNegative: true },
      { field: 'depreciation',               label: 'Depreciation',                 allowNegative: true },
      { field: 'otherExpenses',              label: 'Other Expenses',               allowNegative: true },
      { field: 'advertisingCosts',           label: 'Advertising Costs',            allowNegative: true },
      { field: 'businessEntertainmentCosts', label: 'Business Entertainment Costs', allowNegative: true },
    ],
  },
  {
    heading: 'Additions (Disallowable)',
    rows: [
      { field: 'costOfGoodsDisallowable',                label: 'Cost of Goods' },
      { field: 'paymentsToSubcontractorsDisallowable',   label: 'Payments to Subcontractors' },
      { field: 'wagesAndStaffCostsDisallowable',         label: 'Wages and Staff Costs' },
      { field: 'carVanTravelExpensesDisallowable',       label: 'Car, Van and Travel Expenses' },
      { field: 'premisesRunningCostsDisallowable',       label: 'Premises Running Costs' },
      { field: 'maintenanceCostsDisallowable',           label: 'Maintenance Costs' },
      { field: 'adminCostsDisallowable',                 label: 'Admin Costs' },
      { field: 'interestOnBankOtherLoansDisallowable',   label: 'Interest on Bank / Other Loans' },
      { field: 'financeChargesDisallowable',             label: 'Finance Charges' },
      { field: 'irrecoverableDebtsDisallowable',         label: 'Irrecoverable Debts' },
      { field: 'professionalFeesDisallowable',           label: 'Professional Fees' },
      { field: 'depreciationDisallowable',               label: 'Depreciation' },
      { field: 'otherExpensesDisallowable',              label: 'Other Expenses' },
      { field: 'advertisingCostsDisallowable',           label: 'Advertising Costs' },
      { field: 'businessEntertainmentCostsDisallowable', label: 'Business Entertainment Costs' },
    ],
  },
];

const PROP_ADJUSTMENT_GROUPS: AdjustmentGroup[] = [
  {
    heading: 'Adjustments',
    rows: [
      { field: 'privateUseAdjustment',                          label: 'Private Use Adjustment' },
      { field: 'balancingCharge',                               label: 'Balancing Charge' },
      { field: 'businessPremisesRenovationAllowanceBalancingCharges', label: 'BPRA Balancing Charges' },
    ],
  },
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
 * SE sources render BSAS v7.0 income/expenses/additions fields.
 * Property sources render annual submission adjustment fields.
 */
@Component({
  selector: 'app-adjustments-modal',
  templateUrl: './adjustments-modal.component.html',
  styleUrl: './adjustments-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdjustmentsModalComponent {
  protected readonly store = inject(IncomeAdjustmentsStore);

  /**
   * Numeric adjustment groups for the active source type.
   * SE: three groups (Income / Expenses / Additions); property: one group.
   */
  protected get groups(): AdjustmentGroup[] {
    const entry = this.store.activeAdjustmentsEntry();
    if (!entry) return [];
    return entry.typeOfBusiness === 'self-employment' ? SE_ADJUSTMENT_GROUPS : PROP_ADJUSTMENT_GROUPS;
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
