import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AccessibilityService } from './accessibility.service';

describe('AccessibilityService', () => {
  let service: AccessibilityService;

  beforeEach(() => {
    // jsdom does not implement matchMedia — provide a minimal stub
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    // Ensure no Electron bridge is present
    Object.defineProperty(window, 'accessibility', {
      writable: true,
      configurable: true,
      value: undefined,
    });

    TestBed.configureTestingModule({});
    service = TestBed.inject(AccessibilityService);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialise all preference signals to false when no OS settings are active', () => {
    expect(service.prefersReducedMotion()).toBe(false);
    expect(service.prefersHighContrast()).toBe(false);
    expect(service.forcedColors()).toBe(false);
    expect(service.prefersDarkMode()).toBe(false);
    expect(service.screenReaderActive()).toBe(false);
  });

  it('should expose an aggregate preferences computed signal matching individual signals', () => {
    const prefs = service.preferences();
    expect(prefs).toEqual({
      prefersReducedMotion: false,
      prefersHighContrast: false,
      forcedColors: false,
      prefersDarkMode: false,
      screenReaderActive: false,
    });
  });

  it('should not throw when window.accessibility is absent (non-Electron context)', () => {
    expect(() => service).not.toThrow();
  });
});
