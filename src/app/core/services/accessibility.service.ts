/**
 * @fileoverview Service for detecting and responding to OS-level accessibility preferences.
 * Provides reactive signals for CSS preference media queries and, when running under Electron,
 * native assistive technology detection via the accessibility IPC bridge.
 * Targets EN 301 549 Clause 11 (WCAG 2.1 AA for software) interpreted via WCAG2ICT.
 */
import { Injectable, OnDestroy, signal, computed, WritableSignal } from '@angular/core';

/** OS and platform accessibility preferences as detected at runtime. */
export interface A11yPreferences {
  /** True when the OS has prefers-reduced-motion: reduce set. */
  readonly prefersReducedMotion: boolean;
  /** True when the OS has prefers-contrast: more set. */
  readonly prefersHighContrast: boolean;
  /** True when Windows Forced Colors (High Contrast) mode is active. */
  readonly forcedColors: boolean;
  /** True when the OS prefers a dark colour scheme. */
  readonly prefersDarkMode: boolean;
  /** True when a platform assistive technology (e.g. screen reader) is active. Electron only. */
  readonly screenReaderActive: boolean;
}

/** Electron accessibility bridge exposed via preload.js contextBridge as window.accessibility. */
interface ElectronA11yBridge {
  /** Query current accessibility preferences from the Electron main process. */
  getPreferences(): Promise<{ accessibilitySupport: boolean; highContrast: boolean; invertedColors: boolean }>;
  /** Register a callback invoked when native preferences change. */
  onPreferencesChanged(
    callback: (prefs: { accessibilitySupport: boolean; highContrast: boolean; invertedColors: boolean }) => void
  ): void;
  /** Remove all onPreferencesChanged listeners. */
  removePreferencesChangedListener(): void;
}

declare global {
  interface Window {
    /** Present only in Electron renderer — exposes platform AT preference data. */
    accessibility?: ElectronA11yBridge;
  }
}

/**
 * Detects OS-level accessibility preferences and exposes them as read-only Angular signals.
 * Media query signals (reduced motion, high contrast, forced colours, dark mode) update
 * reactively as the user changes their OS settings. The `screenReaderActive` signal is
 * populated from the Electron main process when running as a desktop app.
 */
@Injectable({ providedIn: 'root' })
export class AccessibilityService implements OnDestroy {
  private readonly _prefersReducedMotion = signal(this.readMedia('(prefers-reduced-motion: reduce)'));
  private readonly _prefersHighContrast  = signal(this.readMedia('(prefers-contrast: more)'));
  private readonly _forcedColors         = signal(this.readMedia('(forced-colors: active)'));
  private readonly _prefersDarkMode      = signal(this.readMedia('(prefers-color-scheme: dark)'));
  private readonly _screenReaderActive   = signal(false);

  /** Whether the user has requested reduced motion via OS settings. */
  readonly prefersReducedMotion = this._prefersReducedMotion.asReadonly();
  /** Whether the user has requested higher contrast via OS settings. */
  readonly prefersHighContrast  = this._prefersHighContrast.asReadonly();
  /** Whether Windows Forced Colors (High Contrast) mode is active. */
  readonly forcedColors         = this._forcedColors.asReadonly();
  /** Whether the user prefers a dark colour scheme. */
  readonly prefersDarkMode      = this._prefersDarkMode.asReadonly();
  /** Whether a platform assistive technology is active (Electron only; false in browser). */
  readonly screenReaderActive   = this._screenReaderActive.asReadonly();

  /** Aggregate snapshot of all current accessibility preferences. */
  readonly preferences = computed<A11yPreferences>(() => ({
    prefersReducedMotion: this._prefersReducedMotion(),
    prefersHighContrast:  this._prefersHighContrast(),
    forcedColors:         this._forcedColors(),
    prefersDarkMode:      this._prefersDarkMode(),
    screenReaderActive:   this._screenReaderActive(),
  }));

  private readonly mqListeners: { mql: MediaQueryList; fn: (e: MediaQueryListEvent) => void }[] = [];

  constructor() {
    this.watch('(prefers-reduced-motion: reduce)', this._prefersReducedMotion);
    this.watch('(prefers-contrast: more)',          this._prefersHighContrast);
    this.watch('(forced-colors: active)',           this._forcedColors);
    this.watch('(prefers-color-scheme: dark)',      this._prefersDarkMode);
    void this.initElectronBridge();
  }

  ngOnDestroy(): void {
    this.mqListeners.forEach(({ mql, fn }) => mql.removeEventListener('change', fn));
    window.accessibility?.removePreferencesChangedListener();
  }

  /**
   * Reads the current match state of a CSS media query string.
   * @param query CSS media query (e.g. `'(prefers-reduced-motion: reduce)'`).
   * @returns True if the query currently matches, false otherwise or in non-browser contexts.
   */
  private readMedia(query: string): boolean {
    return typeof window !== 'undefined' ? window.matchMedia(query).matches : false;
  }

  /**
   * Subscribes to a CSS media query, updating the target signal whenever the match changes.
   * @param query The media query string to watch.
   * @param target The writable signal to update on change.
   */
  private watch(query: string, target: WritableSignal<boolean>): void {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(query);
    const fn = (e: MediaQueryListEvent) => target.set(e.matches);
    mql.addEventListener('change', fn);
    this.mqListeners.push({ mql, fn });
  }

  /**
   * Queries the Electron main process for native AT preferences and listens for changes.
   * No-op when running outside Electron (window.accessibility is undefined).
   */
  private async initElectronBridge(): Promise<void> {
    if (!window.accessibility) return;
    try {
      const prefs = await window.accessibility.getPreferences();
      this._screenReaderActive.set(prefs.accessibilitySupport);
      window.accessibility.onPreferencesChanged(updated => {
        this._screenReaderActive.set(updated.accessibilitySupport);
      });
    } catch {
      // Bridge unavailable — platform AT detection not supported in this context
    }
  }
}
