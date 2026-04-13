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

/** Whether an HMRC obligation has been fulfilled or remains open (v3 lowercase). */
export type ObligationStatus = 'open' | 'fulfilled';

/**
 * A single HMRC reporting obligation period as returned by the
 * Obligations API v3 income-and-expenditure endpoint.
 */
export interface Obligation {
  /** ISO date for the start of the obligation period. */
  periodStartDate: string;
  /** ISO date for the end of the obligation period. */
  periodEndDate: string;
  /** ISO date by which the obligation must be fulfilled. */
  dueDate: string;
  /** Whether this obligation is open or has been fulfilled. */
  status: ObligationStatus;
  /** ISO date when HMRC received the submission (fulfilled obligations only). */
  receivedDate?: string;
}

/**
 * Response from `GET /obligations/details/{nino}/income-and-expenditure` (API v3).
 */
export interface ObligationsResponse {
  obligations: Array<{
    /** The type of income source for this set of obligations. */
    typeOfBusiness?: string;
    /** HMRC income source identifier. */
    businessId?: string;
    /** The obligation periods for this source. */
    obligationDetails: Obligation[];
  }>;
}

/**
 * A single business income source as returned by the Business Details API v2.
 */
export interface BusinessSourceItem {
  /** HMRC-assigned income source identifier. */
  businessId: string;
  /** The type of income source. */
  typeOfBusiness: 'self-employment' | 'uk-property' | 'foreign-property' | 'property-unspecified';
  /** Trading name (self-employment sources only). */
  tradingName?: string;
}

/**
 * Response from `GET /individuals/business/details/{nino}/list` (API v2).
 */
export interface BusinessSourcesResponse {
  /** All income sources registered for this taxpayer. */
  listOfBusinesses: BusinessSourceItem[];
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
