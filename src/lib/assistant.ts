import type { OfficeStatus } from "./business-hours";

export type KbEntry = {
  slug: string;
  topic: string;
  question: string;
  answer: string;
  keywords: string[];
};

export type AssistantAction = { label: string; to?: string; href?: string };
export type AssistantReply = { text: string; actions: AssistantAction[] };

export type AssistantContext = {
  status: OfficeStatus;
  phone: string;
  email: string;
};

const STOP = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "is", "are",
  "do", "does", "i", "my", "me", "you", "your", "we", "it", "can", "how",
  "what", "when", "where", "with", "about", "if", "be", "have", "has", "at",
  "as", "by", "from", "this", "that", "there", "will", "would", "should",
  "של", "את", "על", "עם", "זה", "זו", "הוא", "היא", "אני", "אתה", "אתם",
  "יש", "אין", "מה", "איך", "כמה", "מתי", "איפה", "אם", "כי", "גם", "או",
]);

export function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w));
}

/** Best knowledge-base match for a message, or null when nothing scores high enough. */
export function matchKb(message: string, kb: KbEntry[]): KbEntry | null {
  const tokens = tokenize(message);
  if (tokens.length === 0) return null;
  const lower = ` ${message.toLowerCase()} `;

  let best: KbEntry | null = null;
  let bestScore = 0;

  for (const entry of kb) {
    let score = 0;
    for (const kw of entry.keywords ?? []) {
      const k = kw.toLowerCase();
      if (lower.includes(` ${k} `) || lower.includes(`${k}s `) || lower.includes(` ${k}`)) {
        score += 2;
      }
      // Hebrew words take prefixes (ה/ו/ב/ל/מ/ש), so also match the keyword as a
      // plain substring — "כתובת" should match "הכתובת".
      if (/[\u0590-\u05FF]/.test(k) && lower.includes(k)) {
        score += 1;
      }
      for (const kt of tokenize(k)) {
        if (tokens.includes(kt)) score += 1;
      }
    }
    const qTokens = new Set(tokenize(entry.question));
    for (const t of tokens) if (qTokens.has(t)) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  return bestScore >= 3 ? best : null;
}

function actions(ctx: AssistantContext, opts: { quote?: boolean; book?: boolean } = {}): AssistantAction[] {
  const list: AssistantAction[] = [];
  if (opts.quote !== false) list.push({ label: "הצעת מחיר", to: "/quote" });
  if (opts.book !== false) list.push({ label: "קביעת פגישה", to: "/book" });
  if (ctx.phone) list.push({ label: "התקשרו למשרד", href: `tel:${ctx.phone.replace(/[^+\d]/g, "")}` });
  return list;
}

function hasAny(text: string, words: string[]): boolean {
  const t = text.toLowerCase();
  return words.some((w) => t.includes(w));
}

const GREETING = /^(hi|hello|hey|good morning|good afternoon|good evening|greetings)\b/i;
const THANKS = /\b(thanks|thank you|cheers|appreciate)\b/i;
const BYE = /\b(bye|goodbye|see you|that's all|thats all)\b/i;
const HUMAN = /\b(human|agent|representative|advisor|adviser|real person|someone|staff|speak to)\b/i;
const PRICE = /\b(price|prices|cost|costs|premium|premiums|how much|expensive|cheaper|rate|rates|afford)\b/i;
const CALLBACK = /\b(call me|callback|call back|ring me|phone me|contact me)\b/i;
const HOURS = /\b(hours|open|opening|closed|closing|what time|weekend|saturday|sunday)\b/i;
const APPOINTMENT = /\b(appointment|appointments|book|booking|schedule|meeting|visit|come in)\b/i;
const CLAIM = /\b(claim|claims|accident|incident|damage|stolen|theft)\b/i;

const HE = {
  greeting: ["שלום", "היי", "אהלן", "בוקר טוב", "צהריים טובים", "ערב טוב"],
  thanks: ["תודה", "תודה רבה"],
  bye: ["להתראות", "ביי", "זה הכול"],
  human: ["נציג", "נציגה", "בן אדם", "אדם אמיתי", "לדבר עם", "מוקד"],
  price: ["מחיר", "מחירים", "עלות", "פרמיה", "כמה זה עולה", "כמה עולה", "יקר", "תעריף"],
  callback: ["חזרה טלפונית", "שיחזרו אליי", "התקשרו אליי", "לחזור אליי"],
  hours: ["שעות", "פתוח", "פתוחים", "סגור", "סגורים", "מתי פתוח", "סוף שבוע", "שבת"],
  appointment: ["פגישה", "פגישות", "לקבוע", "תור", "להיפגש", "לבקר"],
  claim: ["תביעה", "תביעות", "תאונה", "נזק", "גניבה", "אירוע"],
};

export function welcomeMessage(ctx: AssistantContext): AssistantReply {
  if (!ctx.status.open) {
    return {
      text: `שלום, ברוכים הבאים לאופיר ביטוח. המשרד סגור כעת — הצוות חוזר בשעה 8:30. אשמח לרשום את פרטיכם כדי שנחזור אליכם, או שתוכלו לקבוע פגישה ליום חול.`,
      actions: [
        { label: "השאירו פרטים", to: "/quote" },
        { label: "קביעת פגישה", to: "/book" },
      ],
    };
  }
  return {
    text: `שלום, ברוכים הבאים לאופיר ביטוח! אוכל לעזור בהצעות מחיר, תביעות, קביעת פגישות ושאלות על הכיסוי שלכם. במה תרצו להתחיל?`,
    actions: actions(ctx),
  };
}

export function buildReply(message: string, kb: KbEntry[], ctx: AssistantContext): AssistantReply {
  const text = message.trim();

  if (GREETING.test(text) || hasAny(text, HE.greeting)) return welcomeMessage(ctx);

  if (PRICE.test(text) || hasAny(text, HE.price)) {
    return {
      text: `הביטוח מתומחר באופן אישי, ולכן אינני יכולה לתת מחיר מדויק בלי להכיר את הפרטים שלכם. מה שמבטחים, היכן אתם ורמת הכיסוי שבחרתם משפיעים על הפרמיה. אם תמלאו את טופס הצעת המחיר, הצוות יכין עבורכם הצעה אישית.`,
      actions: actions(ctx, { book: false }),
    };
  }

  if (CALLBACK.test(text) || hasAny(text, HE.callback)) {
    return {
      text: `בוודאי. השאירו שם, מספר טלפון והערה קצרה בטופס, והצוות יחזור אליכם. מחוץ לשעות הפעילות נחזור אליכם בתחילת יום העסקים הבא.`,
      actions: actions(ctx, { book: false }),
    };
  }

  if (HOURS.test(text) || hasAny(text, HE.hours)) {
    return {
      text: `המשרד פתוח בימים שני עד שישי, 8:30 עד 17:30. כעת אנחנו ${ctx.status.open ? "פתוחים" : "סגורים"} — ${ctx.status.detail}. מחוץ לשעות אלה אוכל לרשום את פרטיכם לחזרה טלפונית, או שתקבעו פגישה ליום חול.`,
      actions: actions(ctx),
    };
  }

  if (APPOINTMENT.test(text) || hasAny(text, HE.appointment)) {
    return {
      text: `בשמחה. בעמוד קביעת הפגישה תבחרו את השירות, תבחרו יום חול ותבחרו משבצת של 30 דקות בין 8:30 ל-17:30. תקבלו מספר אסמכתא מיד.`,
      actions: actions(ctx, { book: false }),
    };
  }

  if (HUMAN.test(text) || hasAny(text, HE.human)) {
    return {
      text: `ניתן להשיג נציג בטלפון \u200E${ctx.phone}\u200E או במייל \u200E${ctx.email}\u200E בשעות הפעילות. אם אינכם רוצים להמתין, השאירו פרטים ונחזור אליכם.`,
      actions: actions(ctx),
    };
  }

  if (CLAIM.test(text) || hasAny(text, HE.claim)) {
    const entry = matchKb(text, kb);
    return {
      text: entry
        ? entry.answer
        : `אשמח לכוון אתכם בנושא תביעות. צרו קשר בהקדם לאחר האירוע, נפתח את התביעה יחד, נבהיר מה מכוסה ונגיד בדיוק אילו מסמכים לשלוח.`,
      actions: [
        { label: "פתיחת תביעה", to: "/quote" },
        { label: "התקשרו למשרד", href: `tel:${ctx.phone.replace(/[^+\d]/g, "")}` },
      ],
    };
  }

  if (THANKS.test(text) || hasAny(text, HE.thanks)) {
    return {
      text: `בשמחה רבה. יש משהו נוסף שאוכל לעזור בו — הצעת מחיר, תביעה או פגישה?`,
      actions: actions(ctx),
    };
  }

  if (BYE.test(text) || hasAny(text, HE.bye)) {
    return {
      text: `תודה שפניתם לאופיר ביטוח. אם תזדקקו לנו שוב, אני כאן בכל עת, והצוות זמין בימים שני עד שישי, 8:30 עד 17:30.`,
      actions: actions(ctx),
    };
  }

  const entry = matchKb(text, kb);
  if (entry) {
    return { text: entry.answer, actions: actions(ctx) };
  }

  return {
    text: `אני רוצה לוודא שתקבלו תשובה מדויקת ולא ניחוש. אני יכולה לעזור בעיקר בהצעות מחיר, תביעות, פגישות ושאלות על הכיסוי. אפשר גם להשאיר פרטים והצוות יחזור אליכם אישית.`,
    actions: actions(ctx),
  };
}
