import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Paperclip, Mic, Square, Check, AlertCircle } from "lucide-react";
import { Card } from "./DashboardPage";
import { useOutletContext } from "react-router-dom";
import { useSpeech } from "../hooks/useSpeech";
import { api } from "../lib/api";
import { TypingDots, ResultCard } from "../components/ui";

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

const TUTORIALS = {
  en: [
    { title: "Log a sale", desc: "Type 'Sold 2kg sugar cash' or 'sold rice 120 rupees'" },
    { title: "Manage udhaar", desc: "Type 'Ravi owes ₹200' or 'Ravi repaid ₹100'" },
    { title: "Ask questions", desc: "Ask 'today's profit' or 'what is running low'" }
  ],
  hi: [
    { title: "बिक्री दर्ज करें", desc: "लिखें '2 किलो चीनी बेची नगद' या 'चावल ₹120 का बेचा'" },
    { title: "उधार संभालें", desc: "लिखें 'रवि के ₹200 बाकी हैं' या 'रवि ने ₹100 चुकाए'" },
    { title: "सवाल पूछें", desc: "पूछें 'आज का मुनाफा कितना है' या 'क्या सामान खत्म हो रहा है'" }
  ],
  te: [
    { title: "విక్రయాన్ని నమోదు", desc: "టైప్ చేయండి '2 కిలోల చక్కెర నగదు' లేదా 'బియ్యం ₹120 కి అమ్మాను'" },
    { title: "ఉధార్ నిర్వహణ", desc: "టైప్ చేయండి 'రవి నాకు ₹200 బాకీ' లేదా 'రవి ₹100 తిరిగి చెల్లించాడు'" },
    { title: "ప్రశ్నలు అడగండి", desc: "అడగండి 'ఈ రోజు లాభం ఎంత' లేదా 'ఏ ఏ సరుకులు అయిపోతున్నాయి'" }
  ]
};

export default function AiPage() {
  const { data, load, t } = useOutletContext();
  const lang = data?.shop?.lang_pref || "en";
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState("");
  const [aiMode, setAiMode] = useState("demo");
  const [scanningImage, setScanningImage] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const { supported: speechSupported, listening, interim, start: startSpeech, stop: stopSpeech } = useSpeech(lang);

  // Load greeting and fetch health/ai integration status on mount
  useEffect(() => {
    setMessages([
      { id: "greet", role: "ai", text: t("sim.greeting") || "Namaste! I am Dukaan Saathi. Let's manage your shop together." }
    ]);
    
    api.health().then((res) => {
      setAiMode(res.aiMode || "demo");
    }).catch(() => {});
  }, [t]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, isThinking, interim, scanningImage]);

  const send = async (textOverride = null) => {
    const text = textOverride || input.trim();
    if (!text) return;

    setInput("");
    setError("");
    const newMsg = { id: Date.now().toString(), role: "user", text };
    setMessages((prev) => [...prev, newMsg]);
    setIsThinking(true);

    try {
      const res = await api.simMessage(text, null, lang);
      const aiMsg = { 
        id: Date.now().toString() + "ai", 
        role: "ai", 
        text: res.reply,
        intent: res.intent,
        parsed: res.parsed 
      };
      setMessages((prev) => [...prev, aiMsg]);
      
      // Auto reload layout metrics
      await load();
    } catch {
      setError("Failed to fetch assistant response.");
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString() + "err", role: "ai", text: "I'm sorry, I encountered an issue parsing that request.", isError: true }
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleMic = async () => {
    if (listening) {
      stopSpeech();
      return;
    }
    if (!speechSupported) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }
    try {
      const transcript = await startSpeech();
      if (transcript) send(transcript);
    } catch (err) {
      setError(err.message || "Speech capturing failed");
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setScanningImage(true);
    setScanProgress(0);
    setMessages((prev) => [...prev, { id: Date.now().toString(), role: "user", text: "Uploaded notebook image: " + file.name }]);

    // Animate scan progress bar
    const progressInterval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 10;
      });
    }, 120);

    try {
      const res = await api.simScan(file);
      if (res.entries) {
        await api.simScanApply(res.entries);
        
        // Custom message with scan result card
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString() + "ai",
            role: "ai",
            type: "scan_result",
            entries: res.entries,
            text: `Successfully scanned notebook image! I extracted and applied ${res.entries.length} transactions to your ledger.`
          }
        ]);
        await load();
      }
    } catch {
      setError("Failed to parse the notebook image.");
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString() + "err", role: "ai", text: "Could not perform OCR on the uploaded image.", isError: true }
      ]);
    } finally {
      setScanningImage(false);
      e.target.value = null;
    }
  };

  const getRowsForIntent = (parsed) => {
    if (!parsed) return [];
    const rows = [];
    if (parsed.item) rows.push(["Item", parsed.item]);
    if (parsed.qty) rows.push(["Quantity", `${parsed.qty} ${parsed.unit || "unit"}`]);
    if (parsed.amount) rows.push(["Amount", `₹${parsed.amount}`]);
    if (parsed.party_name) rows.push(["Customer", parsed.party_name]);
    if (parsed.payment_type) rows.push(["Payment", parsed.payment_type]);
    return rows;
  };

  return (
    <div className="space-y-6 h-[calc(100vh-100px)] lg:h-[calc(100vh-60px)] flex flex-col pb-2">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="font-display text-2xl font-bold text-shopfront flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-marigold" /> Dukaan Saathi AI Workspace
          </h1>
          <p className="text-ink/60 text-sm mt-1">
            Talk or upload images to interact with your database, ledger, and analytics.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-black/5 text-xs font-semibold shadow-sm">
            <span className={`h-2.5 w-2.5 rounded-full ${aiMode === "live" ? "bg-leaf animate-pulse" : "bg-marigold"}`}></span>
            <span className="capitalize">{aiMode} AI Mode</span>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
        {/* Left Side: Message threads workspace */}
        <div className="lg:col-span-3 flex flex-col bg-white border border-black/5 rounded-[2rem] overflow-hidden shadow-[var(--shadow-card)]">
          {/* Messages display */}
          <div className="flex-1 overflow-y-auto px-6 py-6 ledger-lines chat-scroll space-y-4" ref={scrollRef}>
            {messages.map((m) => (
              <div 
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                  m.role === "user" 
                    ? "rounded-br-sm bg-shopfront text-paper font-medium" 
                    : m.isError 
                      ? "rounded-bl-sm bg-terracotta/10 text-terracotta border border-terracotta/20" 
                      : "rounded-bl-sm bg-white text-ink border border-black/5"
                }`}>
                  {m.type === "scan_result" ? (
                    <div className="space-y-3">
                      <p className="font-semibold text-leaf flex items-center gap-1.5">
                        <Check className="h-4 w-4" /> {m.text}
                      </p>
                      <ResultCard 
                        title="Ledger Entries Logged"
                        rows={m.entries.map(e => [e.item || "Unknown", `₹${e.amount} (${e.payment_type})`])}
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p>{m.text}</p>
                      {m.parsed && m.intent && !["unknown", "help"].includes(m.intent) && (
                        <div className="mt-2 border-t border-black/5 pt-2">
                          <ResultCard 
                            title={m.intent.replace("_", " ")} 
                            rows={getRowsForIntent(m.parsed)} 
                            tone="leaf"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {scanningImage && (
              <div className="flex justify-start">
                <div className="max-w-[75%] rounded-2xl rounded-bl-sm bg-white text-ink border border-black/5 p-4 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-leaf border-t-transparent animate-spin rounded-full"></div>
                    <span className="text-xs font-semibold text-leaf">Scanning Notebook Scan ({scanProgress}%)</span>
                  </div>
                  <div className="w-48 h-1.5 bg-paper rounded-full overflow-hidden">
                    <div className="h-full bg-leaf transition-all duration-150" style={{ width: `${scanProgress}%` }}></div>
                  </div>
                </div>
              </div>
            )}

            {isThinking && (
              <div className="flex justify-start">
                <TypingDots />
              </div>
            )}

            {listening && interim && (
              <div className="flex justify-end">
                <div className="max-w-[75%] rounded-2xl rounded-br-sm bg-shopfront-700 text-paper/80 px-4 py-3 text-sm italic">
                  {interim}
                </div>
              </div>
            )}
          </div>

          {/* Quick pills suggestions */}
          <div className="hide-scrollbar flex gap-2 overflow-x-auto px-6 py-2.5 bg-paper-deep/30 border-t border-black/5 shrink-0">
            {(SUGGESTIONS[lang] || SUGGESTIONS.en).map((s) => (
              <button 
                key={s}
                onClick={() => send(s)}
                disabled={isThinking || listening}
                className="whitespace-nowrap rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-ink/60 hover:text-shopfront hover:border-marigold/40 border border-black/5 hover:bg-marigold/5 transition-all shadow-sm disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Chat entry console */}
          <div className="p-4 bg-white border-t border-black/5 shrink-0">
            <form 
              onSubmit={(e) => { e.preventDefault(); send(); }}
              className="relative flex items-end gap-2.5 rounded-2xl bg-paper px-3 py-2.5 border border-black/5 focus-within:border-leaf/30 transition-all focus-within:ring-2 focus-within:ring-leaf/10"
            >
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                disabled={isThinking || listening}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink/40 hover:bg-white hover:text-shopfront hover:shadow-sm transition-all disabled:opacity-50"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Type a message or describe a transaction..."
                className="max-h-24 min-h-[40px] w-full resize-none bg-transparent py-2 text-sm text-ink placeholder:text-ink/40 outline-none"
                rows={1}
              />
              {input.trim() ? (
                <button type="submit" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-leaf text-white shadow-md hover:scale-105 transition-all">
                  <Send className="h-4.5 w-4.5 -ml-0.5" />
                </button>
              ) : (
                <button 
                  type="button" 
                  onClick={handleMic} 
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-full shadow-md hover:scale-105 transition-all ${
                    listening ? "bg-terracotta text-white animate-pulse" : "bg-shopfront text-marigold"
                  }`}
                >
                  {listening ? <Square className="h-3.5 w-3.5" fill="currentColor" /> : <Mic className="h-4.5 w-4.5" />}
                </button>
              )}
            </form>
            {error && (
              <div className="flex items-center gap-1.5 text-terracotta text-xs mt-2 justify-center">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Informative sidebar */}
        <div className="hidden lg:block lg:col-span-1 space-y-6 overflow-y-auto custom-scrollbar pr-1">
          <Card title="Quick Cheat Sheet">
            <p className="text-xs text-ink/50 leading-relaxed mb-4">
              Here are commands and questions you can ask Dukaan Saathi AI to manage your shop ledger:
            </p>
            <div className="space-y-4">
              {(TUTORIALS[lang] || TUTORIALS.en).map((t, idx) => (
                <div key={idx} className="p-3 bg-paper rounded-xl border border-black/5 text-xs">
                  <span className="font-bold text-shopfront block mb-0.5">{t.title}</span>
                  <span className="text-ink/60 leading-normal block italic">"{t.desc}"</span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Active Integrations">
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-black/5">
                <span className="text-ink/50 font-medium">Text Parsing</span>
                <span className="font-bold text-leaf">Active (Claude)</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-black/5">
                <span className="text-ink/50 font-medium">Voice (STT)</span>
                <span className="font-bold text-leaf">Active (Speech API)</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-black/5">
                <span className="text-ink/50 font-medium">Khata OCR</span>
                <span className="font-bold text-leaf">Active (Local)</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-ink/50 font-medium">WhatsApp Sync</span>
                <span className="font-bold text-ink/40">Demo Channel</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

