import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Mic, Send, Paperclip, ChevronDown, Square } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { api } from "../lib/api";
import { TypingDots, ResultCard } from "./ui";
import { useSpeech } from "../hooks/useSpeech";

const SUGGESTIONS = {
  en: [
    "Sold 5kg rice for ₹320",
    "Ravi owes me ₹500",
    "Bought 20kg sugar",
    "Show today's sales",
    "How much profit today?",
  ],
  hi: [
    "5 किलो चावल ₹320 में बेचा",
    "रवि के ₹500 बाकी हैं",
    "20 किलो चीनी खरीदी",
    "आज की सेल दिखाओ",
    "आज कितना प्रॉफिट हुआ?",
  ],
  te: [
    "5 కిలోల బియ్యం ₹320 కు అమ్మాను",
    "రవి నాకు ₹500 బాకీ ఉన్నాడు",
    "20 కిలోల చక్కెర కొన్నాను",
    "ఈ రోజు అమ్మకాలు చూపించు",
    "ఈ రోజు లాభం ఎంత?",
  ]
};

export default function AiChat({ onUpdateDashboard }) {
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const { supported: speechSupported, listening, interim, start: startSpeech, stop: stopSpeech } = useSpeech(i18n.resolvedLanguage?.slice(0, 2) || "en");

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, isThinking, interim]);

  const send = async (textOverride = null) => {
    const text = textOverride || input.trim();
    if (!text) return;
    
    setInput("");
    const newMsg = { id: Date.now().toString(), role: "user", text };
    setMessages((prev) => [...prev, newMsg]);
    setIsThinking(true);

    try {
      const lang = i18n.resolvedLanguage?.slice(0, 2) || "en";
      const res = await api.simMessage(text, null, lang);
      
      const aiMsg = { id: Date.now().toString() + "ai", role: "ai", text: res.reply };
      setMessages((prev) => [...prev, aiMsg]);
      
      if (res.intent && !["unknown", "help", "query_profit", "query_sales"].includes(res.intent)) {
        // Trigger dashboard refresh if data might have changed
        if (onUpdateDashboard) onUpdateDashboard();
      }
    } catch {
      setMessages((prev) => [...prev, { id: Date.now().toString() + "err", role: "ai", text: "I'm sorry, I couldn't process that right now.", isError: true }]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleMic = async () => {
    if (listening) return stopSpeech();
    if (!speechSupported) {
       setMessages((prev) => [...prev, { id: Date.now().toString() + "err", role: "ai", text: "Speech recognition is not supported in this browser.", isError: true }]);
       return;
    }
    try {
      const transcript = await startSpeech();
      if (transcript) send(transcript);
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsThinking(true);
    setMessages((prev) => [...prev, { id: Date.now().toString(), role: "user", text: "Uploaded notebook scan: " + file.name }]);
    try {
      const res = await api.simScan(file);
      if (res.entries) {
         await api.simScanApply(res.entries);
         setMessages((prev) => [...prev, { 
            id: Date.now().toString() + "ai", 
            role: "ai", 
            type: "scan_result",
            entries: res.entries,
            text: `I found ${res.entries.length} entries in the scan and logged them to the dashboard.`
         }]);
         if (onUpdateDashboard) onUpdateDashboard();
      }
    } catch {
      setMessages((prev) => [...prev, { id: Date.now().toString() + "err", role: "ai", text: "I couldn't read that image.", isError: true }]);
    } finally {
      setIsThinking(false);
      e.target.value = null;
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 grid h-14 w-14 place-items-center rounded-full bg-shopfront text-marigold shadow-2xl transition-transform hover:scale-105 active:scale-95"
      >
        <span className="font-display text-2xl font-bold">दु</span>
      </button>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-6 right-6 z-50 flex h-[600px] max-h-[85vh] w-[380px] max-w-[calc(100vw-48px)] flex-col overflow-hidden rounded-[2rem] bg-paper shadow-[0_20px_40px_rgb(0,0,0,0.12)] ring-1 ring-black/5 dark:ring-white/5"
    >
      {/* Header */}
      <div className="flex items-center justify-between bg-white dark:bg-shopfront px-5 py-4 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="relative grid h-10 w-10 place-items-center rounded-full bg-shopfront text-marigold">
            <span className="font-display text-lg font-bold">दु</span>
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-leaf"></span>
          </div>
          <div>
            <h3 className="font-sans text-sm font-semibold text-shopfront tracking-tight">Dukaan Saathi AI</h3>
            <p className="text-[11px] text-leaf font-medium">● Online</p>
          </div>
        </div>
        <button onClick={() => setIsOpen(false)} className="grid h-8 w-8 place-items-center rounded-full text-ink/40 hover:bg-paper hover:text-ink">
          <ChevronDown className="h-5 w-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-6 pb-2" ref={scrollRef}>
        <div className="flex flex-col gap-4">
          <AnimatePresence>
            {[{ id: "msg-0", role: "ai", text: t("sim.greeting") }, ...messages].map((m) => (
              <motion.div 
                key={m.id}
                initial={{ opacity: 0, scale: 0.95, originY: 1, originX: m.role === 'ai' ? 0 : 1 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed shadow-sm ${
                  m.role === "user" 
                    ? "rounded-br-sm bg-shopfront text-paper" 
                    : m.isError 
                      ? "rounded-bl-sm bg-terracotta/10 text-terracotta ring-1 ring-terracotta/20" 
                      : "rounded-bl-sm bg-white dark:bg-shopfront text-ink ring-1 ring-black/5 dark:ring-white/5"
                }`}>
                  {m.type === "scan_result" ? (
                    <div className="space-y-2">
                       <p>{m.text}</p>
                       <ResultCard 
                         title="Entries Extracted" 
                         rows={m.entries.slice(0, 3).map(e => [e.item || "Unknown", "₹" + e.amount])} 
                       />
                       {m.entries.length > 3 && <p className="text-[10px] text-ink/40">...and {m.entries.length - 3} more</p>}
                    </div>
                  ) : m.text}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {listening && interim && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-end">
               <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-shopfront-700 text-paper/80 px-4 py-2.5 text-[13px]">
                 {interim}
               </div>
            </motion.div>
          )}
          {isThinking && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
               <TypingDots />
            </motion.div>
          )}
        </div>
      </div>

      {/* Suggestions */}
      <div className="hide-scrollbar flex gap-2 overflow-x-auto px-5 py-2 mb-2">
        {(SUGGESTIONS[i18n.resolvedLanguage?.slice(0, 2)] || SUGGESTIONS.en).map((s) => (
          <button 
            key={s}
            onClick={() => send(s)}
            className="whitespace-nowrap rounded-full bg-white dark:bg-shopfront px-3 py-1.5 text-[11px] font-medium text-ink/60 shadow-sm ring-1 ring-black/5 dark:ring-white/5 transition-colors hover:bg-paper-deep hover:text-shopfront"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="bg-white dark:bg-shopfront p-4 pt-2">
        <form 
          onSubmit={(e) => { e.preventDefault(); send(); }}
          className="relative flex items-end gap-2 rounded-2xl bg-paper px-2 py-2 ring-1 ring-black/5 dark:ring-white/5 focus-within:ring-2 focus-within:ring-leaf/30 transition-all"
        >
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink/40 transition-colors hover:bg-white dark:bg-shopfront hover:text-shopfront">
            <Paperclip className="h-4 w-4" />
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={t("sim.typePlaceholder")}
            className="max-h-32 min-h-[40px] w-full resize-none bg-transparent py-2.5 text-[13px] text-ink placeholder:text-ink/40 outline-none"
            rows={1}
          />
          {input.trim() ? (
            <button type="submit" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-leaf text-white shadow-sm transition-transform hover:scale-105">
              <Send className="h-4 w-4 -ml-0.5" />
            </button>
          ) : (
            <button type="button" onClick={handleMic} className={`grid h-10 w-10 shrink-0 place-items-center rounded-full shadow-sm transition-all hover:scale-105 ${listening ? "bg-terracotta text-white animate-pulse" : "bg-shopfront text-marigold"}`}>
              {listening ? <Square className="h-3.5 w-3.5" fill="currentColor" /> : <Mic className="h-4 w-4" />}
            </button>
          )}
        </form>
        <div className="mt-2 text-center text-[10px] text-ink/30">
          AI can make mistakes. Check important numbers.
        </div>
      </div>
    </motion.div>
  );
}
