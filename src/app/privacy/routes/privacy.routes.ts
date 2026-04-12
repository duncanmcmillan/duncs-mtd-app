/**
 * @fileoverview Lazy-loaded routes for the privacy feature.
 */
import { Routes } from '@angular/router';

/** Routes exported for lazy loading under the `/privacy` path prefix. */
export const PRIVACY_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../component/privacy-settings/privacy-settings.component').then(
        m => m.PrivacySettingsComponent
      ),
  },
];
