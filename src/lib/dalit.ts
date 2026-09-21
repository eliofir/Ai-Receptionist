import { businessHours, staff, secretariat } from "@/content/site";
import { matchKb, type KbEntry } from "./assistant";

export type CallState =
  | "idle"
  | "ringing"
  | "greeting"
  | "listening"
  | "routing"
  | "transferring"
  | "connected"
  | "ended";

export type StaffDesk = {
  department: string;
  name: string;
  role: string;
  direct: string;
  mobile: string;
  email: string;
};

/** The desks a call can be transferred to — the real Ophir team. */
export const staffDirectory: StaffDesk[] = [
  ...staff.map((s) => ({
    department: s.department ?? "כללי",
    name: s.name,
    role: s.role,
    direct: s.direct ?? "",
    mobile: s.mobile ?? "",
    email: s.email,
  })),
  {
    department: "המזכירות",
    name: secretariat.name,
    role: secretariat.role,
    direct: "",
    mobile: "",
    email: secretariat.email,
  },
];

/** The best spoken contact line for a desk. */
export function deskContact(desk: StaffDesk): string {
  if (desk.direct) return `הישיר ${desk.direct}`;
  if (desk.mobile) return `הנייד ${desk.mobile}`;
  return desk.email;
}

export type Intent = "transfer" | "quote" | "appointment" | "faq" | "unknown";

function hasAny(text: string, words: string[]): boolean {
  const t = text.toLowerCase();
  return words.some((w) => t.includes(w));
}

const TRANSFER_EN = /\b(speak|talk|agent|person|human|representative|real person|desk|transfer|someone|colleague|manager|operator)\b/i;
const QUOTE_EN = /\b(quote|price|prices|cost|costs|how much|premium|premiums|insurance for|cover for|insure)\b/i;
const APPOINTMENT_EN = /\b(appointment|appointments|book|booking|meeting|come in|schedule|visit)\b/i;

const HE_TRANSFER = ["נציג", "נציגה", "לדבר עם", "להעביר", "מוקד", "בן אדם", "אדם אמיתי", "מנהל"];
const HE_QUOTE = ["הצעת מחיר", "מחיר", "עלות", "פרמיה", "כמה עולה", "ביטוח ל"];
const HE_APPOINTMENT = ["פגישה", "פגישות", "לקבוע", "תור", "להיפגש", "לבקר"];

export function detectIntent(text: string): Intent {
  if (TRANSFER_EN.test(text) || hasAny(text, HE_TRANSFER)) return "transfer";
  if (QUOTE_EN.test(text) || hasAny(text, HE_QUOTE)) return "quote";
  if (APPOINTMENT_EN.test(text) || hasAny(text, HE_APPOINTMENT)) return "appointment";
  return "faq";
}

/** Choose the desk that best matches what the caller said. */
export function pickDesk(text: string): StaffDesk {
  const t = text.toLowerCase();
  if (hasAny(t, ["רכב", "רכב חובה", "auto", "car", "vehicle"])) {
    return staffDirectory.find((d) => d.department === "רכב") ?? staffDirectory[0];
  }
  if (hasAny(t, ["דירה", "בית", "home", "property"])) {
    return staffDirectory.find((d) => d.department === "דירה") ?? staffDirectory[0];
  }
  if (hasAny(t, ["מכירות", "הצעת מחיר", "מחיר", "quote", "sales", "price"])) {
    return staffDirectory.find((d) => d.department === "מכירות") ?? staffDirectory[0];
  }
  if (hasAny(t, ["תפעול", "תביעה", "תביעות", "שירות", "claim", "service", "operations"])) {
    return staffDirectory.find((d) => d.department === "תפעול") ?? staffDirectory[0];
  }
  return staffDirectory.find((d) => d.department === "המזכירות") ?? staffDirectory[0];
}

/** A conversational answer from the site's own knowledge base, or null. */
export function faqAnswer(text: string, kb: KbEntry[]): string | null {
  const entry = matchKb(text, kb);
  return entry ? entry.answer : null;
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
const MONTHS = [
  "בינואר", "בפברואר", "במרץ", "באפריל", "במאי", "ביוני",
  "ביולי", "באוגוסט", "בספטמבר", "באוקטובר", "בנובמבר", "בדצמבר",
];
const SLOT_TIMES = ["09:00", "11:30", "14:00"];

export type Slot = { label: string; date: string; time: string };

function iso(d: Date): string {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}

/** The next few weekday slots inside business hours. */
export function nextSlots(count = 3): Slot[] {
  const slots: Slot[] = [];
  const d = new Date();
  d.setDate(d.getDate() + 1);
  let guard = 0;
  while (slots.length < count && guard < 30) {
    guard += 1;
    if (businessHours.openDays.includes(d.getDay() as 1 | 2 | 3 | 4 | 5)) {
      for (const time of SLOT_TIMES) {
        if (slots.length >= count) break;
        slots.push({
          label: `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} בשעה ${time}`,
          date: iso(d),
          time,
        });
      }
    }
    d.setDate(d.getDate() + 1);
  }
  return slots;
}

/** Match the caller's spoken choice against the offered slots. */
export function parseSlotChoice(text: string, slots: Slot[]): Slot {
  const t = text.toLowerCase();
  const byDay = slots.find((s) => {
    const day = s.label.split(" ").slice(0, 2).join(" ");
    return t.includes(day);
  });
  if (byDay) return byDay;
  const byTime = slots.find((s) => t.includes(s.time.replace(":", "")) || t.includes(s.time));
  if (byTime) return byTime;
  if (hasAny(t, ["הראשון", "הראשונה", "מוקדם", "בוקר"])) return slots[0];
  if (hasAny(t, ["השני", "השנייה", "אמצע"]) && slots[1]) return slots[1];
  if (hasAny(t, ["השלישי", "השלישית", "אחרון", "אחרונה", "צהריים"]) && slots[2]) return slots[2];
  return slots[0];
}

/** A spoken-friendly list of the offered slots. */
export function describeSlots(slots: Slot[]): string {
  const parts = slots.map((s) => s.label);
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(", ")} או ${parts[parts.length - 1]}`;
}

/** A short reference for a voice-test record. */
export function voiceRef(prefix: string): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}-${s}`;
}
