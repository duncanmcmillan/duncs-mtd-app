import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { QuarterlyStore } from './quarterly.store';

describe('QuarterlyStore', () => {
  let store: InstanceType<typeof QuarterlyStore>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();
    store = TestBed.inject(QuarterlyStore);
  });

  it('creates', () => {
    expect(store).toBeTruthy();
  });

  it('has empty initial state', () => {
    expect(store.isLoading()).toBe(false);
    expect(store.error()).toBeNull();
    expect(store.draftList()).toEqual([]);
    expect(store.activeExpensesDraft()).toBeNull();
  });

  it('hasError() returns false initially', () => {
    expect(store.hasError()).toBe(false);
  });

  it('openExpensesModal() sets activeExpensesModalKey; no matching draft returns null', () => {
    store.openExpensesModal('biz1_2024-04-06');
    expect(store.activeExpensesDraft()).toBeNull();
  });

  it('closeExpensesModal() clears activeExpensesModalKey', () => {
    store.openExpensesModal('biz1_2024-04-06');
    store.closeExpensesModal();
    expect(store.activeExpensesDraft()).toBeNull();
  });

  it('init() is a no-op when not authenticated', async () => {
    await store.init();
    expect(store.isLoading()).toBe(false);
    expect(store.draftList()).toEqual([]);
  });
});
