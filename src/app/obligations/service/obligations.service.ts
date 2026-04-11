import { Injectable, inject } from '@angular/core';
import { HmrcApiService } from '../../core';

@Injectable({ providedIn: 'root' })
export class ObligationsService {
  private readonly api = inject(HmrcApiService);
}
