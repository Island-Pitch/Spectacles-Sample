/**
 * pwa.ts — PWA install prompt management
 * PWA-10: Capture beforeinstallprompt and defer
 * PWA-11: Track outcomes via analytics
 * PWA-12: Dismissal cooldowns (7d banner, 14d interstitial)
 * PWA-13: Namespaced localStorage keys
 * PWA-14: Platform detection
 */

import { APP_CONFIG, storageKey } from "./config";
import { tracker } from "./tracker";

// JS-20: Standard localStorage keys
const KEYS = {
  installed: storageKey("pwa_installed"),
  a2hsDismissed: storageKey("a2hs_dismissed"),
  interstitialDismissed: storageKey("interstitial_dismissed"),
  notifDismissed: storageKey("notif_dismissed"),
  cookieConsent: storageKey("cookie_consent"),
  fcmToken: storageKey("fcm_token"),
} as const;

/** Deferred install prompt (PWA-10) */
let deferredPrompt: BeforeInstallPromptEvent | null = null;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** PWA-10: Capture the beforeinstallprompt event */
export function initPWAInstall(): void {
  if (typeof window === "undefined") return;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    localStorage.setItem(KEYS.installed, String(Date.now()));
    tracker.pwaInstalled(detectPlatform());
  });
}

/** PWA-10: Trigger the deferred install prompt */
export async function showInstallPrompt(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!deferredPrompt) return "unavailable";

  try {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    tracker.a2hsPromptOutcome(outcome);
    deferredPrompt = null;
    return outcome;
  } catch {
    return "unavailable";
  }
}

/** Check if install prompt is available */
export function canShowInstallPrompt(): boolean {
  return deferredPrompt !== null;
}

/** PWA-12: Check if A2HS banner cooldown has expired (JS-19: timestamps, not booleans) */
export function isA2HSCooldownExpired(): boolean {
  const dismissed = localStorage.getItem(KEYS.a2hsDismissed);
  if (!dismissed) return true;
  return Date.now() - Number(dismissed) > APP_CONFIG.A2HS_COOLDOWN_MS;
}

/** PWA-12: Check if interstitial cooldown has expired */
export function isInterstitialCooldownExpired(): boolean {
  const dismissed = localStorage.getItem(KEYS.interstitialDismissed);
  if (!dismissed) return true;
  return Date.now() - Number(dismissed) > APP_CONFIG.INTERSTITIAL_COOLDOWN_MS;
}

/** PWA-12: Record A2HS dismissal with timestamp */
export function dismissA2HS(): void {
  localStorage.setItem(KEYS.a2hsDismissed, String(Date.now()));
}

/** PWA-12: Record interstitial dismissal */
export function dismissInterstitial(): void {
  localStorage.setItem(KEYS.interstitialDismissed, String(Date.now()));
}

/** PWA-14: Detect platform type */
export function detectPlatform(): "ios" | "android" | "desktop" {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "desktop";
}

/** Check if app is already installed (standalone mode) */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true)
  );
}

export { KEYS as PWA_KEYS };
