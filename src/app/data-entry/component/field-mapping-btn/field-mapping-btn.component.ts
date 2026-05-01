/**
 * @fileoverview Inline chain-link button that lets the user map a spreadsheet
 * column header to a specific MTD figure field. Only rendered when a mappable
 * data-entry method (Excel or AirTable) is active.
 */
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  HostListener,
  input,
  output,
  signal,
} from '@angular/core';

/**
 * Payload emitted when the user saves or clears a mapping.
 */
export interface MappingChangeEvent {
  /** Dotted MTD field path, e.g. `'se.income.turnover'`. */
  fieldKey: string;
  /** Column header name; empty string means "clear this mapping". */
  columnName: string;
}

/**
 * Small button that opens an inline popover for mapping a spreadsheet column
 * to an MTD form field. The chain-link icon turns indigo when mapped.
 */
@Component({
  selector: 'app-field-mapping-btn',
  imports: [],
  templateUrl: './field-mapping-btn.component.html',
  styleUrl: './field-mapping-btn.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FieldMappingBtnComponent {
  /** Dotted MTD field path this button controls (e.g. `'se.income.turnover'`). */
  readonly fieldKey = input.required<string>();

  /** Full fieldMappings record from the active data-entry settings. */
  readonly mappings = input<Record<string, string>>({});

  /** Only renders the button when a mappable method is enabled. */
  readonly active = input<boolean>(false);

  /** Column headers available from the active spreadsheet source for this income type. */
  readonly columnHeaders = input<string[]>([]);

  /** Emitted when the user saves or clears a mapping. */
  readonly mappingChange = output<MappingChangeEvent>();

  /** Column name currently mapped to this field, or empty string. */
  protected readonly currentMapping = computed(() => this.mappings()[this.fieldKey()] ?? '');

  /** `true` when a non-empty mapping exists for this field. */
  protected readonly isMapped = computed(() => !!this.currentMapping());

  /** Whether the popover is currently open. */
  protected readonly open = signal(false);

  /** Draft value being edited in the popover input. */
  protected readonly draft = signal('');

  /** Column headers filtered by the current draft value (case-insensitive). */
  protected readonly filtered = computed(() => {
    const q = this.draft().toLowerCase();
    const cols = this.columnHeaders();
    if (!cols.length) return [];
    return q ? cols.filter(c => c.toLowerCase().includes(q)) : cols;
  });

  /** Toggles the popover open/closed, seeding the draft from the current mapping. */
  protected toggle(): void {
    if (this.open()) {
      this.open.set(false);
    } else {
      this.draft.set(this.currentMapping());
      this.open.set(true);
    }
  }

  /**
   * Selects a column header from the dropdown, populating the draft input.
   * Uses mousedown instead of click so it fires before the input blur event.
   * @param col - The column header to select.
   */
  protected selectHeader(col: string): void {
    this.draft.set(col);
  }

  /**
   * Saves the draft column name and closes the popover.
   * Emits {@link MappingChangeEvent} with the new value.
   */
  protected save(): void {
    this.mappingChange.emit({ fieldKey: this.fieldKey(), columnName: this.draft().trim() });
    this.open.set(false);
  }

  /**
   * Clears the existing mapping and closes the popover.
   * Emits {@link MappingChangeEvent} with an empty column name.
   */
  protected clear(): void {
    this.mappingChange.emit({ fieldKey: this.fieldKey(), columnName: '' });
    this.open.set(false);
  }

  /**
   * Closes the popover when Escape is pressed.
   * @param event - Keyboard event from the host element.
   */
  @HostListener('keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.open.set(false);
    }
  }
}
