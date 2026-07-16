import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, ArrowRight } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

export default function SplashPage() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const splashKey = "dukaan_splash_seen_v2";

  useEffect(() => {
    // Check if user has already seen the splash sequence
    if (localStorage.getItem(splashKey) === "true") {
      // Directly show final CTA step
      setStep(7);
      return;
    }

    // Animation Sequence Timeline
    const timeline = [
      { step: 1, time: 500 },   // Logo reveal
      { step: 2, time: 1500 },  // Shutter opens
      { step: 3, time: 3000 },  // Sign drops
      { step: 4, time: 3800 },  // AI Spark
      { step: 5, time: 4500 },  // Dukaan Saathi Text
      { step: 6, time: 5500 },  // Subtitles
      { step: 7, time: 6500 },  // CTA
    ];

    const timeouts = timeline.map((t) =>
      setTimeout(() => setStep(t.step), t.time)
    );

    return () => timeouts.forEach(clearTimeout);
  }, [navigate]);

  const handleFinish = () => {
    localStorage.setItem(splashKey, "true");
    navigate("/login");
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0a0a0a] text-white">
      {/* Background Glow */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: step >= 1 ? 0.15 : 0 }}
        transition={{ duration: 2 }}
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-marigold via-[#0a0a0a] to-[#0a0a0a]"
      />

      {/* Skip Button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: step > 0 && step < 7 ? 0.6 : 0 }}
        onClick={handleFinish}
        className="absolute right-6 top-6 z-50 rounded-full px-4 py-2 text-sm font-medium transition-colors hover:bg-white/10 hover:text-white"
      >
        Skip &rarr;
      </motion.button>

      <div className="relative z-10 flex flex-col items-center">
        {/* Kirana Store Illustration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: step >= 1 ? 1 : 0, scale: step >= 1 ? 1 : 0.9 }}
          transition={{ duration: 0.8 }}
          className="relative mb-12 h-32 w-32"
        >
          {/* Main Shop Body */}
          <div className="absolute inset-0 rounded-t-2xl border-4 border-white/20 bg-black shadow-[0_0_30px_rgba(245,158,11,0.1)]">
            {/* Shelves & Items (hidden behind shutter) */}
            <div className="absolute inset-x-2 bottom-0 top-6 flex flex-col gap-2 overflow-hidden px-2 pt-2">
              <motion.div 
                animate={{ opacity: step >= 2 ? 1 : 0.2 }} 
                className="h-1.5 w-full bg-white/20 rounded-full" 
              />
              <motion.div 
                animate={{ opacity: step >= 2 ? 1 : 0.2 }} 
                className="flex gap-2"
              >
                <div className="h-4 w-4 bg-terracotta rounded-sm" />
                <div className="h-4 w-6 bg-marigold rounded-sm" />
                <div className="h-4 w-3 bg-leaf rounded-sm" />
              </motion.div>
              <motion.div 
                animate={{ opacity: step >= 2 ? 1 : 0.2 }} 
                className="h-1.5 w-full bg-white/20 rounded-full" 
              />
            </div>

            {/* Shutter */}
            <motion.div
              initial={{ height: "85%" }}
              animate={{ height: step >= 2 ? "0%" : "85%" }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              className="absolute bottom-0 left-0 right-0 origin-top bg-white/10 backdrop-blur-md border-t border-white/20"
              style={{
                backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(255,255,255,0.05) 4px, rgba(255,255,255,0.05) 8px)"
              }}
            />
          </div>

          {/* Awning */}
          <div className="absolute -left-2 -right-2 top-0 flex h-6 overflow-hidden rounded-t-lg z-10">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`h-full flex-1 ${i % 2 === 0 ? "bg-marigold" : "bg-terracotta"} rounded-b-full shadow-lg`} />
            ))}
          </div>

          {/* Hanging Sign */}
          <AnimatePresence>
            {step >= 3 && (
              <motion.div
                initial={{ rotate: -90, originX: 0.5, originY: 0, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ type: "spring", damping: 10, stiffness: 100, duration: 0.8 }}
                className="absolute top-5 left-1/2 -ml-8 flex flex-col items-center z-20"
              >
                <div className="h-2 w-0.5 bg-white/40" />
                <div className="rounded border border-marigold/30 bg-[#1a1a1a] px-2 py-0.5 shadow-lg">
                  <span className="text-[6px] font-bold uppercase tracking-widest text-marigold whitespace-nowrap">Dukaan Saathi</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* AI Spark */}
          <AnimatePresence>
            {step >= 4 && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0 }}
                animate={{ opacity: 1, y: -20, scale: 1 }}
                transition={{ duration: 0.8, type: "spring" }}
                className="absolute left-1/2 top-1/2 -ml-4 -mt-4 grid h-8 w-8 place-items-center rounded-full bg-white shadow-[0_0_20px_rgba(255,255,255,0.8)]"
              >
                <Sparkles className="h-4 w-4 text-shopfront" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Text Sequence */}
        <div className="h-40 text-center">
          <AnimatePresence mode="wait">
            {step === 5 && (
              <motion.h1
                key="title"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="font-display text-4xl font-bold tracking-tight text-white"
              >
                Dukaan Saathi
              </motion.h1>
            )}
            
            {step === 6 && (
              <motion.div
                key="subtitles"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                <motion.p 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xl font-medium text-marigold"
                >
                  Your AI Business Partner
                </motion.p>
                <motion.p 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-white/60"
                >
                  Built for Every Kirana Store
                </motion.p>
              </motion.div>
            )}

            {step >= 7 && (
              <motion.div
                key="cta"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center space-y-8 mt-4"
              >
                <div className="space-y-1 text-lg font-medium text-white/80">
                  <p>From Traditional Business</p>
                  <p>To Intelligent Business</p>
                  <p className="text-marigold">Powered by AI</p>
                </div>

                <div className="flex space-x-4">
                  <Link to="/login" className="group relative inline-flex items-center gap-3 rounded-full bg-white px-8 py-4 text-base font-bold text-shopfront transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.3)]">Login</Link>
                  <Link to="/register" className="group relative inline-flex items-center gap-3 rounded-full bg-white px-8 py-4 text-base font-bold text-shopfront transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.3)]">Register</Link>
                </div>
                
                <div className="text-xs font-medium text-white/40 pt-4">
                  <p>Built for modern retail operations</p>
                  <p>From manual workflows to intelligent growth</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
