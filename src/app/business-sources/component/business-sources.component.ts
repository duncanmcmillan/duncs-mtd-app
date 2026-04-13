/**
 * @fileoverview Business Sources tab component. Lists HMRC-registered income
 * sources for the authenticated user.
 */
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { BusinessSourcesStore } from '../store/business-sources.store';

/**
 * Displays all business income sources registered with HMRC for the current
 * user. Fetches from the Business Details API v2 on init.
 */
@Component({
  selector: 'app-business-sources',
  imports: [],
  templateUrl: './business-sources.component.html',
  styleUrl: './business-sources.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BusinessSourcesComponent implements OnInit {
  protected readonly store = inject(BusinessSourcesStore);

  /** @inheritdoc */
  ngOnInit(): void {
    void this.store.loadBusinessSources();
  }
}
