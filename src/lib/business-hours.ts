import { businessHours } from "@/content/site";

export type OfficeStatus = {
  open: boolean;
  label: "פתוח כעת" | "סגור";
  detail: string;
  nextOpen: string;
};

function fmt(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const DAY_NAMES = [
  "יום ראשון",
  "יום שני",
  "יום שלישי",
  "יום רביעי",
  "יום חמישי",
  "יום שישי",
  "שבת",
];

/** Live OPEN/CLOSED status computed from the configured business hours. */
export function getOfficeStatus(now: Date = new Date()): OfficeStatus {
  const day = now.getDay();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const isOpenDay = businessHours.openDays.includes(day as 1 | 2 | 3 | 4 | 5);
  const open =
    isOpenDay &&
    minutes >= businessHours.openMinutes &&
    minutes < businessHours.closeMinutes;

  if (open) {
    return {
      open: true,
      label: "פתוח כעת",
      detail: `נסגר בשעה ${fmt(businessHours.closeMinutes)}`,
      nextOpen: "אנחנו פתוחים כעת.",
    };
  }

  // Find the next opening day (today if we are before opening time).
  for (let i = 0; i < 8; i++) {
    const d = (day + i) % 7;
    if (!businessHours.openDays.includes(d as 1 | 2 | 3 | 4 | 5)) continue;
    if (i === 0 && minutes >= businessHours.openMinutes) continue;
    const when = i === 0 ? "היום" : i === 1 ? "מחר" : DAY_NAMES[d];
    return {
      open: false,
      label: "סגור",
      detail: `נפתח ${when} בשעה ${fmt(businessHours.openMinutes)}`,
      nextOpen: `הצוות חוזר ${when} בשעה ${fmt(businessHours.openMinutes)}.`,
    };
  }

  return {
    open: false,
    label: "סגור",
    detail: `נפתח בשעה ${fmt(businessHours.openMinutes)}`,
    nextOpen: `הצוות חוזר בשעה ${fmt(businessHours.openMinutes)}.`,
  };
}

/** 30-minute slots between opening and closing time, as "HH:MM" strings. */
export function timeSlots(): string[] {
  const slots: string[] = [];
  for (let m = businessHours.openMinutes; m < businessHours.closeMinutes; m += 30) {
    slots.push(fmt(m));
  }
  return slots;
}

/** True when the given YYYY-MM-DD date is a weekday. */
export function isWeekday(iso: string): boolean {
  const d = new Date(`${iso}T12:00:00`);
  return businessHours.openDays.includes(d.getDay() as 1 | 2 | 3 | 4 | 5);
}

/** Today's date as YYYY-MM-DD in local time. */
export function todayIso(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}
