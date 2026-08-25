import type { AppLocale } from "../types";

export function formatNumber(num: number, locale: AppLocale = "en"): string {
  try {
    return new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US").format(
      num,
    );
  } catch {
    return num.toLocaleString();
  }
}

export function formatDistance(
  meters: number,
  locale: AppLocale = "en",
): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  const km = (meters / 1000).toFixed(1);
  return `${km} km`;
}
