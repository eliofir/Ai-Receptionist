import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, PhoneCall, PhoneOff, RotateCcw, Send, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dalitCopy, voiceCta } from "@/content/site";
import { getOfficeStatus } from "@/lib/business-hours";
import { db } from "@/integrations/neon/client";
import { useKnowledgeBase } from "@/hooks/use-site-data";
import {
  describeSlots,
  deskContact,
  detectIntent,
  faqAnswer,
  nextSlots,
  parseSlotChoice,
  pickDesk,
  voiceRef,
  type CallState,
  type Slot,
} from "@/lib/dalit";

type Line = { id: number; speaker: "caller" | "dalit" | "system"; text: string; time: string };

type Pending =
  | { kind: "quote-name" }
  | { kind: "quote-phone"; name: string }
  | { kind: "appointment-slot"; slots: Slot[] }
  | { kind: "appointment-name"; slot: Slot }
  | { kind: "appointment-phone"; slot: Slot; name: string }
  | null;

type RecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
};

function recognitionCtor(): (new () => RecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

const VOICE_STORAGE_KEY = "ophir-voice-name";
const SILENCE_MS = 900;

/** Rank Hebrew voices: prefer high-quality online/neural voices, then female names. */
function rankVoice(v: SpeechSynthesisVoice): number {
  const n = v.name.toLowerCase();
  let score = 0;
  if (n.includes("google")) score += 100;
  if (n.includes("natural")) score += 80;
  if (n.includes("neural")) score += 80;
  if (n.includes("online")) score += 60;
  if (n.includes("multilingual")) score += 40;
  if (!v.localService) score += 20;
  if (/female|woman|נשית|אישה/.test(n)) score += 30;
  return score;
}

/** Split a reply into short spoken chunks so it does not read as one flat block. */
function splitIntoChunks(text: string): string[] {
  const sentences = text
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  for (const sentence of sentences) {
    if (sentence.length <= 90) {
      chunks.push(sentence);
      continue;
    }
    const parts = sentence.split(/(?<=[,;:])\s+/).map((s) => s.trim()).filter(Boolean);
    let current = "";
    for (const part of parts) {
      if (current && `${current} ${part}`.length > 90) {
        chunks.push(current);
        current = part;
      } else {
        current = current ? `${current} ${part}` : part;
      }
    }
    if (current) chunks.push(current);
  }
  return chunks.length > 0 ? chunks : [text];
}

const STATE_META: Record<CallState, { label: string; dot: string; text: string }> = {
  idle: { label: "מוכן", dot: "bg-muted-foreground", text: "text-muted-foreground" },
  ringing: { label: "מצלצל", dot: "bg-amber-400", text: "text-amber-300" },
  greeting: { label: "ברכה", dot: "bg-primary", text: "text-primary" },
  listening: { label: "מקשיבה", dot: "bg-emerald-400", text: "text-emerald-300" },
  routing: { label: "חושבת", dot: "bg-sky-400", text: "text-sky-300" },
  transferring: { label: "מעבירה", dot: "bg-amber-400", text: "text-amber-300" },
  connected: { label: "מחובר", dot: "bg-emerald-400", text: "text-emerald-300" },
  ended: { label: "הסתיים", dot: "bg-muted-foreground", text: "text-muted-foreground" },
};

const STATE_ORDER: CallState[] = [
  "ringing",
  "greeting",
  "listening",
  "routing",
  "transferring",
  "connected",
  "ended",
];

let lineId = 1;

export function VoiceDemo({
  autoStart = false,
  onClose,
}: {
  autoStart?: boolean;
  onClose?: () => void;
}) {
  const { kb } = useKnowledgeBase();
  const [callState, setCallState] = useState<CallState>("idle");
  const [lines, setLines] = useState<Line[]>([]);
  const [liveText, setLiveText] = useState("");
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dbNote, setDbNote] = useState<string | null>(null);
  const [status, setStatus] = useState(() => getOfficeStatus());
  const [lang, setLang] = useState<"en" | "he">("he");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [allVoices, setAllVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voicesReady, setVoicesReady] = useState(false);
  const [micDenied, setMicDenied] = useState(false);
  const [voiceName, setVoiceName] = useState<string>(() => {
    try {
      return localStorage.getItem(VOICE_STORAGE_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [speaking, setSpeaking] = useState(false);

  const kbRef = useRef(kb);
  kbRef.current = kb;
  const pendingRef = useRef<Pending>(null);
  const activeRef = useRef(false);
  const recRef = useRef<RecognitionLike | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const silenceRef = useRef<number | null>(null);
  const finalRef = useRef("");
  const interimRef = useRef("");
  const speakingRef = useRef(false);
  const listeningRef = useRef(false);
  const processingRef = useRef(false);
  const bargeInRef = useRef(false);
  const speechTokenRef = useRef(0);
  const speechStartRef = useRef(0);
  const autoStartedRef = useRef(false);
  const langRef = useRef(lang);
  langRef.current = lang;
  const endRef = useRef<HTMLDivElement>(null);

  const supported = recognitionCtor() !== null;
  const synthesisSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    const id = window.setInterval(() => setStatus(getOfficeStatus()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [lines, liveText]);

  // Load and rank Hebrew voices; refresh when the browser reports new voices.
  useEffect(() => {
    if (!synthesisSupported) return;
    const load = () => {
      const all = window.speechSynthesis.getVoices();
      setAllVoices(all);
      const he = all.filter((v) => v.lang.toLowerCase().startsWith("he"));
      const ranked = [...he].sort((a, b) => rankVoice(b) - rankVoice(a));
      setVoices(ranked);
      if (all.length > 0) setVoicesReady(true);
    };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    const t = window.setTimeout(() => setVoicesReady(true), 800);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load);
      window.clearTimeout(t);
    };
  }, [synthesisSupported]);

  // When opened from the homepage CTA, begin the call automatically.
  useEffect(() => {
    if (!autoStart || autoStartedRef.current) return;
    autoStartedRef.current = true;
    const t = window.setTimeout(() => {
      if (!activeRef.current) startCall();
    }, 500);
    return () => window.clearTimeout(t);
  }, [autoStart]);

  const selectedVoice = useMemo(() => {
    if (voices.length === 0) return null;
    const saved = voices.find((v) => v.name === voiceName);
    if (saved) return saved;
    const female = voices.find((v) => /female|woman|נשית|אישה/i.test(v.name));
    return female ?? voices[0];
  }, [voices, voiceName]);

  // If no Hebrew voice is installed, fall back to any installed voice so the call
  // still produces audio instead of silently doing nothing.
  const fallbackVoice = useMemo(() => {
    if (allVoices.length === 0) return null;
    return allVoices.find((v) => v.lang.toLowerCase().startsWith("en")) ?? allVoices[0];
  }, [allVoices]);

  // Clean up listeners, timers and audio on unmount.
  useEffect(() => {
    return () => {
      activeRef.current = false;
      if (silenceRef.current) window.clearTimeout(silenceRef.current);
      try {
        recRef.current?.abort();
      } catch {
        /* ignore */
      }
      try {
        window.speechSynthesis?.cancel();
      } catch {
        /* ignore */
      }
    };
  }, []);

  function addLine(speaker: Line["speaker"], text: string) {
    setLines((prev) => [
      ...prev,
      {
        id: lineId++,
        speaker,
        text,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      },
    ]);
  }

  function chooseVoice(name: string) {
    setVoiceName(name);
    try {
      localStorage.setItem(VOICE_STORAGE_KEY, name);
    } catch {
      /* ignore */
    }
  }

  /** Resolve the best voice at speak time (re-reads getVoices so late-loading voices work). */
  function resolveVoice(): SpeechSynthesisVoice | null {
    if (!synthesisSupported) return null;
    const all = window.speechSynthesis.getVoices();
    if (all.length === 0) return selectedVoice ?? fallbackVoice;
    const he = all.filter((v) => v.lang.toLowerCase().startsWith("he"));
    if (he.length > 0) {
      const ranked = [...he].sort((a, b) => rankVoice(b) - rankVoice(a));
      const saved = ranked.find((v) => v.name === voiceName);
      return saved ?? ranked.find((v) => /female|woman|נשית|אישה/i.test(v.name)) ?? ranked[0];
    }
    return all.find((v) => v.lang.toLowerCase().startsWith("en")) ?? all[0] ?? null;
  }

  function clearSilence() {
    if (silenceRef.current) {
      window.clearTimeout(silenceRef.current);
      silenceRef.current = null;
    }
  }

  function stopRecognition() {
    clearSilence();
    try {
      recRef.current?.abort();
    } catch {
      /* ignore */
    }
    recRef.current = null;
    listeningRef.current = false;
  }

  function stopSpeakingAndListen() {
    cancelSpeech(true);
    if (!activeRef.current) return;
    processingRef.current = false;
    finalRef.current = "";
    interimRef.current = "";
    setLiveText("");
    setCallState("listening");
    if (!recRef.current) startRecognition();
    resetSilence();
  }

  function cancelSpeech(bargeIn = false) {
    bargeInRef.current = bargeIn;
    speechTokenRef.current += 1;
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* ignore */
    }
    speakingRef.current = false;
    setSpeaking(false);
  }

  function say(text: string, after?: () => void) {
    addLine("dalit", text);
    bargeInRef.current = false;
    const token = ++speechTokenRef.current;
    const chunks = splitIntoChunks(text);
    let index = 0;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      speakingRef.current = false;
      setSpeaking(false);
      if (bargeInRef.current) {
        bargeInRef.current = false;
        return;
      }
      if (activeRef.current && after) after();
    };
    if (!synthesisSupported) {
      window.setTimeout(finish, 1100);
      return;
    }
    // Stop listening while she speaks so the microphone cannot cancel her own voice.
    stopRecognition();
    try {
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
      }
    } catch {
      /* ignore */
    }
    const speakNext = () => {
      if (token !== speechTokenRef.current) return; // superseded or cancelled
      if (index >= chunks.length) {
        finish();
        return;
      }
      const chunk = chunks[index++];
      try {
        const utterance = new SpeechSynthesisUtterance(chunk);
        utterance.lang = /[\u0590-\u05FF]/.test(chunk) ? "he-IL" : "en-US";
        const voice = resolveVoice() ?? selectedVoice ?? fallbackVoice;
        if (voice) utterance.voice = voice;
        utterance.rate = 1.02;
        utterance.pitch = 1.0;
        utterance.onend = () => {
          if (token === speechTokenRef.current) window.setTimeout(speakNext, 140);
        };
        utterance.onerror = () => {
          if (token === speechTokenRef.current) window.setTimeout(speakNext, 140);
        };
        utteranceRef.current = utterance;
        window.speechSynthesis.resume();
        window.speechSynthesis.speak(utterance);
      } catch {
        finish();
      }
    };
    speakingRef.current = true;
    speechStartRef.current = Date.now();
    setSpeaking(true);
    speakNext();
  }

  function finishTurn() {
    if (processingRef.current) return;
    const text = `${finalRef.current} ${interimRef.current}`.trim();
    if (!text) return;
    processingRef.current = true;
    stopRecognition();
    finalRef.current = "";
    interimRef.current = "";
    setLiveText("");
    handleCaller(text);
  }

  function resetSilence() {
    clearSilence();
    silenceRef.current = window.setTimeout(() => {
      silenceRef.current = null;
      finishTurn();
    }, SILENCE_MS);
  }

  function startRecognition() {
    if (!activeRef.current) return;
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    if (recRef.current) return; // only one recognition instance at a time
    const rec = new Ctor();
    rec.lang = langRef.current === "he" ? "he-IL" : "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    rec.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) final += result[0].transcript;
        else interim += result[0].transcript;
      }
      const heard = (final || interim).trim();
      if (speakingRef.current) {
        // Barge-in: only after she has been speaking for a moment, so her own
        // voice picked up by the microphone cannot cancel her.
        if (heard.length >= 3 && Date.now() - speechStartRef.current > 1500) {
          cancelSpeech(true);
          finalRef.current = "";
          interimRef.current = "";
          setLiveText("");
          listeningRef.current = true;
          setCallState("listening");
          resetSilence();
        }
        return;
      }
      if (final) finalRef.current = `${finalRef.current} ${final}`.trim();
      interimRef.current = interim;
      setLiveText(`${finalRef.current} ${interim}`.trim());
      resetSilence();
    };
    rec.onerror = (event: any) => {
      const kind = event?.error;
      if (kind === "not-allowed" || kind === "service-not-allowed") {
        setMicDenied(true);
        setError("הגישה למיקרופון נחסמה. אפשר לאשר את המיקרופון ולנסות שוב, או להקליד את ההודעה למטה.");
      } else if (kind !== "aborted" && kind !== "no-speech") {
        setError("קלט הקול הופסק. אפשר להקליד במקום למטה.");
      }
      recRef.current = null;
      listeningRef.current = false;
    };
    rec.onend = () => {
      recRef.current = null;
      listeningRef.current = false;
      if (activeRef.current && !processingRef.current && !recRef.current) {
        window.setTimeout(() => {
          if (activeRef.current && !processingRef.current && !recRef.current) startRecognition();
        }, 120);
      }
    };
    recRef.current = rec;
    try {
      rec.start();
      listeningRef.current = true;
    } catch {
      recRef.current = null;
    }
  }

  function beginListening() {
    if (!activeRef.current) return;
    processingRef.current = false;
    setCallState("listening");
    finalRef.current = "";
    interimRef.current = "";
    setLiveText("");
    if (!recRef.current) startRecognition();
    resetSilence();
  }

  function handleCaller(text: string) {
    setLiveText("");
    setError(null);
    addLine("caller", text);
    setCallState("routing");
    window.setTimeout(() => routeCall(text), 350);
  }

  async function saveLead(name: string, phone: string) {
    try {
      const { error: err } = await db.from("leads").insert({
        reference: voiceRef("OPH-V"),
        full_name: name,
        phone,
        email: "voice-test@ophirinsurance.com",
        insurance_type: "אחר",
        message: "בקשת הצעת מחיר שנרשמה בהדגמת הקול בדפדפן.",
        source: "voice-test",
        notes: "נרשם על ידי דלית. הדוא״ל לא נאסף בשיחה.",
      });
      if (err) throw new Error(err.message);
      setDbNote("נשמר ברשימת הפניות לצורכי בדיקה.");
    } catch {
      setDbNote("נשמר לצורכי בדיקה — מסד הנתונים החי אינו מחובר בתצוגה המקדימה.");
    }
  }

  async function saveAppointment(name: string, phone: string, slot: Slot) {
    try {
      const { error: err } = await db.from("appointments").insert({
        reference: voiceRef("OPH-VB"),
        full_name: name,
        phone,
        email: "voice-test@ophirinsurance.com",
        service_type: "פנייה כללית",
        appointment_date: slot.date,
        time_slot: slot.time,
        notes: "נקבע על ידי דלית בהדגמת הקול בדפדפן.",
      });
      if (err) throw new Error(err.message);
      setDbNote("נשמר ברשימת הפגישות לצורכי בדיקה.");
    } catch {
      setDbNote("נשמר לצורכי בדיקה — מסד הנתונים החי אינו מחובר בתצוגה המקדימה.");
    }
  }

  function routeCall(text: string) {
    const pending = pendingRef.current;

    if (pending?.kind === "quote-name") {
      pendingRef.current = { kind: "quote-phone", name: text };
      say(`תודה, ${text.split(" ")[0]}. מה המספר הכי נוח שנחזור אליך?`, beginListening);
      return;
    }
    if (pending?.kind === "quote-phone") {
      pendingRef.current = null;
      void saveLead(pending.name, text);
      say(
        `מעולה, רשמתי. נציג מהצוות יחזור אליך לגבי הצעת המחיר. משהו נוסף?`,
        beginListening,
      );
      return;
    }
    if (pending?.kind === "appointment-slot") {
      const slot = parseSlotChoice(text, pending.slots);
      pendingRef.current = { kind: "appointment-name", slot };
      say(`מעולה. איך קוראים לך?`, beginListening);
      return;
    }
    if (pending?.kind === "appointment-name") {
      pendingRef.current = { kind: "appointment-phone", slot: pending.slot, name: text };
      say(`תודה, ${text.split(" ")[0]}. מה המספר הכי נוח שנחזור אליך?`, beginListening);
      return;
    }
    if (pending?.kind === "appointment-phone") {
      pendingRef.current = null;
      void saveAppointment(pending.name, text, pending.slot);
      say(
        `מעולה, קבעתי לך פגישה ל${pending.slot.label}. אישור יישלח בהמשך. משהו נוסף?`,
        beginListening,
      );
      return;
    }

    if (/(message|take a message|call back|callback|call me|הודעה|להשאיר הודעה|לחזור אליי|התקשרו אליי)/i.test(text)) {
      pendingRef.current = { kind: "quote-name" };
      say("בוודאי. איך קוראים לך?", beginListening);
      return;
    }

    const intent = detectIntent(text);
    if (intent === "transfer") {
      transferCall(text);
      return;
    }
    if (intent === "quote") {
      pendingRef.current = { kind: "quote-name" };
      say("בשמחה. איך קוראים לך?", beginListening);
      return;
    }
    if (intent === "appointment") {
      const slots = nextSlots(3);
      pendingRef.current = { kind: "appointment-slot", slots };
      say(
        `בוודאי. יש לי ${describeSlots(slots)}. מה מתאים לך?`,
        beginListening,
      );
      return;
    }

    const answer = faqAnswer(text, kbRef.current);
    if (answer) {
      say(answer, beginListening);
      return;
    }
    say(
      "אני יכולה לרשום לך הודעה, או להעביר אותך לנציג. מה תעדיף?",
      beginListening,
    );
  }

  function transferCall(text: string) {
    const desk = pickDesk(text);
    const contact = deskContact(desk);
    setCallState("transferring");
    say(`רגע, אני מעבירה אותך ל${desk.name}, ${contact}.`);
    window.setTimeout(() => {
      if (!activeRef.current) return;
      setCallState("connected");
      addLine("system", `מחובר אל ${desk.name} — ${contact}`);
      say(
        `מעולה, אתה מחובר ל${desk.name}, ${desk.role}, ${contact}.`,
        beginListening,
      );
    }, 2500);
  }

  function startCall() {
    setLines([]);
    setError(null);
    setMicDenied(false);
    setDbNote(null);
    pendingRef.current = null;
    activeRef.current = true;
    processingRef.current = false;
    setCallState("ringing");
    addLine("system", "שיחה נכנסת");
    window.setTimeout(() => {
      if (!activeRef.current) return;
      setCallState("greeting");
      const opening = status.open ? dalitCopy.opening : dalitCopy.afterHours;
      say(opening, beginListening);
    }, 1200);
  }

  function endCall() {
    activeRef.current = false;
    processingRef.current = false;
    stopRecognition();
    cancelSpeech(false);
    setLiveText("");
    setCallState("ended");
    addLine("system", "השיחה הסתיימה");
  }

  function resetCall() {
    activeRef.current = false;
    processingRef.current = false;
    stopRecognition();
    cancelSpeech(false);
    pendingRef.current = null;
    setLines([]);
    setLiveText("");
    setTyped("");
    setError(null);
    setDbNote(null);
    setCallState("idle");
  }

  const active = callState !== "idle" && callState !== "ended";
  const meta = STATE_META[callState];
  const currentIndex = STATE_ORDER.indexOf(callState);
  const noHebrewVoice = synthesisSupported && voicesReady && voices.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-semibold tracking-[0.12em] ${
            status.open ? "text-emerald-300" : "text-muted-foreground"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${status.open ? "bg-emerald-400" : "bg-muted-foreground"}`}
            aria-hidden="true"
          />
          {status.label}
        </span>
        <span className="text-xs text-muted-foreground">{status.detail}</span>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
          {STATE_ORDER.map((s, i) => {
            const m = STATE_META[s];
            const reached = currentIndex >= i && currentIndex !== -1;
            const isCurrent = callState === s;
            return (
              <div key={s} className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                    isCurrent
                      ? `border-primary/60 bg-primary/10 ${m.text}`
                      : reached
                        ? "border-border text-muted-foreground"
                        : "border-border text-muted-foreground/70"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${isCurrent ? m.dot : "bg-muted-foreground/50"}`}
                    aria-hidden="true"
                  />
                  {m.label}
                </span>
                {i < STATE_ORDER.length - 1 ? (
                  <span className="text-muted-foreground/70" aria-hidden="true">
                    ←
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              דל
              {callState === "listening" ? (
                <span
                  className="voice-ring pointer-events-none absolute inset-0 rounded-full border-2 border-primary"
                  aria-hidden="true"
                />
              ) : null}
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">{dalitCopy.name}</p>
              <p className="text-xs text-muted-foreground">{dalitCopy.role}</p>
            </div>
            <span className={`ms-auto text-xs font-semibold tracking-[0.12em] ${meta.text}`}>
              {meta.label}
            </span>
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                {voiceCta.close}
              </button>
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {!active ? (
              <Button
                type="button"
                className="h-12 rounded-full px-6"
                onClick={startCall}
                disabled={callState === "ringing" || callState === "greeting"}
              >
                <PhoneCall className="h-4 w-4" />
                {callState === "ended" ? "התחלת שיחה חדשה" : "התחל שיחה"}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="h-12 rounded-full px-6"
                onClick={endCall}
              >
                <PhoneOff className="h-4 w-4" />
                סיים שיחה
              </Button>
            )}
            {speaking ? (
              <Button
                type="button"
                variant="outline"
                className="h-12 rounded-full px-6"
                onClick={stopSpeakingAndListen}
              >
                <VolumeX className="h-4 w-4" />
                הפסק
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              className="h-12 rounded-full px-5"
              onClick={resetCall}
            >
              <RotateCcw className="h-4 w-4" />
              איפוס שיחה
            </Button>
          </div>

          <p className="mt-4 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs leading-relaxed text-foreground">
            בתצוגה המוטמעת הדפדפן חוסם את המיקרופון. לשיחה קולית מלאה פתחו את האתר בגוגל כרום
            (מומלץ לעברית):{" "}
            <a
              href="https://ophir-insurance-virtual-receptionist-ijn.vincen.space/test"
              target="_blank"
              rel="noreferrer"
              className="text-primary underline-offset-4 hover:underline"
            >
              ophir-insurance-virtual-receptionist-ijn.vincen.space/test
            </a>
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">זיהוי דיבור ב</span>
            <div className="inline-flex rounded-full border border-border p-0.5">
              <button
                type="button"
                onClick={() => setLang("he")}
                aria-pressed={lang === "he"}
                className={`rounded-full px-3 py-1.5 transition-colors ${
                  lang === "he"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                עברית
              </button>
              <button
                type="button"
                onClick={() => setLang("en")}
                aria-pressed={lang === "en"}
                className={`rounded-full px-3 py-1.5 transition-colors ${
                  lang === "en"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                אנגלית
              </button>
            </div>
          </div>

          {voices.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <label htmlFor="voice-picker" className="text-muted-foreground">
                בחירת קול
              </label>
              <select
                id="voice-picker"
                value={selectedVoice?.name ?? ""}
                onChange={(e) => chooseVoice(e.target.value)}
                className="h-9 max-w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground"
              >
                {voices.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {noHebrewVoice ? (
            <p className="mt-3 rounded-lg border border-border bg-secondary px-3 py-2 text-xs leading-relaxed text-muted-foreground">
              לא נמצא קול עברי במכשיר. דלית תדבר בקול הזמין, ומומלץ לפתוח את האתר בגוגל כרום
              או להתקין קול עברי בהגדרות הדיבור של המכשיר.
            </p>
          ) : null}

          {!synthesisSupported ? (
            <p className="mt-3 rounded-lg border border-border bg-secondary px-3 py-2 text-xs text-muted-foreground">
              הדפדפן אינו תומך בהקראת קול — התשובות יוצגו בכתב.
            </p>
          ) : null}

          {!supported ? (
            <p className="mt-4 rounded-lg border border-border bg-secondary px-3 py-2 text-xs text-muted-foreground">
              {dalitCopy.unsupported}
            </p>
          ) : null}

          {active ? (
            <div className="mt-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Mic className="h-3.5 w-3.5" />
                {callState === "listening"
                  ? "מקשיבה…"
                  : callState === "routing"
                    ? "חושבת…"
                    : callState === "transferring"
                      ? "מעבירה את השיחה…"
                      : "מדברת…"}
              </div>
              {liveText ? (
                <p className="mt-2 rounded-lg bg-secondary px-3 py-2 text-sm text-foreground">
                  <span className="text-muted-foreground">נשמע: </span>
                  {liveText}
                </p>
              ) : null}
            </div>
          ) : null}

          {error ? (
            <p className="mt-3 text-xs text-destructive" role="status">
              {error}
            </p>
          ) : null}

          {micDenied ? (
            <Button
              type="button"
              variant="outline"
              className="mt-3 h-10 rounded-full px-5"
              onClick={() => {
                setMicDenied(false);
                setError(null);
                startCall();
              }}
            >
              נסה שוב
            </Button>
          ) : null}

          <form
              className="mt-4 flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const text = typed.trim();
                if (!text) return;
                setTyped("");
                if (!active) {
                  activeRef.current = true;
                  setCallState("routing");
                  addLine("system", "שיחה מוקלדת");
                }
                handleCaller(text);
              }}
            >
              <label htmlFor="dalit-typed" className="sr-only">
                הקלידו את דברי המתקשר
              </label>
              <input
                id="dalit-typed"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={supported ? "או הקלידו במקום…" : "הקלידו את דברי המתקשר…"}
                className="h-11 flex-1 rounded-full border border-input bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button type="submit" className="h-11 rounded-full px-5" disabled={!typed.trim()}>
                <Send className="h-4 w-4" />
                שלח
              </Button>
            </form>

          {dbNote ? (
            <p className="mt-3 rounded-lg border border-border bg-secondary px-3 py-2 text-xs text-muted-foreground">
              {dbNote}
            </p>
          ) : null}
        </section>

        <section className="flex min-h-[420px] flex-col rounded-xl border border-border bg-card">
          <header className="border-b border-border px-5 py-3">
            <p className="text-sm font-semibold text-foreground">תמלול חי</p>
          </header>
          <div className="thread-scroll flex-1 overflow-y-auto px-5 py-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                מתקשר
              </p>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                דלית
              </p>
              {lines.map((line) =>
                line.speaker === "system" ? (
                  <p
                    key={line.id}
                    className="col-span-2 text-center text-xs text-muted-foreground"
                  >
                    {line.text} · {line.time}
                  </p>
                ) : (
                  <div key={line.id} className="col-span-2 grid grid-cols-2 gap-x-4">
                    <div className={line.speaker === "caller" ? "" : "opacity-0"}>
                      {line.speaker === "caller" ? (
                        <p className="rounded-lg bg-secondary px-3 py-2 text-sm text-foreground">
                          {line.text}
                          <span className="mt-1 block text-[10px] text-muted-foreground">
                            {line.time}
                          </span>
                        </p>
                      ) : null}
                    </div>
                    <div className={line.speaker === "dalit" ? "" : "opacity-0"}>
                      {line.speaker === "dalit" ? (
                        <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-foreground">
                          {line.text}
                          <span className="mt-1 block text-[10px] text-muted-foreground">
                            {line.time}
                          </span>
                        </p>
                      ) : null}
                    </div>
                  </div>
                ),
              )}
              {lines.length === 0 ? (
                <p className="col-span-2 text-sm text-muted-foreground">
                  התחילו את השיחה כדי לראות את השיחה מופיעה כאן.
                </p>
              ) : null}
            </div>
            <div ref={endRef} />
          </div>
        </section>
      </div>
    </div>
  );
}
