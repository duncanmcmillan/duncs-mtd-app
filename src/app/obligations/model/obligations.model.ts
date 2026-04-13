/**
 * @fileoverview State and domain models for the Obligations feature.
 */
import { ObligationsResponse, ObligationStatus } from '../../core';

/**
 * A flattened, display-ready obligation row combining business-source context
 * with a single obligation period from {@link ObligationsResponse}.
 */
export interface ObligationRow {
  /** The income source type (e.g. `'self-employment'`). */
  typeOfBusiness: string;
  /** HMRC income source identifier. */
  businessId?: string;
  /** ISO date for the start of the obligation period. */
  periodStartDate: string;
  /** ISO date for the end of the obligation period. */
  periodEndDate: string;
  /** ISO date by which the obligation must be fulfilled. */
  dueDate: string;
  /** Whether this obligation is open or fulfilled. */
  status: ObligationStatus;
  /** ISO date when HMRC received the submission (fulfilled only). */
  receivedDate?: string;
}

/**
 * State slice managed by {@link ObligationsStore}.
 */
export interface ObligationsState {
  /** Whether an obligations fetch is in progress. */
  isLoading: boolean;
  /** Error message from the last failed fetch; `null` when no error. */
  error: string | null;
  /** Raw response from the HMRC Obligations API; `null` until first fetch. */
  rawResponse: ObligationsResponse | null;
}
