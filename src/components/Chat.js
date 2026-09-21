import React, { useEffect, useRef, useState } from "react";
import {
  businessName,
  hours,
  phone,
  address,
  email,
  services,
  quickReplies,
} from "../data";

const WELCOME = `שלום! אני המזכירה הווירטואלית של ${businessName}. אפשר לשאול אותי על שעות פעילות, שירותים, מחירים, מיקום או לקבוע תור.`;

function serviceList() {
  return services.map((s) => `• ${s.name} — ${s.price}`).join("\n");
}

function getReply(raw) {
  const text = raw.trim().toLowerCase();
  const has = (...words) => words.some((w) => text.includes(w));

  if (has("שלום", "היי", "אהלן", "בוקר טוב", "ערב טוב")) {
    return `שלום וברוכים הבאים ל${businessName}! במה אפשר לעזור?`;
  }
  if (has("תודה")) {
    return "בשמחה! אם יש עוד שאלות אני כאן.";
  }
  if (has("שעות", "פתוח", "סגור", "מתי", "פעילות")) {
    return `שעות הפעילות שלנו: ${hours}.`;
  }
  if (has("מחיר", "עולה", "כמה", "עלות", "תשלום", "מקבלים")) {
    return `המחירים שלנו:\n${serviceList()}\nלהצעת מחיר מדויקת אפשר להשאיר פרטים בטופס.`;
  }
  if (has("שירות", "מה אתם עושים", "עבודה")) {
    return `אנחנו מציעים:\n${serviceList()}`;
  }
  if (has("איפה", "כתובת", "מיקום", "להגיע", "נמצאים")) {
    return `אנחנו נמצאים ב${address}. אפשר ליצור קשר בטלפון ${phone} או במייל ${email}.`;
  }
  if (has("תור", "לקבוע", "פגישה", "זימון", "טכנאי")) {
    return "בשמחה! אפשר למלא את טופס קביעת התור בעמוד, או להתקשר אלינו ונחזור אליכם בהקדם.";
  }
  if (has("טלפון", "ליצור קשר", "מייל", "אימייל")) {
    return `אפשר ליצור קשר בטלפון ${phone} או במייל ${email}.`;
  }
  return "מצטערת, לא הצלחתי להבין. אפשר לשאול על שעות פעילות, שירותים, מחירים, מיקום או קביעת תור.";
}

export default function Chat() {
  const [messages, setMessages] = useState([{ from: "bot", text: WELCOME }]);
  const [input, setInput] = useState("");
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messages]);

  function send(text) {
    const value = (text ?? input).trim();
    if (!value) return;
    setMessages((prev) => [
      ...prev,
      { from: "user", text: value },
      { from: "bot", text: getReply(value) },
    ]);
    setInput("");
  }

  function onSubmit(e) {
    e.preventDefault();
    send();
  }

  return (
    <section className="section" id="chat">
      <div className="container">
        <h2>שיחה עם המזכירה</h2>
        <div className="chat">
          <div
            className="chat-log"
            ref={logRef}
            role="log"
            aria-live="polite"
            aria-label="היסטוריית השיחה"
          >
            {messages.map((m, i) => (
              <div key={i} className={`msg ${m.from}`}>
                {m.text}
              </div>
            ))}
          </div>
          <div className="chat-quick">
            {quickReplies.map((q) => (
              <button
                key={q}
                type="button"
                className="chip"
                onClick={() => send(q)}
              >
                {q}
              </button>
            ))}
          </div>
          <form className="chat-form" onSubmit={onSubmit}>
            <label htmlFor="chat-input" className="sr-only">
              כתיבת הודעה
            </label>
            <input
              id="chat-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="כתבו שאלה…"
              autoComplete="off"
            />
            <button className="btn" type="submit">
              שליחה
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
