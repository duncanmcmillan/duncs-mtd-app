import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'obligations', pathMatch: 'full' },
  {
    path: 'obligations',
    loadChildren: () => import('./obligations/obligations.routes').then(m => m.OBLIGATIONS_ROUTES),
  },
  {
    path: 'quarterly',
    loadChildren: () => import('./quarterly/quarterly.routes').then(m => m.QUARTERLY_ROUTES),
  },
  {
    path: 'self-assessment',
    loadChildren: () => import('./self-assessment/self-assessment.routes').then(m => m.SELF_ASSESSMENT_ROUTES),
  },
  {
    path: 'records',
    loadChildren: () => import('./records/records.routes').then(m => m.RECORDS_ROUTES),
  },
  {
    path: 'adjustments',
    loadChildren: () => import('./adjustments/adjustments.routes').then(m => m.ADJUSTMENTS_ROUTES),
  },
  {
    path: 'data-entry',
    loadChildren: () => import('./data-entry/data-entry.routes').then(m => m.DATA_ENTRY_ROUTES),
  },
  {
    path: 'auth',
    loadChildren: () => import('./auth/auth.routes').then(m => m.AUTH_ROUTES),
  },
];
