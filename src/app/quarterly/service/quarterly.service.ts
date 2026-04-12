import { Injectable, inject } from '@angular/core';
import { HmrcApiService } from '../../core';

@Injectable({ providedIn: 'root' })
export class QuarterlyService {
  private readonly api = inject(HmrcApiService);
}
