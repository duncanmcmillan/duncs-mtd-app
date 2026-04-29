import { vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MethodCardComponent } from './method-card.component';

describe('MethodCardComponent', () => {
  let component: MethodCardComponent;
  let fixture: ComponentFixture<MethodCardComponent>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [MethodCardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MethodCardComponent);
    component = fixture.componentInstance;

    // Set required inputs
    fixture.componentRef.setInput('label', 'Test Method');
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('renders the label', () => {
    const label: HTMLElement = fixture.nativeElement.querySelector('.method-card__label');
    expect(label.textContent?.trim()).toBe('Test Method');
  });

  it('shows settings button by default', () => {
    const btn: HTMLElement | null = fixture.nativeElement.querySelector('.method-card__settings-btn');
    expect(btn).not.toBeNull();
  });

  it('hides settings button when hasSettings is false', () => {
    fixture.componentRef.setInput('hasSettings', false);
    fixture.detectChanges();
    const btn: HTMLElement | null = fixture.nativeElement.querySelector('.method-card__settings-btn');
    expect(btn).toBeNull();
  });

  it('calls onSettingsClick when cog button is clicked', () => {
    const spy = vi.spyOn(component as unknown as { onSettingsClick: () => void }, 'onSettingsClick');
    const btn: HTMLElement = fixture.nativeElement.querySelector('.method-card__settings-btn');
    btn.click();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('emits enabledChange when checkbox is toggled', () => {
    const emitted: boolean[] = [];
    component.enabledChange.subscribe((v) => emitted.push(v));
    const checkbox: HTMLInputElement = fixture.nativeElement.querySelector('.method-card__checkbox');
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
    expect(emitted.length).toBe(1);
    expect(emitted[0]).toBe(true);
  });

  it('checkbox reflects enabled input', () => {
    fixture.componentRef.setInput('enabled', true);
    fixture.detectChanges();
    const checkbox: HTMLInputElement = fixture.nativeElement.querySelector('.method-card__checkbox');
    expect(checkbox.checked).toBe(true);
  });
});
