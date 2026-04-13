import { Routes } from '@angular/router';

export const BUSINESS_SOURCES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./component/business-sources.component').then(m => m.BusinessSourcesComponent),
  },
];
