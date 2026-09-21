import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceState = "idle" | "listening" | "thinking" | "speaking";

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
};

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

/**
 * Browser-native voice layer for the receptionist: listens with the Web Speech
 * API, hands the final transcript to `onFinal`, and speaks replies with
 * speechSynthesis. No backend, no keys. Every path returns to a safe state so
 * the mic can never get stuck in "listening".
 */
export function useSpeech({ onFinal }: { onFinal: (text: string) => void }) {
  const [state, setState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const gotFinalRef = useRef(false);

  const recognitionSupported = getRecognitionCtor() !== null;
  const synthesisSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    setError(null);
    setTranscript("");
    gotFinalRef.current = false;

    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* ignore */
    }

    const rec = new Ctor();
    rec.lang = "en-US";
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
      setTranscript((final || interim).trim());
      if (final.trim()) {
        gotFinalRef.current = true;
        setState("thinking");
        onFinal(final.trim());
      }
    };

    rec.onerror = (event: any) => {
      const kind = event?.error;
      if (kind === "not-allowed" || kind === "service-not-allowed") {
        setError("Microphone access was blocked. You can still type your question below.");
      } else if (kind === "no-speech") {
        setError("We did not catch that. Tap the mic and try again.");
      } else if (kind === "aborted") {
        setError(null);
      } else {
        setError("Voice input stopped. You can still type your question below.");
      }
      setState("idle");
    };

    rec.onend = () => {
      if (!gotFinalRef.current) setState("idle");
    };

    recognitionRef.current = rec;
    try {
      rec.start();
      setState("listening");
    } catch {
      setState("idle");
    }
  }, [onFinal]);

  const stop = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* ignore */
    }
    setState("idle");
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!synthesisSupported || !text) {
        setState("idle");
        return;
      }
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-US";
        utterance.rate = 1;
        utterance.onend = () => setState("idle");
        utterance.onerror = () => setState("idle");
        setState("speaking");
        window.speechSynthesis.speak(utterance);
      } catch {
        setState("idle");
      }
    },
    [synthesisSupported],
  );

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort();
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

  return {
    state,
    transcript,
    error,
    recognitionSupported,
    synthesisSupported,
    start,
    stop,
    speak,
  };
}
