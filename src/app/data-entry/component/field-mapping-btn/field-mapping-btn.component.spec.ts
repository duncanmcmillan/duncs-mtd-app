import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { FieldMappingBtnComponent, MappingChangeEvent } from './field-mapping-btn.component';

describe('FieldMappingBtnComponent', () => {
  let component: FieldMappingBtnComponent;
  let fixture: ComponentFixture<FieldMappingBtnComponent>;

  const setup = async (inputs: Partial<{ fieldKey: string; mappings: Record<string, string>; active: boolean }> = {}) => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [FieldMappingBtnComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(FieldMappingBtnComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('fieldKey', inputs.fieldKey ?? 'se.income.turnover');
    if (inputs.mappings !== undefined) fixture.componentRef.setInput('mappings', inputs.mappings);
    if (inputs.active !== undefined) fixture.componentRef.setInput('active', inputs.active);
    fixture.detectChanges();
  };

  afterEach(() => TestBed.resetTestingModule());

  it('creates', async () => {
    await setup();
    expect(component).toBeTruthy();
  });

  it('renders nothing when inactive', async () => {
    await setup({ active: false });
    const btn: HTMLElement | null = fixture.nativeElement.querySelector('.mapping-btn');
    expect(btn).toBeNull();
  });

  it('renders the chain-link button when active', async () => {
    await setup({ active: true });
    const btn: HTMLElement | null = fixture.nativeElement.querySelector('.mapping-btn');
    expect(btn).not.toBeNull();
  });

  it('reflects mapped state when mappings contain the fieldKey', async () => {
    await setup({ active: true, mappings: { 'se.income.turnover': 'Revenue' } });
    const btn: HTMLElement | null = fixture.nativeElement.querySelector('.mapping-btn--mapped');
    expect(btn).not.toBeNull();
  });

  it('does not apply mapped class when fieldKey has no mapping', async () => {
    await setup({ active: true, mappings: {} });
    const btn: HTMLElement | null = fixture.nativeElement.querySelector('.mapping-btn--mapped');
    expect(btn).toBeNull();
  });

  it('opens popover on toggle button click', async () => {
    await setup({ active: true });
    const btn: HTMLElement = fixture.nativeElement.querySelector('.mapping-btn');
    btn.click();
    fixture.detectChanges();
    const popover: HTMLElement | null = fixture.nativeElement.querySelector('.mapping-popover');
    expect(popover).not.toBeNull();
  });

  it('closes popover on Escape keydown', async () => {
    await setup({ active: true });
    const btn: HTMLElement = fixture.nativeElement.querySelector('.mapping-btn');
    btn.click();
    fixture.detectChanges();

    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    fixture.nativeElement.dispatchEvent(event);
    fixture.detectChanges();

    const popover: HTMLElement | null = fixture.nativeElement.querySelector('.mapping-popover');
    expect(popover).toBeNull();
  });

  it('emits mappingChange with column name on save', async () => {
    await setup({ active: true });
    const emitted: MappingChangeEvent[] = [];
    component.mappingChange.subscribe((e: MappingChangeEvent) => emitted.push(e));

    const btn: HTMLElement = fixture.nativeElement.querySelector('.mapping-btn');
    btn.click();
    fixture.detectChanges();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('.popover-input');
    input.value = 'Revenue';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const setBtn: HTMLElement = fixture.nativeElement.querySelector('.popover-btn--set');
    setBtn.click();
    fixture.detectChanges();

    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toEqual({ fieldKey: 'se.income.turnover', columnName: 'Revenue' });
  });

  it('emits mappingChange with empty string on clear', async () => {
    await setup({ active: true, mappings: { 'se.income.turnover': 'Revenue' } });
    const emitted: MappingChangeEvent[] = [];
    component.mappingChange.subscribe((e: MappingChangeEvent) => emitted.push(e));

    const btn: HTMLElement = fixture.nativeElement.querySelector('.mapping-btn');
    btn.click();
    fixture.detectChanges();

    const clearBtn: HTMLElement = fixture.nativeElement.querySelector('.popover-btn--clear');
    clearBtn.click();
    fixture.detectChanges();

    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toEqual({ fieldKey: 'se.income.turnover', columnName: '' });
  });
});
