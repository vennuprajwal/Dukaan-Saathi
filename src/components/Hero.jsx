import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { PlayCircle, ArrowRight, Sparkles } from "lucide-react";
import { ResultCard, TypingDots } from "./ui";

function HeroDashboardMock() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timings = [1500, 2000, 1500, 3000];
    const t = setTimeout(() => setStep((s) => (s + 1) % 4), timings[step] ?? 2000);
    return () => clearTimeout(t);
  }, [step]);

  return (
    <div className="relative w-full max-w-[540px] rounded-[1.5rem] border border-black/5 bg-white shadow-[0_24px_60px_-15px_rgba(16,185,129,0.15)] overflow-hidden">
      {/* Fake Browser Bar */}
      <div className="flex h-10 items-center gap-2 border-b border-black/5 bg-paper px-4">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-terracotta/80" />
          <div className="h-2.5 w-2.5 rounded-full bg-marigold/80" />
          <div className="h-2.5 w-2.5 rounded-full bg-leaf/80" />
        </div>
      </div>
      
      {/* Fake Dashboard Body */}
      <div className="flex h-[400px] bg-paper-deep/30 p-4">
        {/* Main Content */}
        <div className="flex-1 space-y-4 pr-4">
          <div className="h-8 w-32 rounded-lg bg-black/5" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-24 rounded-xl bg-white shadow-sm ring-1 ring-black/5" />
            <div className="h-24 rounded-xl bg-white shadow-sm ring-1 ring-black/5" />
          </div>
          <div className="h-40 rounded-xl bg-white shadow-sm ring-1 ring-black/5" />
        </div>
        
        {/* Floating AI Sidebar */}
        <div className="relative flex w-[220px] flex-col rounded-xl bg-white shadow-lg ring-1 ring-black/5 overflow-hidden">
          <div className="flex items-center gap-2 border-b border-black/5 bg-shopfront px-3 py-3 text-paper">
             <span className="grid h-6 w-6 place-items-center rounded bg-leaf text-xs font-bold text-white">दु</span>
             <span className="text-xs font-medium tracking-wide">Dukaan Saathi AI</span>
          </div>
          <div className="flex-1 p-3 space-y-3 bg-paper/50">
             {step >= 1 && (
               <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex justify-end">
                 <div className="max-w-[85%] rounded-xl rounded-tr-sm bg-shopfront px-3 py-2 text-[11px] text-paper">
                   Sold 2kg Rice and 1 packet milk to Ramesh
                 </div>
               </motion.div>
             )}
             {step === 2 && (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                 <TypingDots />
               </motion.div>
             )}
             {step >= 3 && (
               <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex justify-start">
                 <div className="max-w-[95%]">
                   <ResultCard
                    title="Sale Logged"
                    tone="leaf"
                    rows={[["Item", "Rice (2kg)"], ["Party", "Ramesh"], ["Amount", "₹140"]]}
                   />
                 </div>
               </motion.div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Hero() {
  const { t } = useTranslation();

  return (
    <section id="top" className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-leaf/5 to-paper" />

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-10 sm:px-8 md:grid-cols-2 md:gap-8 md:pb-28 md:pt-16">
        <div>
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-leaf/25 bg-paper px-3 py-1 font-sans text-xs font-medium text-leaf"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {t("hero.badge")}
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="mt-6 font-display text-4xl font-semibold leading-[1.1] tracking-tight text-shopfront sm:text-5xl md:text-[3.4rem]"
          >
            {t("hero.titleA")}<span className="text-leaf">{t("hero.titleB")}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-6 max-w-md font-body text-base leading-relaxed text-ink/70 sm:text-lg"
          >
            {t("hero.subhead")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-8 flex flex-wrap items-center gap-4"
          >
            <Link
              to="/login"
              className="group inline-flex items-center gap-2 rounded-full bg-shopfront px-7 py-3.5 font-sans text-sm font-semibold text-paper shadow-lg transition-transform hover:-translate-y-0.5 hover:opacity-90"
            >
              <PlayCircle className="h-5 w-5 text-marigold" />
              {t("hero.ctaPrimary")}
            </Link>
            <a
              href="#how"
              className="inline-flex items-center gap-2 rounded-full border border-shopfront/20 px-6 py-3.5 font-sans text-sm font-semibold text-shopfront transition-colors hover:bg-shopfront hover:text-paper hover:shadow-md"
            >
              {t("hero.ctaSecondary")}
              <ArrowRight className="h-4 w-4" />
            </a>
          </motion.div>
        </div>

        <div className="flex justify-center md:justify-end">
          <div className="relative md:sticky md:top-24">
            <div className="absolute inset-0 -z-10 scale-110 rounded-[3rem] bg-gradient-to-tr from-leaf/10 to-marigold/10 blur-2xl" />
            <motion.div
              initial={{ opacity: 0, y: 30, rotate: 2 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <HeroDashboardMock />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
