/**
 * @fileoverview Modal component for viewing and editing the detailed breakdown
 * of expenses for a quarterly update draft. Supports self-employment
 * (allowable + non-allowable), UK property, and foreign property expense categories.
 */
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { QuarterlyStore } from '../../store/quarterly.store';
import { DataEntryStore } from '../../../data-entry';
import { FieldMappingBtnComponent, MappingChangeEvent } from '../../../data-entry/component/field-mapping-btn/field-mapping-btn.component';
import {
  QuarterlyDraft,
  SelfEmploymentExpenses,
  SelfEmploymentDisallowableExpenses,
  UkPropertyExpenses,
  ForeignPropertyExpenses,
  draftKey,
} from '../../model/quarterly.model';

/** A labelled row in the expenses form. */
interface ExpenseRow<T extends object> {
  /** Display label for the expense line. */
  label: string;
  /** The key in the expense object this row maps to. */
  field: keyof T;
}

/** Allowable self-employment expense rows in display order. */
const SE_EXPENSE_ROWS: ExpenseRow<SelfEmploymentExpenses>[] = [
  { label: 'Cost Of Goods', field: 'costOfGoods' },
  { label: 'Payments To Subcontractors', field: 'paymentsToSubcontractors' },
  { label: 'Wages And Staff Costs', field: 'wagesAndStaffCosts' },
  { label: 'Car, Van And Travel', field: 'carVanTravelExpenses' },
  { label: 'Premises Running Costs', field: 'premisesRunningCosts' },
  { label: 'Repairs And Maintenance', field: 'maintenanceCosts' },
  { label: 'Administration Costs', field: 'adminCosts' },
  { label: 'Business Entertainment', field: 'businessEntertainmentCosts' },
  { label: 'Advertising And Marketing', field: 'advertisingCosts' },
  { label: 'Interest On Loans', field: 'interestOnBankOtherLoans' },
  { label: 'Finance Charges', field: 'financeCharges' },
  { label: 'Irrecoverable (Bad) Debts', field: 'irrecoverableDebts' },
  { label: 'Professional Fees', field: 'professionalFees' },
  { label: 'Depreciation', field: 'depreciation' },
  { label: 'Other Expenses', field: 'otherExpenses' },
];

/** Non-allowable (disallowable) self-employment expense rows. */
const SE_DISALLOWABLE_ROWS: ExpenseRow<SelfEmploymentDisallowableExpenses>[] = [
  { label: 'Cost Of Goods', field: 'costOfGoodsDisallowable' },
  { label: 'Payments To Subcontractors', field: 'paymentsToSubcontractorsDisallowable' },
  { label: 'Wages And Staff Costs', field: 'wagesAndStaffCostsDisallowable' },
  { label: 'Car, Van And Travel', field: 'carVanTravelExpensesDisallowable' },
  { label: 'Premises Running Costs', field: 'premisesRunningCostsDisallowable' },
  { label: 'Repairs And Maintenance', field: 'maintenanceCostsDisallowable' },
  { label: 'Administration Costs', field: 'adminCostsDisallowable' },
  { label: 'Business Entertainment', field: 'businessEntertainmentCostsDisallowable' },
  { label: 'Advertising And Marketing', field: 'advertisingCostsDisallowable' },
  { label: 'Interest On Loans', field: 'interestOnBankOtherLoansDisallowable' },
  { label: 'Finance Charges', field: 'financeChargesDisallowable' },
  { label: 'Irrecoverable (Bad) Debts', field: 'irrecoverableDebtsDisallowable' },
  { label: 'Professional Fees', field: 'professionalFeesDisallowable' },
  { label: 'Depreciation', field: 'depreciationDisallowable' },
  { label: 'Other Expenses', field: 'otherExpensesDisallowable' },
];

/** UK property expense rows in display order. */
const PROP_EXPENSE_ROWS: ExpenseRow<UkPropertyExpenses>[] = [
  { label: 'Premises Running Costs', field: 'premisesRunningCosts' },
  { label: 'Repairs And Maintenance', field: 'repairsAndMaintenance' },
  { label: 'Financial Costs (Mortgage Interest)', field: 'financialCosts' },
  { label: 'Professional Fees', field: 'professionalFees' },
  { label: 'Cost Of Services', field: 'costOfServices' },
  { label: 'Travel Costs', field: 'travelCosts' },
  { label: 'Residential Finance Cost', field: 'residentialFinancialCost' },
  { label: 'Brought-Forward Residential Finance Cost', field: 'broughtFwdResidentialFinancialCost' },
  { label: 'Other Expenses', field: 'other' },
];

/** Foreign property expense rows in display order. */
const FOREIGN_PROP_EXPENSE_ROWS: ExpenseRow<ForeignPropertyExpenses>[] = [
  { label: 'Premises Running Costs', field: 'premisesRunningCosts' },
  { label: 'Repairs And Maintenance', field: 'repairsAndMaintenance' },
  { label: 'Financial Costs', field: 'financialCosts' },
  { label: 'Professional Fees', field: 'professionalFees' },
  { label: 'Cost Of Services', field: 'costOfServices' },
  { label: 'Travel Costs', field: 'travelCosts' },
  { label: 'Other Expenses', field: 'other' },
];

/**
 * Full-screen modal overlay for entering the detailed breakdown of
 * quarterly expenses for a single income source draft.
 * Reads and writes directly to {@link QuarterlyStore}.
 */
@Component({
  selector: 'app-expenses-modal',
  imports: [FieldMappingBtnComponent],
  templateUrl: './expenses-modal.component.html',
  styleUrl: './expenses-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpensesModalComponent {
  /** @internal */
  protected readonly store = inject(QuarterlyStore);
  /** @internal */
  protected readonly deStore = inject(DataEntryStore);

  /** `true` when a mappable data-entry method (Excel, AirTable, or Google Sheets) is active. */
  protected readonly isMappingActive = computed((): boolean => {
    const de = this.deStore.dataEntry();
    return de.excelEnabled || de.airtableEnabled || de.googleSheetsEnabled;
  });

  /** The active fieldMappings from the enabled spreadsheet source, or empty object. */
  protected readonly activeMappings = computed((): Record<string, string> => {
    const de = this.deStore.dataEntry();
    if (de.excelEnabled && de.excel?.fieldMappings) return de.excel.fieldMappings;
    if (de.airtableEnabled && de.airtable?.fieldMappings) return de.airtable.fieldMappings;
    if (de.googleSheetsEnabled && de.googleSheets?.fieldMappings) return de.googleSheets.fieldMappings;
    return {};
  });

  /**
   * Column headers for the active expenses draft's income type,
   * loaded from the active spreadsheet source.
   */
  protected readonly activeColumnHeaders = computed((): string[] => {
    const draft = this.store.activeExpensesDraft();
    if (!draft) return [];
    const h = this.deStore.columnHeaders();
    if (draft.businessType === 'self-employment') return h.selfEmployment;
    if (draft.businessType === 'uk-property')     return h.ukProperty;
    return h.foreignProperty;
  });

  /** @internal */
  protected readonly seExpenseRows = SE_EXPENSE_ROWS;
  /** @internal */
  protected readonly seDisallowableRows = SE_DISALLOWABLE_ROWS;
  /** @internal */
  protected readonly propExpenseRows = PROP_EXPENSE_ROWS;
  /** @internal */
  protected readonly foreignPropExpenseRows = FOREIGN_PROP_EXPENSE_ROWS;

  /** Currently active tab: `'allowable'` or `'disallowable'` (SE only). */
  protected activeTab: 'allowable' | 'disallowable' = 'allowable';

  /** @internal */
  protected draftKey(draft: QuarterlyDraft): string {
    return draftKey(draft.businessId, draft.periodStartDate);
  }

  /**
   * Handles numeric input changes for SE allowable expenses.
   * @param key - Draft key.
   * @param field - The expense field being changed.
   * @param event - The DOM input event.
   */
  protected onSEExpenseInput(
    key: string,
    field: keyof SelfEmploymentExpenses,
    event: Event,
  ): void {
    const value = parseNullableNumber((event.target as HTMLInputElement).value);
    this.store.patchSEExpenses(key, { [field]: value } as Partial<SelfEmploymentExpenses>);
  }

  /**
   * Handles numeric input changes for SE non-allowable expenses.
   * @param key - Draft key.
   * @param field - The disallowable expense field being changed.
   * @param event - The DOM input event.
   */
  protected onSEDisallowableInput(
    key: string,
    field: keyof SelfEmploymentDisallowableExpenses,
    event: Event,
  ): void {
    const value = parseNullableNumber((event.target as HTMLInputElement).value);
    this.store.patchSEDisallowable(key, {
      [field]: value,
    } as Partial<SelfEmploymentDisallowableExpenses>);
  }

  /**
   * Handles numeric input changes for UK property expenses.
   * @param key - Draft key.
   * @param field - The property expense field being changed.
   * @param event - The DOM input event.
   */
  protected onPropExpenseInput(
    key: string,
    field: keyof UkPropertyExpenses,
    event: Event,
  ): void {
    const value = parseNullableNumber((event.target as HTMLInputElement).value);
    this.store.patchPropExpenses(key, { [field]: value } as Partial<UkPropertyExpenses>);
  }

  /**
   * Handles numeric input changes for foreign property expenses.
   * @param key - Draft key.
   * @param field - The foreign property expense field being changed.
   * @param event - The DOM input event.
   */
  protected onForeignPropExpenseInput(
    key: string,
    field: keyof ForeignPropertyExpenses,
    event: Event,
  ): void {
    const value = parseNullableNumber((event.target as HTMLInputElement).value);
    this.store.patchForeignPropExpenses(key, { [field]: value } as Partial<ForeignPropertyExpenses>);
  }

  /**
   * Persists an updated field mapping to the active data-entry settings.
   * Removes the key when `columnName` is empty.
   * @param e - The mapping change event from {@link FieldMappingBtnComponent}.
   */
  protected async onMappingChange(e: MappingChangeEvent): Promise<void> {
    const de = this.deStore.dataEntry();
    if (de.excelEnabled) {
      const excel = de.excel ?? { filePath: '', dateColumn: '', fieldMappings: {} };
      const fieldMappings = { ...excel.fieldMappings };
      if (e.columnName) {
        fieldMappings[e.fieldKey] = e.columnName;
      } else {
        delete fieldMappings[e.fieldKey];
      }
      await this.deStore.saveDataEntry({ ...de, excel: { ...excel, fieldMappings } });
    } else if (de.airtableEnabled) {
      const airtable = de.airtable ?? { apiKey: '', baseId: '', dateColumn: '', fieldMappings: {} };
      const fieldMappings = { ...airtable.fieldMappings };
      if (e.columnName) {
        fieldMappings[e.fieldKey] = e.columnName;
      } else {
        delete fieldMappings[e.fieldKey];
      }
      await this.deStore.saveDataEntry({ ...de, airtable: { ...airtable, fieldMappings } });
    } else if (de.googleSheetsEnabled) {
      const gs = de.googleSheets ?? { spreadsheetId: '', apiKey: '', dateColumn: '', fieldMappings: {} };
      const fieldMappings = { ...gs.fieldMappings };
      if (e.columnName) {
        fieldMappings[e.fieldKey] = e.columnName;
      } else {
        delete fieldMappings[e.fieldKey];
      }
      await this.deStore.saveDataEntry({ ...de, googleSheets: { ...gs, fieldMappings } });
    }
  }

  /** Closes the modal via the store. */
  protected close(): void {
    this.store.closeExpensesModal();
  }
}

/** Parses an input string to a number, returning `null` for empty/invalid. */
function parseNullableNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = parseFloat(trimmed);
  return isNaN(n) ? null : n;
}
