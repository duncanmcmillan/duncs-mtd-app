/**
 * @fileoverview Shared domain models for the HMRC Making Tax Digital (MTD)
 * Income Tax Self Assessment (ITSA) API.
 */

/** A tax year string in HMRC format, e.g. `'2025-26'`. */
export type TaxYear = string;

/** A UK National Insurance number, e.g. `'AB123456C'`. */
export type Nino = string;

/** The type of income source registered with HMRC. */
export type BusinessType = 'self-employment' | 'uk-property';

/** Distinguishes between Furnished Holiday Lettings and all other UK property. */
export type PropertyType = 'fhl' | 'non-fhl';

/**
 * A business income source registered with HMRC for MTD ITSA.
 * Each source must submit quarterly updates and an End of Period Statement.
 */
export interface BusinessSource {
  /** HMRC-assigned income source ID. */
  id: string;
  /** Whether the source is self-employment or UK property. */
  type: BusinessType;
  /** Trading name for self-employment sources. */
  tradingName?: string;
  /** FHL vs non-FHL distinction for property sources. */
  propertyType?: PropertyType;
  /** ISO date when the business commenced, e.g. `'2024-04-06'`. */
  commencementDate?: string;
}

/**
 * A reporting period for quarterly submissions.
 */
export interface TaxPeriod {
  /** HMRC period identifier. */
  periodId: string;
  /** ISO date for the start of the period. */
  start: string;
  /** ISO date for the end of the period. */
  end: string;
}

/** Whether an HMRC obligation has been fulfilled or remains open. */
export type ObligationStatus = 'Open' | 'Fulfilled';

/**
 * A single HMRC reporting obligation (quarterly update, EOPS, or Final Declaration).
 */
export interface Obligation {
  /** HMRC period key identifying this obligation. */
  periodKey: string;
  /** ISO date for the start of the obligation period. */
  start: string;
  /** ISO date for the end of the obligation period. */
  end: string;
  /** ISO date by which the obligation must be fulfilled. */
  due: string;
  /** Whether this obligation is open or has been fulfilled. */
  status: ObligationStatus;
  /** ISO date when HMRC received the submission (fulfilled obligations only). */
  receivedDate?: string;
}

/**
 * Response envelope from the HMRC Obligations API.
 */
export interface ObligationsResponse {
  obligations: Array<{
    /** Identifies the income source type and reference number. */
    identification?: { incomeSourceType: string; referenceNumber: string };
    /** The list of obligation periods for this source. */
    obligationDetails: Obligation[];
  }>;
}

/** Which HMRC API environment to target. */
export type ApiEnvironment = 'sandbox' | 'live';

/**
 * OAuth 2.0 tokens returned by HMRC and stored securely on-device.
 */
export interface HmrcTokens {
  /** Bearer token used to authenticate API requests. */
  accessToken: string;
  /** Token used to obtain a new access token when it expires. */
  refreshToken: string;
  /** Unix timestamp (ms) when the access token expires. */
  expiresAt: number;
}
