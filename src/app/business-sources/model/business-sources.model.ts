/**
 * @fileoverview State model for the Business Sources feature.
 */
import { BusinessSourceItem } from '../../core';

/** State managed by {@link BusinessSourcesStore}. */
export interface BusinessSourcesState {
  /** Whether a fetch is in progress. */
  isLoading: boolean;
  /** Error message from the last failed fetch, or `null`. */
  error: string | null;
  /** The list of income sources returned by the HMRC API, or `null` before first fetch. */
  businesses: BusinessSourceItem[] | null;
}
