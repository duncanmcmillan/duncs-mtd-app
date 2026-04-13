/**
 * @fileoverview Service that builds HMRC fraud prevention request headers
 * as required by the HMRC MTD API for DESKTOP_APP_DIRECT connection method.
 * @see https://developer.service.hmrc.gov.uk/guides/fraud-prevention/
 */
import { Injectable } from '@angular/core';

/** Shape of the device info returned by the Electron IPC bridge. */
interface DeviceInfo {
  /** Persistent UUID uniquely identifying this installation. */
  deviceId: string;
  /** Non-loopback IPv4 addresses on the device. */
  ips: string[];
  /** Lowercase MAC addresses of non-loopback network interfaces. */
  macs: string[];
  /** OS username of the logged-in user. */
  userId: string;
  /** Human-readable OS family name (e.g. `'Mac OS X'`, `'Windows'`). */
  osFamily: string;
  /** OS release version string. */
  osVersion: string;
}

/** Shape of the IPC bridge exposed by `preload.js`. */
type FraudPreventionBridge = {
  getDeviceInfo: () => Promise<DeviceInfo>;
};

const bridge =
  (window as unknown as { fraudPrevention?: FraudPreventionBridge }).fraudPrevention ?? null;

/**
 * Builds the HMRC fraud prevention headers required for all MTD API calls.
 * OS-level information (network interfaces, device ID, user identity) is
 * collected from the Electron main process via IPC; screen and window
 * dimensions are read from browser APIs.
 */
@Injectable({ providedIn: 'root' })
export class FraudPreventionService {
  /** `true` when running inside Electron and the IPC bridge is available. */
  readonly isElectron = !!bridge;

  /** Cached device info; fetched once per session on first request. */
  private deviceInfoCache: DeviceInfo | null = null;

  /**
   * Returns a record of HMRC fraud prevention headers for the current request.
   * Falls back to a minimal set of headers when running outside Electron.
   * @returns A `Record<string, string>` ready to merge into `HttpHeaders`.
   */
  async getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Gov-Client-Connection-Method': 'DESKTOP_APP_DIRECT',
      'Gov-Vendor-Product-Name':      'duncs-mtd-app',
      'Gov-Vendor-Version':           `duncs-mtd-app=0.0.0`,
      'Gov-Client-Timezone':          this.formatTimezone(),
      'Gov-Client-Screens':           this.formatScreens(),
      'Gov-Client-Window-Size':       `width=${window.innerWidth}&height=${window.innerHeight}`,
    };

    if (!bridge) return headers;

    const info = await this.getDeviceInfo();
    return {
      ...headers,
      'Gov-Client-Device-Id':    info.deviceId,
      'Gov-Client-User-Ids':     `os=${encodeURIComponent(info.userId)}`,
      'Gov-Client-Local-Ips':    info.ips.join(','),
      'Gov-Client-MAC-Addresses': info.macs.map(m => m.split(':').join('%3A')).join(','),
      'Gov-Client-User-Agent':   [
        `os-family=${encodeURIComponent(info.osFamily)}`,
        `os-version=${encodeURIComponent(info.osVersion)}`,
      ].join('&'),
    };
  }

  /** Fetches device info from main process, using a per-session cache. */
  private async getDeviceInfo(): Promise<DeviceInfo> {
    if (!this.deviceInfoCache) {
      this.deviceInfoCache = await bridge!.getDeviceInfo();
    }
    return this.deviceInfoCache;
  }

  /** Formats the local UTC offset as `UTC±HH:MM`. */
  private formatTimezone(): string {
    const offset = -new Date().getTimezoneOffset();
    const sign = offset >= 0 ? '+' : '-';
    const abs  = Math.abs(offset);
    const hh   = String(Math.floor(abs / 60)).padStart(2, '0');
    const mm   = String(abs % 60).padStart(2, '0');
    return `UTC${sign}${hh}:${mm}`;
  }

  /** Formats primary screen dimensions as HMRC-required query string. */
  private formatScreens(): string {
    const s = window.screen;
    return new URLSearchParams({
      width:            String(s.width),
      height:           String(s.height),
      'scaling-factor': String(window.devicePixelRatio ?? 1),
      'colour-depth':   String(s.colorDepth),
    }).toString();
  }
}
