/**
 * config.ts — JS-05: Feature-flag optional integrations
 * Empty string disables the feature.
 */

export const APP_CONFIG = {
  /** Project-wide localStorage namespace prefix (JS-18) */
  STORAGE_PREFIX: "pw_",

  /** API Gateway base URL */
  API_URL: process.env.NEXT_PUBLIC_API_URL || "/api",

  /** Feature flags — empty string disables (JS-05) */
  FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_SENDER_ID || "",
  GA4_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA4_ID || "",
  HUBSPOT_PORTAL_ID: process.env.NEXT_PUBLIC_HUBSPOT_ID || "",

  /** WebXR toggle */
  ENABLE_WEBXR: process.env.NEXT_PUBLIC_ENABLE_WEBXR !== "false",

  /** Default 3D generation provider */
  DEFAULT_3D_PROVIDER: process.env.NEXT_PUBLIC_DEFAULT_3D_PROVIDER || "meshy",

  /** PWA install banner cooldown in ms (PWA-12) */
  A2HS_COOLDOWN_MS: 7 * 24 * 60 * 60 * 1000, // 7 days
  INTERSTITIAL_COOLDOWN_MS: 14 * 24 * 60 * 60 * 1000, // 14 days
  NOTIF_COOLDOWN_MS: 7 * 24 * 60 * 60 * 1000, // 7 days
} as const;

/** Namespaced localStorage key helper (JS-18) */
export function storageKey(key: string): string {
  return `${APP_CONFIG.STORAGE_PREFIX}${key}`;
}

/** Check if a feature is enabled (non-empty config value) (JS-05) */
export function isFeatureEnabled(configValue: string): boolean {
  return configValue.length > 0;
}
