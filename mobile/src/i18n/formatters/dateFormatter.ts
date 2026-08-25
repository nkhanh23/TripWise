import type { AppLocale } from "../types";

const MONTH_NAMES_EN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const MONTH_NAMES_VI = [
  "Th01",
  "Th02",
  "Th03",
  "Th04",
  "Th05",
  "Th06",
  "Th07",
  "Th08",
  "Th09",
  "Th10",
  "Th11",
  "Th12",
];

export function formatDate(
  dateInput: string | Date,
  locale: AppLocale = "en",
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) {
    return String(dateInput);
  }

  if (options) {
    try {
      return new Intl.DateTimeFormat(
        locale === "vi" ? "vi-VN" : "en-US",
        options,
      ).format(d);
    } catch {
      // Fallback below
    }
  }

  const month =
    locale === "vi"
      ? MONTH_NAMES_VI[d.getMonth()]
      : MONTH_NAMES_EN[d.getMonth()];
  const day = String(d.getDate()).padStart(2, "0");
  const year = d.getFullYear();

  if (locale === "vi") {
    return `${day} ${month}, ${year}`;
  }
  return `${month} ${day}, ${year}`;
}

export function formatDateRange(
  startDateInput: string | Date,
  endDateInput: string | Date,
  locale: AppLocale = "en",
): string {
  const s =
    typeof startDateInput === "string"
      ? new Date(startDateInput)
      : startDateInput;
  const e =
    typeof endDateInput === "string" ? new Date(endDateInput) : endDateInput;

  if (isNaN(s.getTime()) || isNaN(e.getTime())) {
    return `${startDateInput} - ${endDateInput}`;
  }

  const sMonth =
    locale === "vi"
      ? MONTH_NAMES_VI[s.getMonth()]
      : MONTH_NAMES_EN[s.getMonth()];
  const eMonth =
    locale === "vi"
      ? MONTH_NAMES_VI[e.getMonth()]
      : MONTH_NAMES_EN[e.getMonth()];
  const sDay = String(s.getDate()).padStart(2, "0");
  const eDay = String(e.getDate()).padStart(2, "0");

  if (locale === "vi") {
    if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
      return `${sDay} - ${eDay} ${sMonth}`;
    }
    return `${sDay} ${sMonth} - ${eDay} ${eMonth}`;
  }

  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${sMonth} ${sDay} - ${eDay}`;
  }
  return `${sMonth} ${sDay} - ${eMonth} ${eDay}`;
}
