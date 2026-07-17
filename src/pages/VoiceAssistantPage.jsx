import { useState } from "react";
import { Mic, Square, Sparkles, AlertCircle, Play, History, CheckCircle } from "lucide-react";
import { Card } from "./DashboardPage";
import { useOutletContext } from "react-router-dom";
import { useSpeech } from "../hooks/useSpeech";
import { api } from "../lib/api";
import { Waveform, ResultCard } from "../components/ui";

const MOCK_PROMPTS = {
  en: [
    { label: "Log Cash Sale", text: "Sold 5kg rice for 320 rupees cash" },
    { label: "Log Udhaar (Credit)", text: "Ravi owes me 500 rupees" },
    { label: "Record Expense", text: "Paid 150 rupees for tea expense" }
  ],
  hi: [
    { label: "नकद बिक्री दर्ज करें", text: "5 किलो चावल 320 रुपये में बेचा" },
    { label: "उधार दर्ज करें", text: "रवि के 500 रुपये बाकी हैं" },
    { label: "खर्च दर्ज करें", text: "चाय के लिए 150 रुपये खर्च किए" }
  ],
  te: [
    { label: "నగదు అమ్మకం", text: "5 కిలోల బియ్యం 320 రూపాయలకు అమ్మాను" },
    { label: "ఉధార్ (అప్పు)", text: "రవి నాకు 500 రూపాయలు బాకీ ఉన్నాడు" },
    { label: "ఖర్చు నమోదు", text: "టీ ఖర్చు కోసం 150 రూపాయలు చెల్లించాను" }
  ]
};

export default function VoiceAssistantPage() {
  const { data, load } = useOutletContext();
  const lang = data?.shop?.lang_pref || "en";
  
  const { listening, interim, start: startSpeech, stop: stopSpeech } = useSpeech(lang);
  
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [lastParsed, setLastParsed] = useState(null);

  const processVoiceCommand = async (text) => {
    if (!text.trim()) return;
    
    setProcessing(true);
    setError("");
    
    try {
      const res = await api.simMessage(text, null, lang);
      
      const newAction = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString(),
        transcript: text,
        reply: res.reply,
        intent: res.intent,
        parsed: res.parsed,
        success: res.intent !== "unknown"
      };
      
      setHistory(prev => [newAction, ...prev]);
      setLastParsed(newAction);
      
      // Refresh the dashboard stats
      await load();
    } catch (err) {
      setError(err.message || "Failed to process voice command");
    } finally {
      setProcessing(false);
    }
  };

  const handleMicToggle = async () => {
    if (listening) {
      stopSpeech();
      return;
    }
    
    setError("");
    try {
      const transcript = await startSpeech();
      if (transcript) {
        await processVoiceCommand(transcript);
      }
    } catch (err) {
      setError(err.message || "Failed to listen");
    }
  };

  const handleDemoClick = (text) => {
    processVoiceCommand(text);
  };

  const getRowsForIntent = (parsed) => {
    if (!parsed) return [];
    const rows = [];
    if (parsed.item) rows.push(["Item", parsed.item]);
    if (parsed.qty) rows.push(["Quantity", `${parsed.qty} ${parsed.unit || "unit"}`]);
    if (parsed.amount) rows.push(["Amount", `₹${parsed.amount}`]);
    if (parsed.party_name) rows.push(["Customer", parsed.party_name]);
    if (parsed.payment_type) rows.push(["Payment", parsed.payment_type]);
    if (parsed.category) rows.push(["Category", parsed.category]);
    if (parsed.note) rows.push(["Note", parsed.note]);
    return rows;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-shopfront flex items-center gap-2">
            <Mic className="h-6 w-6 text-terracotta" /> Voice Assistant
          </h1>
          <p className="text-ink/60 text-sm mt-1">
            Speak natural commands to update sales, manage udhaar, or record expenses.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-black/5 text-xs font-semibold shadow-sm">
          <span className="h-2 w-2 rounded-full bg-leaf"></span>
          <span>Language: <span className="uppercase text-leaf">{lang}</span></span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Interactive Mic control */}
        <div className="lg:col-span-2 space-y-6">
          <Card title="Always-On Voice Controller">
            <div className="flex flex-col items-center justify-center py-10 text-center relative overflow-hidden">
              {/* Mic Circle */}
              <div className="relative mb-8">
                {listening && (
                  <div className="absolute inset-0 rounded-full bg-terracotta/20 mic-pulse"></div>
                )}
                <button
                  onClick={handleMicToggle}
                  disabled={processing}
                  className={`w-28 h-28 rounded-full flex items-center justify-center relative shadow-xl transition-all duration-300 transform active:scale-95 ${
                    listening 
                      ? "bg-terracotta text-white hover:bg-terracotta/90" 
                      : processing 
                        ? "bg-ink/10 text-ink/30 cursor-not-allowed" 
                        : "bg-shopfront text-marigold hover:scale-105 hover:bg-shopfront/95"
                  }`}
                >
                  {listening ? (
                    <Square className="h-10 w-10 animate-pulse" fill="currentColor" />
                  ) : (
                    <Mic className="h-12 w-12" />
                  )}
                </button>
              </div>

              {/* Status & Live feedback */}
              <div className="space-y-3 px-4 max-w-lg">
                {listening ? (
                  <>
                    <h3 className="text-lg font-bold text-terracotta animate-pulse">Listening...</h3>
                    <p className="text-ink/70 italic bg-paper-deep/50 px-4 py-2.5 rounded-xl border border-black/5 min-h-[48px] flex items-center justify-center">
                      {interim || "Say something like: 2 kg sugar 100 rupees udhaar..."}
                    </p>
                    <div className="flex justify-center mt-2">
                      <Waveform tone="dark" bars={15} />
                    </div>
                  </>
                ) : processing ? (
                  <>
                    <h3 className="text-lg font-bold text-shopfront flex items-center justify-center gap-2">
                      <Sparkles className="h-5 w-5 text-marigold animate-spin" /> Processing Voice Command...
                    </h3>
                    <p className="text-ink/40 text-xs">Analyzing audio & updating database ledger...</p>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-bold text-shopfront">Tap the microphone to speak</h3>
                    <p className="text-ink/60 text-xs max-w-sm">
                      Dukaan Saathi will transcribe your speech and automatically deduct stock, update customer balances, and compute profits.
                    </p>
                  </>
                )}

                {error && (
                  <div className="flex items-center gap-2 text-terracotta bg-terracotta/10 px-4 py-2 rounded-xl text-xs justify-center">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Quick simulation prompts */}
          <Card title="Quick Test Commands (Simulator)">
            <p className="text-xs text-ink/50 mb-4">
              Don't want to speak out loud? Click any sample command below to simulate speaking it:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(MOCK_PROMPTS[lang] || MOCK_PROMPTS.en).map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleDemoClick(p.text)}
                  disabled={listening || processing}
                  className="flex items-start justify-between gap-3 text-left p-3.5 bg-white rounded-xl border border-black/5 hover:border-marigold/30 hover:bg-paper-deep/20 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-marigold">
                      {p.label}
                    </span>
                    <p className="text-[12px] font-medium text-shopfront leading-tight line-clamp-2">
                      "{p.text}"
                    </p>
                  </div>
                  <Play className="h-3.5 w-3.5 text-ink/30 group-hover:text-marigold shrink-0 mt-0.5" />
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column: Live Feed of Processed Actions */}
        <div className="space-y-6">
          <Card title="Extracted Action Result">
            {lastParsed ? (
              <div className="space-y-4">
                <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                  lastParsed.success 
                    ? "bg-leaf/5 border-leaf/20 text-leaf" 
                    : "bg-terracotta/5 border-terracotta/20 text-terracotta"
                }`}>
                  {lastParsed.success ? (
                    <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  )}
                  <div className="text-xs leading-normal">
                    <p className="font-bold">{lastParsed.success ? "Successfully Ledgered" : "Unrecognized Action"}</p>
                    <p className="opacity-80 text-ink mt-0.5">"{lastParsed.transcript}"</p>
                  </div>
                </div>

                {lastParsed.success && lastParsed.parsed && (
                  <ResultCard 
                    title={lastParsed.intent?.replace("_", " ")} 
                    rows={getRowsForIntent(lastParsed.parsed)} 
                  />
                )}

                <div className="p-3 bg-paper-deep/30 rounded-xl border border-black/5">
                  <span className="text-[10px] font-semibold uppercase text-ink/40 tracking-wider">Assistant Response</span>
                  <p className="text-xs text-shopfront font-medium mt-1 leading-relaxed">
                    {lastParsed.reply}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center text-ink/40">
                <Sparkles className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-xs">No command processed yet in this session.</p>
              </div>
            )}
          </Card>

          <Card title="Session Voice Log">
            {history.length > 0 ? (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 chat-scroll">
                {history.map((h) => (
                  <div 
                    key={h.id} 
                    className="p-2.5 bg-white rounded-lg border border-black/5 hover:bg-paper-deep/10 transition-colors flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-shopfront truncate">"{h.transcript}"</p>
                      <p className="text-[10px] text-ink/40 mt-0.5 flex items-center gap-1.5">
                        <span>{h.timestamp}</span>
                        <span>•</span>
                        <span className={`capitalize ${h.success ? "text-leaf" : "text-terracotta"}`}>
                          {h.intent?.replace("_", " ")}
                        </span>
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      h.success ? "bg-leaf/10 text-leaf" : "bg-terracotta/10 text-terracotta"
                    }`}>
                      {h.success ? "OK" : "Err"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-ink/40 justify-center py-6">
                <History className="h-4 w-4" />
                <span>No history available</span>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

