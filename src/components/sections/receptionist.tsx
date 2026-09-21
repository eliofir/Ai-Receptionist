import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { getOfficeStatus } from "@/lib/business-hours";
import {
  buildReply,
  welcomeMessage,
  type AssistantAction,
  type AssistantReply,
} from "@/lib/assistant";
import { useKnowledgeBase, useSiteInfo } from "@/hooks/use-site-data";
import { OfficeStatusPanel } from "./office-status";

type Message = {
  id: number;
  role: "user" | "assistant";
  text: string;
  actions?: AssistantAction[];
};

const QUICK_REPLIES = [
  "הצעת מחיר",
  "פתיחת תביעה",
  "קביעת פגישה",
  "שעות פעילות",
];

let nextId = 1;

function ActionChip({ action }: { action: AssistantAction }) {
  const cls =
    "inline-flex items-center rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary";
  if (action.to) {
    return (
      <Link to={action.to} className={cls}>
        {action.label}
      </Link>
    );
  }
  return (
    <a href={action.href} className={cls}>
      {action.label}
    </a>
  );
}

export function Receptionist() {
  const info = useSiteInfo();
  const { kb } = useKnowledgeBase();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const started = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);
  const kbRef = useRef(kb);
  kbRef.current = kb;

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const status = getOfficeStatus();
    const reply = welcomeMessage({ status, phone: "", email: "" });
    setMessages([{ id: nextId++, role: "assistant", text: reply.text, actions: reply.actions }]);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, typing]);

  function send(raw: string) {
    const text = raw.trim();
    if (!text || typing) return;
    setInput("");
    setMessages((m) => [...m, { id: nextId++, role: "user", text }]);
    setTyping(true);
    window.setTimeout(() => {
      const status = getOfficeStatus();
      const reply: AssistantReply = buildReply(text, kbRef.current, {
        status,
        phone: info.phone ?? "",
        email: info.email ?? "",
      });
      setMessages((m) => [
        ...m,
        { id: nextId++, role: "assistant", text: reply.text, actions: reply.actions },
      ]);
      setTyping(false);
    }, 700);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="flex min-h-[560px] flex-col rounded-xl border border-border bg-card">
        <header className="flex items-center gap-3 border-b border-border px-5 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            דל
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">דלית</p>
            <p className="text-xs text-muted-foreground">נציגה וירטואלית</p>
          </div>
        </header>

        <div className="thread-scroll flex-1 space-y-4 overflow-y-auto px-5 py-5" aria-live="polite">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[85%] ${m.role === "user" ? "text-right" : ""}`}>
                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {m.text}
                </div>
                {m.actions && m.actions.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {m.actions.map((a) => (
                      <ActionChip key={a.label} action={a} />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ))}

          {typing ? (
            <div className="flex justify-start">
              <div className="flex items-center gap-1 rounded-2xl bg-secondary px-4 py-3">
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                <span className="sr-only">דלית מקלידה</span>
              </div>
            </div>
          ) : null}
          <div ref={endRef} />
        </div>

        <div className="border-t border-border px-5 py-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {QUICK_REPLIES.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => send(q)}
                className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                {q}
              </button>
            ))}
          </div>
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <label htmlFor="assistant-input" className="sr-only">
              הודעה לדלית
            </label>
            <input
              id="assistant-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="הקלידו את שאלתכם…"
              autoComplete="off"
              className="h-11 flex-1 rounded-full border border-input bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button type="submit" className="h-11 rounded-full px-5" disabled={typing || !input.trim()}>
              שלח
            </Button>
          </form>
        </div>
      </section>

      <OfficeStatusPanel info={info} />
    </div>
  );
}
