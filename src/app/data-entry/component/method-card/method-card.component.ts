/**
 * @fileoverview Reusable method card component for the Data Entry & Notifications feature.
 * Displays an icon, label, optional settings cog, and enable/disable checkbox.
 */
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  TemplateRef,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

/**
 * Card component representing a single data-entry method or notification channel.
 * Shows an icon template, label, optional settings button, and an enable toggle.
 */
@Component({
  selector: 'app-method-card',
  standalone: true,
  imports: [NgTemplateOutlet, MatButtonModule],
  templateUrl: './method-card.component.html',
  styleUrl: './method-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MethodCardComponent {
  /** Display label for the method. */
  readonly label = input.required<string>();

  /** Optional TemplateRef for a brand icon to render before the label. */
  readonly iconTemplate = input<TemplateRef<unknown> | null>(null);

  /** Whether this method is currently enabled. */
  readonly enabled = input<boolean>(false);

  /** Whether to show the settings cog button. */
  readonly hasSettings = input<boolean>(true);

  /** Emitted when the enable checkbox is toggled. */
  readonly enabledChange = output<boolean>();

  /** Emitted when the settings cog is clicked. */
  readonly settingsClick = output<void>();

  /** @param checked New checked state from the mat-checkbox change event. */
  onToggle(checked: boolean): void {
    this.enabledChange.emit(checked);
  }

  /** Emits settingsClick when the cog button is activated. */
  onSettingsClick(): void {
    this.settingsClick.emit();
  }
}
