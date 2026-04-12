import { Injectable, inject } from '@angular/core';
import { HmrcApiService } from '../../core';

@Injectable({ providedIn: 'root' })
export class DataEntryService {
  private readonly api = inject(HmrcApiService);
}
