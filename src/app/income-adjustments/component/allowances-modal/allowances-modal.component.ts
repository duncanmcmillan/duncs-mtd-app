/**
 * @fileoverview Modal component for editing annual allowances per income source.
 * Renders fields appropriate to the active source type (SE, UK Property, Foreign Property).
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
  /** Optional note shown below the label (e.g. mutual-exclusivity warning). */
  note?: string;
}

const SE_ALLOWANCE_ROWS: AllowanceRow[] = [
  { field: 'annualInvestmentAllowance', label: 'Annual Investment Allowance' },
  { field: 'capitalAllowanceMainPool', label: 'Capital Allowance — Main Pool' },
  { field: 'capitalAllowanceSpecialRatePool', label: 'Capital Allowance — Special Rate Pool' },
  { field: 'capitalAllowanceSingleAssetPool', label: 'Capital Allowance — Single Asset Pool' },
  { field: 'enhancedCapitalAllowance', label: 'Enhanced Capital Allowance' },
  { field: 'allowanceOnSales', label: 'Allowance on Sales' },
  { field: 'zeroEmissionsCarAllowance', label: 'Zero Emissions Car Allowance' },
  { field: 'businessPremisesRenovationAllowance', label: 'Business Premises Renovation Allowance' },
  {
    field: 'tradingIncomeAllowance',
    label: 'Trading Income Allowance',
    note: 'Mutually exclusive with all other allowances above',
  },
];

const UK_PROP_ALLOWANCE_ROWS: AllowanceRow[] = [
  { field: 'annualInvestmentAllowance', label: 'Annual Investment Allowance' },
  { field: 'electricChargePointAllowance', label: 'Electric Charge Point Allowance' },
  { field: 'zeroEmissionsGoodsVehicleAllowance', label: 'Zero Emissions Goods Vehicle Allowance' },
  { field: 'zeroEmissionsCarAllowance', label: 'Zero Emissions Car Allowance' },
  { field: 'businessPremisesRenovationAllowance', label: 'Business Premises Renovation Allowance' },
  { field: 'otherCapitalAllowance', label: 'Other Capital Allowance' },
  { field: 'costOfReplacingDomesticItems', label: 'Cost of Replacing Domestic Items' },
  {
    field: 'propertyIncomeAllowance',
    label: 'Property Income Allowance',
    note: 'Mutually exclusive with most deductible expenses (capped at £1,000)',
  },
];

const FP_ALLOWANCE_ROWS: AllowanceRow[] = [
  { field: 'annualInvestmentAllowance', label: 'Annual Investment Allowance' },
  { field: 'zeroEmissionsGoodsVehicleAllowance', label: 'Zero Emissions Goods Vehicle Allowance' },
  { field: 'zeroEmissionsCarAllowance', label: 'Zero Emissions Car Allowance' },
  { field: 'otherCapitalAllowance', label: 'Other Capital Allowance' },
  { field: 'costOfReplacingDomesticItems', label: 'Cost of Replacing Domestic Items' },
  {
    field: 'propertyIncomeAllowance',
    label: 'Property Income Allowance',
    note: 'Mutually exclusive with most deductible expenses (capped at £1,000)',
  },
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
    switch (entry.typeOfBusiness) {
      case 'self-employment': return SE_ALLOWANCE_ROWS;
      case 'uk-property': return UK_PROP_ALLOWANCE_ROWS;
      case 'foreign-property': return FP_ALLOWANCE_ROWS;
      default: return [];
    }
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
