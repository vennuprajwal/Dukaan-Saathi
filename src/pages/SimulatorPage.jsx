import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import { Send, Mic, Square, ArrowLeft, LayoutDashboard } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth-context.js";
import { useSpeech } from "../hooks/useSpeech";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { TypingDots } from "../components/ui";

let mid = 0;

export default function SimulatorPage() {
  const { t, i18n } = useTranslation();
  const { isAuthed } = useAuth();
  const [number, setNumber] = useState("+919812345678");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const scrollRef = useRef(null);
  const recRef = useRef(null);
  const chunksRef = useRef([]);

  // Browser speech recognition (preferred); locale follows the UI language.
  const uiLang = i18n.resolvedLanguage?.slice(0, 2) || "en";
  const speech = useSpeech(uiLang);

  // When a reply comes back in a language different from the UI, follow it so
  // the shopkeeper sees the app in the language they actually spoke.
  const followLanguage = (lang) => {
    if (["en", "hi", "te"].includes(lang) && lang !== i18n.resolvedLanguage) {
      i18n.changeLanguage(lang);
    }
  };

  // greeting (re-runs if language changes)
  useEffect(() => {
    setMessages([{ id: mid++, side: "in", text: t("sim.greeting") }]);
  }, [t]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const push = (side, text, extra = {}) =>
    setMessages((m) => [...m, { id: mid++, side, text, ...extra }]);

  const sendText = async (text) => {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    setInput("");
    push("out", content);
    setBusy(true);
    try {
      const res = await api.simMessage(content, isAuthed ? undefined : number);
      push("in", res.reply, { intent: res.intent });
      followLanguage(res.language);
    } catch (e) {
      push("in", "⚠️ " + e.message);
    } finally {
      setBusy(false);
    }
  };

  // Voice entry point. Prefers the browser's Web Speech API (instant, live
  // captions, no server round-trip); falls back to recording + Sarvam STT when
  // the browser can't do it (e.g. Firefox) or the browser attempt fails.
  const startRec = async () => {
    if (speech.supported) {
      setRecording(true);
      try {
        const transcript = (await speech.start()).trim();
        setRecording(false);
        if (transcript) {
          await sendText(transcript);
          return;
        }
        // Nothing captured — fall through to server recording as a backup.
      } catch {
        setRecording(false);
        // fall through to Sarvam
      }
    }
    return startServerRec();
  };

  // Fallback: record audio and let Sarvam transcribe it server-side.
  const startServerRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        push("out", "🎙️ " + t("sim.record"), { voice: true });
        setBusy(true);
        try {
          const res = await api.simVoice(blob, isAuthed ? undefined : number);
          if (res.transcript) push("out", `“${res.transcript}”`, { transcript: true });
          push("in", res.reply, { intent: res.intent });
          followLanguage(res.language);
        } catch (e) {
          push("in", "⚠️ " + e.message);
        } finally {
          setBusy(false);
        }
      };
      rec.start();
      recRef.current = rec;
      setRecording(true);
    } catch {
      push("in", "🎙️ " + (t("sim.micDenied") || "Microphone permission denied."));
    }
  };

  const stopRec = () => {
    if (speech.supported && speech.listening) {
      speech.stop();
      return;
    }
    recRef.current?.stop();
    setRecording(false);
  };

  const samples = ["sale", "udhaar", "profit", "money", "dues", "custDues", "stock"];

  return (
    <div className="min-h-screen bg-paper-deep/40 font-body text-ink">
      <div className="mx-auto max-w-2xl px-4 py-6">
        {/* header */}
        <div className="mb-4 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-ink/60 hover:text-shopfront">
            <ArrowLeft className="h-4 w-4" /> {t("common.backHome")}
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link to={isAuthed ? "/app" : "/login"} className="inline-flex items-center gap-1.5 rounded-full bg-shopfront px-3 py-2 text-xs font-semibold text-paper hover:-translate-y-0.5">
              <LayoutDashboard className="h-4 w-4" /> {t("nav.dashboard")}
            </Link>
          </div>
        </div>

        <div className="mb-3">
          <h1 className="font-display text-2xl font-semibold text-shopfront">{t("sim.title")}</h1>
          <p className="text-sm text-ink/60">{t("sim.subtitle")}</p>
        </div>

        {/* simulated number (only when not logged in) */}
        {!isAuthed && (
          <label className="mb-3 flex items-center gap-2 text-xs text-ink/50">
            {t("sim.numberLabel")}:
            <input
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              className="rounded-lg border border-shopfront/15 bg-white px-2 py-1 text-xs text-ink"
            />
          </label>
        )}

        {/* phone chat */}
        <div className="overflow-hidden rounded-[1.8rem] border border-white/10 bg-[#0b141a] shadow-[var(--shadow-phone)]">
          <div className="flex items-center gap-3 bg-shopfront-700 px-4 py-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-marigold text-sm font-bold text-shopfront">दु</div>
            <div className="leading-tight">
              <p className="font-sans text-sm font-semibold text-paper">Dukaan Saathi</p>
              <p className="text-[11px] text-leaf">● {t("sim.online")}</p>
            </div>
          </div>

          <div ref={scrollRef} className="ledger-lines chat-scroll h-[420px] space-y-3 overflow-y-auto px-4 py-4">
            <AnimatePresence initial={false}>
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`flex ${m.side === "out" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[13px] leading-snug ${
                    m.side === "out"
                      ? "rounded-br-md bg-[#005c4b] text-paper"
                      : "rounded-bl-md bg-white text-ink"
                  } ${m.transcript ? "italic opacity-90" : ""}`}>
                    {m.text}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {busy && <TypingDots />}
            {recording && speech.listening && (
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[#005c4b]/60 px-3.5 py-2.5 text-[13px] italic leading-snug text-paper/90">
                  {speech.interim || t("sim.listening") || "Listening…"}
                  <span className="ml-1 inline-block animate-pulse">▋</span>
                </div>
              </div>
            )}
          </div>

          {/* sample chips */}
          <div className="flex flex-wrap gap-2 border-t border-white/10 px-3 pt-3">
            {samples.map((k) => (
              <button
                key={k}
                onClick={() => sendText(t(`sim.samples.${k}`))}
                disabled={busy}
                className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-medium text-paper/80 hover:bg-marigold hover:text-shopfront disabled:opacity-40"
              >
                {t(`sim.samples.${k}`)}
              </button>
            ))}
          </div>

          {/* input row */}
          <div className="flex items-center gap-2 p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendText()}
              placeholder={t("sim.typePlaceholder")}
              className="flex-1 rounded-full bg-white/10 px-4 py-2.5 text-sm text-paper placeholder:text-paper/30 focus:outline-none"
            />
            {input.trim() ? (
              <button onClick={() => sendText()} disabled={busy} className="grid h-10 w-10 place-items-center rounded-full bg-marigold text-shopfront disabled:opacity-40">
                <Send className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={recording ? stopRec : startRec}
                className={`grid h-10 w-10 place-items-center rounded-full ${recording ? "animate-pulse bg-terracotta text-paper" : "bg-marigold text-shopfront"}`}
                title={recording ? t("sim.stop") : t("sim.record")}
              >
                {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            )}
          </div>
        </div>

        <p className="mt-3 text-center text-xs text-ink/40">{t("sim.voiceHint")}</p>
      </div>
    </div>
  );
}
