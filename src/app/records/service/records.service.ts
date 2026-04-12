import { Injectable, inject } from '@angular/core';
import { HmrcApiService } from '../../core';

@Injectable({ providedIn: 'root' })
export class RecordsService {
  private readonly api = inject(HmrcApiService);
}
