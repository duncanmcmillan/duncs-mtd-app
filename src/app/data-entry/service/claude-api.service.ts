/**
 * @fileoverview Angular service for calling the Anthropic Claude API to
 * auto-suggest spreadsheet column → MTD field mappings.
 */
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

/** A single MTD field definition used when prompting Claude for suggestions. */
export interface FieldDefinition {
  /** Dotted MTD field key, e.g. `'se.income.turnover'`. */
  key: string;
  /** Human-readable label shown in the quarterly form. */
  label: string;
}

/**
 * All mappable MTD fields, covering self-employment income/expenses/disallowables,
 * UK property, and foreign property.
 */
export const FIELD_DEFINITIONS: FieldDefinition[] = [
  // Self-employment income
  { key: 'se.income.turnover',   label: 'Sales / Turnover' },
  { key: 'se.income.other',      label: 'Other Income (SE)' },
  // Self-employment expenses
  { key: 'se.exp.costOfGoods',                    label: 'Cost of Goods Sold' },
  { key: 'se.exp.paymentsToSubcontractors',       label: 'Payments to Subcontractors' },
  { key: 'se.exp.wagesAndStaffCosts',             label: 'Wages & Staff Costs' },
  { key: 'se.exp.carVanTravelExpenses',           label: 'Car, Van & Travel Expenses' },
  { key: 'se.exp.premisesRunningCosts',           label: 'Premises Running Costs (SE)' },
  { key: 'se.exp.maintenanceCosts',               label: 'Maintenance Costs (SE)' },
  { key: 'se.exp.adminCosts',                     label: 'Admin Costs' },
  { key: 'se.exp.businessEntertainmentCosts',     label: 'Business Entertainment' },
  { key: 'se.exp.advertisingCosts',               label: 'Advertising Costs' },
  { key: 'se.exp.interestOnBankOtherLoans',       label: 'Interest on Bank / Other Loans' },
  { key: 'se.exp.financeCharges',                 label: 'Finance Charges' },
  { key: 'se.exp.irrecoverableDebts',             label: 'Irrecoverable Debts' },
  { key: 'se.exp.professionalFees',               label: 'Professional Fees (SE)' },
  { key: 'se.exp.depreciation',                   label: 'Depreciation' },
  { key: 'se.exp.otherExpenses',                  label: 'Other Expenses (SE)' },
  // Self-employment disallowable expenses
  { key: 'se.dis.costOfGoodsDisallowable',                label: 'Cost of Goods (Disallowable)' },
  { key: 'se.dis.paymentsToSubcontractorsDisallowable',   label: 'Subcontractors (Disallowable)' },
  { key: 'se.dis.wagesAndStaffCostsDisallowable',         label: 'Wages (Disallowable)' },
  { key: 'se.dis.carVanTravelExpensesDisallowable',       label: 'Car & Travel (Disallowable)' },
  { key: 'se.dis.premisesRunningCostsDisallowable',       label: 'Premises (Disallowable)' },
  { key: 'se.dis.maintenanceCostsDisallowable',           label: 'Maintenance (Disallowable)' },
  { key: 'se.dis.adminCostsDisallowable',                 label: 'Admin (Disallowable)' },
  { key: 'se.dis.businessEntertainmentCostsDisallowable', label: 'Entertainment (Disallowable)' },
  { key: 'se.dis.advertisingCostsDisallowable',           label: 'Advertising (Disallowable)' },
  { key: 'se.dis.interestOnBankOtherLoansDisallowable',   label: 'Loan Interest (Disallowable)' },
  { key: 'se.dis.financeChargesDisallowable',             label: 'Finance Charges (Disallowable)' },
  { key: 'se.dis.irrecoverableDebtsDisallowable',         label: 'Bad Debts (Disallowable)' },
  { key: 'se.dis.professionalFeesDisallowable',           label: 'Professional Fees (Disallowable)' },
  { key: 'se.dis.depreciationDisallowable',               label: 'Depreciation (Disallowable)' },
  { key: 'se.dis.otherExpensesDisallowable',              label: 'Other Expenses (Disallowable)' },
  // UK property income
  { key: 'ukprop.income.rentAmount',   label: 'Rent Income (UK Property)' },
  { key: 'ukprop.income.otherIncome',  label: 'Other Income (UK Property)' },
  // UK property expenses
  { key: 'ukprop.exp.premisesRunningCosts',              label: 'Premises Running Costs (UKP)' },
  { key: 'ukprop.exp.repairsAndMaintenance',             label: 'Repairs & Maintenance (UKP)' },
  { key: 'ukprop.exp.financialCosts',                    label: 'Financial Costs (UKP)' },
  { key: 'ukprop.exp.professionalFees',                  label: 'Professional Fees (UKP)' },
  { key: 'ukprop.exp.costOfServices',                    label: 'Cost of Services (UKP)' },
  { key: 'ukprop.exp.travelCosts',                       label: 'Travel Costs (UKP)' },
  { key: 'ukprop.exp.residentialFinancialCost',          label: 'Residential Financial Cost' },
  { key: 'ukprop.exp.broughtFwdResidentialFinancialCost', label: 'Brought Forward Residential Financial Cost' },
  { key: 'ukprop.exp.other',                             label: 'Other Expenses (UKP)' },
  // Foreign property income
  { key: 'fprop.income.rentIncome',              label: 'Rent Income (Foreign Property)' },
  { key: 'fprop.income.otherPropertyIncome',     label: 'Other Property Income (Foreign)' },
  { key: 'fprop.income.foreignTaxPaidOrDeducted', label: 'Foreign Tax Paid or Deducted' },
  // Foreign property expenses
  { key: 'fprop.exp.premisesRunningCosts',  label: 'Premises Running Costs (FORP)' },
  { key: 'fprop.exp.repairsAndMaintenance', label: 'Repairs & Maintenance (FORP)' },
  { key: 'fprop.exp.financialCosts',        label: 'Financial Costs (FORP)' },
  { key: 'fprop.exp.professionalFees',      label: 'Professional Fees (FORP)' },
  { key: 'fprop.exp.costOfServices',        label: 'Cost of Services (FORP)' },
  { key: 'fprop.exp.travelCosts',           label: 'Travel Costs (FORP)' },
  { key: 'fprop.exp.other',                 label: 'Other Expenses (FORP)' },
];

/** Request body for the Anthropic Messages API. */
interface AnthropicRequest {
  /** Model identifier. */
  model: string;
  /** Maximum output tokens. */
  max_tokens: number;
  /** Conversation messages. */
  messages: { role: 'user'; content: string }[];
}

/** Response from the Anthropic Messages API. */
interface AnthropicResponse {
  /** Generated content blocks. */
  content: { type: string; text: string }[];
}

/**
 * Calls the Anthropic Claude API to auto-suggest spreadsheet column → MTD
 * field mappings. Uses the haiku model for cost-efficient one-shot mapping.
 */
@Injectable({ providedIn: 'root' })
export class ClaudeApiService {
  private readonly http = inject(HttpClient);

  /**
   * Asks Claude to suggest the best mapping from spreadsheet column headers to
   * MTD field keys given a list of field definitions.
   *
   * @param apiKey - Anthropic API key.
   * @param columnHeaders - Column header names from the spreadsheet.
   * @param fields - MTD field definitions to map against.
   * @returns A record mapping column header names to MTD field keys.
   * @throws When the API call fails or the response cannot be parsed.
   */
  async suggestMappings(
    apiKey: string,
    columnHeaders: string[],
    fields: FieldDefinition[],
  ): Promise<Record<string, string>> {
    const fieldList = fields.map(f => `- "${f.key}": ${f.label}`).join('\n');
    const colList   = columnHeaders.map(c => `"${c}"`).join(', ');

    const prompt = `You are helping map spreadsheet column headers to UK HMRC Making Tax Digital (MTD) income tax fields.

Column headers from the spreadsheet: ${colList}

Available MTD fields (key: label):
${fieldList}

Return a JSON object mapping column header names to MTD field keys. Only include confident matches. If a column does not match any field, omit it. Return ONLY valid JSON, no explanation.

Example response: {"Revenue": "se.income.turnover", "Admin": "se.exp.adminCosts"}`;

    const body: AnthropicRequest = {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    };

    const headers = new HttpHeaders({
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    });

    const resp = await firstValueFrom(
      this.http.post<AnthropicResponse>('https://api.anthropic.com/v1/messages', body, { headers }),
    );

    const text = resp.content.find(c => c.type === 'text')?.text ?? '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return {};
    return JSON.parse(jsonMatch[0]) as Record<string, string>;
  }
}
