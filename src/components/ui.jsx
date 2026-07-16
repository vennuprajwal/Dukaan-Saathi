import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Mic } from "lucide-react";

/* Reveal-on-scroll wrapper. Motion already honors prefers-reduced-motion by
   shrinking transforms, and our CSS zeroes durations, so this stays gentle. */
export function Reveal({ children, delay = 0, y = 24, className = "" }) {
  const ref = useRef(null);
  const [key, setKey] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onReveal = (ev) => {
      try {
        const section = el.closest("section");
        const targetId = section?.id;
        // If event has no id, treat as a global retrigger. Otherwise match by id.
        if (!ev?.detail?.id || ev.detail.id === targetId) setKey((k) => k + 1);
      } catch (e) {}
    };

    document.addEventListener("reveal-section", onReveal);
    return () => document.removeEventListener("reveal-section", onReveal);
  }, []);

  return (
    <motion.div
      key={key}
      ref={ref}
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* Section shell with consistent vertical rhythm + optional id anchor. */
export function Section({ id, className = "", children }) {
  return (
    <section id={id} className={`relative px-5 py-20 sm:px-8 md:py-28 ${className}`}>
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </section>
  );
}

export function Eyebrow({ children, className = "" }) {
  return (
    <p
      className={`font-sans text-xs font-semibold uppercase tracking-[0.18em] text-terracotta sm:text-sm ${className}`}
    >
      {children}
    </p>
  );
}

/* The premium chat widget shell used in mockups. */
export function PhoneShell({ children, className = "" }) {
  return (
    <div
      className={`relative w-full max-w-[340px] overflow-hidden rounded-[2rem] border border-black/5 bg-paper shadow-2xl ring-1 ring-black/5 ${className}`}
    >
      <div className="flex items-center gap-3 bg-white px-4 py-3 shadow-sm border-b border-black/5">
        <div className="relative grid h-9 w-9 place-items-center rounded-full bg-shopfront text-sm font-bold text-marigold">
          दु
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-leaf"></span>
        </div>
        <div className="leading-tight">
          <p className="font-sans text-sm font-semibold text-shopfront">
            Dukaan Saathi AI
          </p>
          <p className="text-[11px] font-medium text-leaf">● Online</p>
        </div>
      </div>
      <div className="relative h-[500px] bg-paper-deep/30">
        {children}
      </div>
    </div>
  );
}

/* A single chat bubble. side = "in" (assistant, left) | "out" (owner, right) */
export function Bubble({ side = "in", children, className = "" }) {
  const isOut = side === "out";
  return (
    <div className={`flex ${isOut ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-snug shadow-sm ring-1 ring-black/5 ${
          isOut
            ? "rounded-br-sm bg-shopfront text-paper"
            : "rounded-bl-sm bg-white text-ink"
        } ${className}`}
      >
        {children}
      </div>
    </div>
  );
}

/* Voice-note bubble with an animated waveform. */
export function VoiceNote({ side = "out", duration = "0:06" }) {
  const isOut = side === "out";
  return (
    <div className={`flex ${isOut ? "justify-end" : "justify-start"}`}>
      <div
        className={`flex max-w-[82%] items-center gap-2.5 rounded-2xl px-3 py-2.5 shadow-sm ${
          isOut ? "rounded-br-sm bg-shopfront" : "rounded-bl-sm bg-white"
        }`}
      >
        <Mic className={`h-4 w-4 ${isOut ? "text-leaf" : "text-terracotta"}`} />
        <Waveform tone={isOut ? "light" : "dark"} />
        <span className={`text-[11px] font-medium ${isOut ? "text-paper/70" : "text-ink/50"}`}>
          {duration}
        </span>
      </div>
    </div>
  );
}

export function Waveform({ tone = "light", bars = 22 }) {
  const color = tone === "light" ? "bg-marigold" : "bg-terracotta";
  return (
    <div className="flex h-6 items-center gap-[3px]">
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className={`wave-bar w-[2px] rounded-full ${color}`}
          style={{
            height: `${8 + ((i * 7) % 16)}px`,
            animationDelay: `${(i % 8) * 0.09}s`,
          }}
        />
      ))}
    </div>
  );
}

export function TypingDots() {
  return (
    <div className="flex w-fit items-center gap-1 rounded-2xl rounded-bl-md bg-white px-3.5 py-3">
      {[0, 0.2, 0.4].map((d) => (
        <span
          key={d}
          className="typing-dot h-1.5 w-1.5 rounded-full bg-ink/40"
          style={{ animationDelay: `${d}s` }}
        />
      ))}
    </div>
  );
}

/* Shimmer skeleton block — for loading states that should feel premium, not
   blank. Compose freely: <Skeleton className="h-8 w-32 rounded-lg" /> */
export function Skeleton({ className = "" }) {
  return <div className={`skeleton rounded-md ${className}`} />;
}

/* A tidy "structured result" card the AI emits after parsing input. */
export function ResultCard({ rows, title = "Logged", tone = "leaf" }) {
  const accent = tone === "leaf" ? "text-leaf" : "text-marigold";
  return (
    <div className="rounded-xl border border-black/5 bg-white p-3 text-ink shadow-sm">
      <p className={`mb-2 font-sans text-[11px] font-semibold uppercase tracking-wide ${accent}`}>
        ✓ {title}
      </p>
      <dl className="space-y-1.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-4 text-[12px]">
            <dt className="text-ink/50">{k}</dt>
            <dd className="font-semibold text-ink">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
