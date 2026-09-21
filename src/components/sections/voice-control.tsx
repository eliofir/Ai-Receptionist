import { Mic, Square } from "lucide-react";
import { voiceCopy } from "@/content/site";
import type { VoiceState } from "@/hooks/use-speech";

export function VoiceControl({
  state,
  transcript,
  error,
  recognitionSupported,
  onStart,
  onStop,
}: {
  state: VoiceState;
  transcript: string;
  error: string | null;
  recognitionSupported: boolean;
  onStart: () => void;
  onStop: () => void;
}) {
  const active = state === "listening" || state === "speaking";

  const buttonClass = !recognitionSupported
    ? "bg-secondary text-muted-foreground/60 cursor-not-allowed"
    : state === "listening"
      ? "bg-primary text-primary-foreground voice-glow"
      : state === "speaking"
        ? "bg-primary text-primary-foreground voice-glow"
        : state === "thinking"
          ? "bg-secondary text-foreground"
          : "bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground";

  return (
    <div className="rounded-xl border border-border bg-background/40 p-4 sm:p-5">
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          {state === "listening" ? (
            <span
              className="voice-ring pointer-events-none absolute inset-0 rounded-full border-2 border-primary"
              aria-hidden="true"
            />
          ) : null}
          <button
            type="button"
            onClick={active ? onStop : onStart}
            disabled={!recognitionSupported}
            aria-label={
              !recognitionSupported
                ? voiceCopy.unsupported
                : active
                  ? "Stop the voice receptionist"
                  : voiceCopy.talk
            }
            aria-pressed={state === "listening"}
            className={`relative flex h-16 w-16 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card ${buttonClass}`}
          >
            {active ? <Square className="h-6 w-6" /> : <Mic className="h-7 w-7" />}
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{voiceCopy.title}</p>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-xs ${
                state === "listening" || state === "speaking"
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
              aria-live="polite"
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  state === "listening" || state === "speaking"
                    ? "bg-primary"
                    : "bg-muted-foreground"
                }`}
                aria-hidden="true"
              />
              {voiceCopy.states[state]}
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {recognitionSupported ? voiceCopy.helper : voiceCopy.unsupported}
          </p>
        </div>

        {active ? (
          <button
            type="button"
            onClick={onStop}
            className="hidden shrink-0 rounded-full border border-border px-4 py-2 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary sm:inline-flex"
          >
            {voiceCopy.stop}
          </button>
        ) : null}
      </div>

      {state === "listening" && transcript ? (
        <p className="mt-3 rounded-lg bg-secondary px-3 py-2 text-sm text-foreground">
          <span className="text-muted-foreground">Heard: </span>
          {transcript}
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 text-xs leading-relaxed text-destructive" role="status">
          {error}
        </p>
      ) : null}
    </div>
  );
}
