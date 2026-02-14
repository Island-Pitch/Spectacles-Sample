/**
 * tracker.ts — ANA-06: Centralized analytics module
 * Dual-tracks to GA4 and HubSpot (ANA-07)
 * ANA-01: GA4 consent mode starts denied
 */

import { APP_CONFIG, isFeatureEnabled } from "./config";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    _hsq?: unknown[][];
  }
}

/** ANA-01: Initialize GA4 with consent denied by default */
export function initAnalytics(): void {
  if (typeof window === "undefined") return;

  if (isFeatureEnabled(APP_CONFIG.GA4_MEASUREMENT_ID)) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer!.push(arguments);
    };

    // ANA-01: Default consent denied
    window.gtag("consent", "default", {
      analytics_storage: "denied",
      ad_storage: "denied",
    });

    // ANA-05: Cookie flags
    window.gtag("set", {
      cookie_flags: "max-age=7200;secure;samesite=none",
    });
  }
}

/** ANA-04: Update consent after user choice */
export function updateConsent(level: "full" | "essential"): void {
  if (typeof window === "undefined" || !window.gtag) return;

  if (level === "full") {
    window.gtag("consent", "update", {
      analytics_storage: "granted",
      ad_storage: "granted",
    });
  }
}

/** ANA-08: Standard event tracking */
export function trackEvent(
  eventName: string,
  params: Record<string, unknown> = {}
): void {
  // GA4
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", eventName, params);
  }

  // HubSpot
  if (
    typeof window !== "undefined" &&
    isFeatureEnabled(APP_CONFIG.HUBSPOT_PORTAL_ID) &&
    window._hsq
  ) {
    window._hsq.push(["trackCustomBehavioralEvent", { name: eventName, properties: params }]);
  }
}

/** Convenience methods for standard events */
export const tracker = {
  buttonClick: (label: string) =>
    trackEvent("button_click", { event_label: label }),

  modalOpen: (name: string) =>
    trackEvent("modal_open", { modal_name: name }),

  sharePlatformSelect: (platform: string, contentType: string) =>
    trackEvent("share_platform_select", { platform, content_type: contentType }),

  pwaInstalled: (platform: string) =>
    trackEvent("pwa_installed", { platform }),

  a2hsPromptOutcome: (outcome: string) =>
    trackEvent("a2hs_prompt_outcome", { outcome }),

  swUpdateApplied: () =>
    trackEvent("sw_update_applied"),
};
