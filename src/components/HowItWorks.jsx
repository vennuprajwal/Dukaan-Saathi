import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { Mic, Camera, MessageSquare } from "lucide-react";
import {
  Section,
  Eyebrow,
  Reveal,
  PhoneShell,
  Bubble,
  VoiceNote,
  ResultCard,
  TypingDots,
} from "./ui";

const TABS = [
  { key: "voice", icon: Mic },
  { key: "photo", icon: Camera },
  { key: "text", icon: MessageSquare },
];

/* ---- Per-tab phone screens (illustrative visuals) ------------------------- */
function VoiceScreen() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setPhase((p) => (p + 1) % 4), [2000, 1500, 2000, 4000][phase]);
    return () => clearTimeout(timer);
  }, [phase]);
  return (
    <ScreenBody>
      <VoiceNote side="out" duration="0:04" />
      
      {phase >= 1 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {phase === 1 ? (
            <TypingDots />
          ) : (
            <Bubble side="in" className="border-l-4 border-l-leaf rounded-bl-sm">
              <span className="font-medium text-ink/80">"Sugar do kilo, assi rupaye, cash"</span>
            </Bubble>
          )}
        </motion.div>
      )}
      
      {phase >= 3 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <ResultCard title="Sale logged" rows={[["Item", "Sugar · 2 kg"], ["Amount", "₹80"], ["Payment", "Cash"]]} />
        </motion.div>
      )}
    </ScreenBody>
  );
}

function PhotoScreen() {
  const [scanned, setScanned] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setScanned((s) => !s), scanned ? 3200 : 2600);
    return () => clearTimeout(timer);
  }, [scanned]);
  return (
    <ScreenBody>
      <div className="relative overflow-hidden rounded-xl border border-black/10 dark:border-white/10 bg-[#fdf7e6] p-3 shadow-sm">
        <div className="ledger-lines absolute inset-0 opacity-70" />
        <p className="relative mb-1 text-[10px] font-semibold uppercase tracking-wide text-terracotta/70">Aaj — 5 July</p>
        <ul className="relative space-y-1.5 font-body text-[13px] text-ink/80">
          <li className="flex justify-between"><span style={{ fontFamily: "Fraunces" }} className="italic">Ramesh — chawal 2kg</span><span>₹500</span></li>
          <li className="flex justify-between"><span style={{ fontFamily: "Fraunces" }} className="italic">Sita — cheeni 1kg</span><span>₹45</span></li>
          <li className="flex justify-between"><span style={{ fontFamily: "Fraunces" }} className="italic">Amit — tel 1L</span><span>₹140</span></li>
        </ul>
        <div className="scan-line absolute inset-x-2 h-6 rounded bg-gradient-to-b from-marigold/0 via-marigold/40 to-marigold/0 shadow-[0_0_12px_rgba(245,166,35,0.6)]" />
      </div>
      {scanned && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <ResultCard title="3 entries read from photo" rows={[["Ramesh", "₹500 · udhaar"], ["Sita", "₹45 · cash"], ["Amit", "₹140 · cash"]]} />
        </motion.div>
      )}
    </ScreenBody>
  );
}

function TextScreen() {
  const [answered, setAnswered] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setAnswered((a) => !a), answered ? 3200 : 1600);
    return () => clearTimeout(timer);
  }, [answered]);
  return (
    <ScreenBody>
      <Bubble side="out">Aaj ka profit kitna hua?</Bubble>
      {answered ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Bubble side="in">📈 Aaj ka profit: <span className="font-semibold">₹1,240</span><br />Sales ₹6,890 · 34 orders. Best seller: Rice (12kg).</Bubble>
        </motion.div>
      ) : (
        <div className="flex items-center gap-1 pl-1">
          {[0, 0.2, 0.4].map((d) => (
            <span key={d} className="typing-dot h-1.5 w-1.5 rounded-full bg-paper/40" style={{ animationDelay: `${d}s` }} />
          ))}
        </div>
      )}
    </ScreenBody>
  );
}

function ScreenBody({ children }) {
  return (
    <div className="ledger-lines chat-scroll flex h-[calc(560px-60px)] flex-col gap-3 overflow-y-auto bg-[#0b141a]/95 px-3 py-4">
      {children}
    </div>
  );
}

const SCREENS = { voice: VoiceScreen, photo: PhotoScreen, text: TextScreen };

export default function HowItWorks() {
  const { t } = useTranslation();
  const [active, setActive] = useState("voice");
  const Screen = SCREENS[active];
  const TabIcon = TABS.find((x) => x.key === active).icon;

  return (
    <Section id="how">
      <Reveal>
        <Eyebrow>{t("how.eyebrow")}</Eyebrow>
        <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold leading-tight text-shopfront sm:text-4xl">
          {t("how.heading")}
        </h2>
      </Reveal>

      <div className="mt-8 flex flex-wrap gap-2.5">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={`rounded-full px-5 py-2.5 font-sans text-sm font-semibold transition-all tap-highlight-none ${
              active === tab.key
                ? "bg-shopfront text-paper shadow-[var(--shadow-card)]"
                : "bg-white dark:bg-shopfront text-ink/70 ring-1 ring-black/5 dark:ring-white/5 hover:ring-terracotta/30"
            }`}
          >
            {t(`how.${tab.key}.label`)}
          </button>
        ))}
      </div>

      <div className="mt-10 grid items-center gap-10 md:grid-cols-2">
        <AnimatePresence mode="wait">
          <motion.div key={active} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.35 }}>
            <h3 className="font-display text-2xl font-semibold text-shopfront sm:text-3xl">{t(`how.${active}.heading`)}</h3>
            <p className="mt-4 max-w-md font-body text-base leading-relaxed text-ink/70">{t(`how.${active}.body`)}</p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-xl border border-dashed border-terracotta/40 bg-white dark:bg-shopfront/60 px-4 py-3">
              <TabIcon className="h-4 w-4 shrink-0 text-terracotta" />
              <span className="font-body text-sm italic text-ink/70">{t(`how.${active}.example`)}</span>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-center md:justify-end">
          <AnimatePresence mode="wait">
            <motion.div key={active} initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -12, scale: 0.97 }} transition={{ duration: 0.4 }}>
              <PhoneShell>
                <Screen />
              </PhoneShell>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </Section>
  );
}
