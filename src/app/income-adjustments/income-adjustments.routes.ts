/**
 * @fileoverview Lazy-loaded routes for the Income & Adjustments feature.
 */
import { Routes } from '@angular/router';
import { IncomeAdjustmentsComponent } from './component/income-adjustments.component';

/** Routes for the Income & Adjustments tab. */
export const INCOME_ADJUSTMENTS_ROUTES: Routes = [
  { path: '', component: IncomeAdjustmentsComponent },
];
