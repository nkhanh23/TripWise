import type { AppLocale } from "../types";

export function formatCurrency(
  amount: number | string,
  currency = "USD",
  locale: AppLocale = "en",
): string {
  const numericAmount =
    typeof amount === "string"
      ? parseFloat(amount.replace(/[^0-9.-]+/g, ""))
      : amount;
  if (isNaN(numericAmount)) {
    return String(amount);
  }

  const upperCurr = currency.toUpperCase();

  if (upperCurr === "USD") {
    return `$${numericAmount.toLocaleString(locale === "vi" ? "vi-VN" : "en-US")}`;
  }

  if (upperCurr === "VND") {
    return `${numericAmount.toLocaleString("vi-VN")} ₫`;
  }

  try {
    return new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US", {
      style: "currency",
      currency: upperCurr,
    }).format(numericAmount);
  } catch {
    return `${numericAmount} ${upperCurr}`;
  }
}
