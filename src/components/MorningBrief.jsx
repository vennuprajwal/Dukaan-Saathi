import { motion } from "motion/react";
import { Sparkles, Target } from "lucide-react";

export default function MorningBrief({ data, money }) {
  if (!data?.health) return null;
  const { score, greeting, insight, nextGoal, todaysGoal } = data.health;
  
  const todayRevenue = data?.summary?.revenue || 0;
  const progress = todaysGoal > 0 ? Math.min(100, Math.round((todayRevenue / todaysGoal) * 100)) : 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="mb-6 rounded-3xl bg-gradient-to-br from-shopfront to-[#162f3d] p-6 text-white shadow-lg relative overflow-hidden"
    >
      {/* Decorative background elements */}
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-marigold/10 blur-3xl" />
      <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-leaf/10 blur-3xl" />
      
      <div className="relative z-10 flex flex-col md:flex-row gap-8 justify-between">
        {/* Left: Greeting & Insight */}
        <div className="flex-1 space-y-4">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-marigold" />
              {greeting || "Good Morning!"}
            </h2>
            <p className="text-white/70 mt-1 text-sm leading-relaxed max-w-lg">
              {insight || "Your business is looking steady today. Keep it up!"}
            </p>
          </div>
          
          <div className="inline-flex items-center gap-2 rounded-full bg-white dark:bg-shopfront/10 px-3 py-1.5 backdrop-blur-sm border border-white/10">
            <Target className="h-4 w-4 text-marigold" />
            <span className="text-sm font-medium text-white/90">
              AI Suggestion: <span className="text-white font-bold">{nextGoal}</span>
            </span>
          </div>
        </div>

        {/* Right: Health Score & Goals */}
        <div className="flex shrink-0 flex-row md:flex-col gap-6 md:gap-4 bg-black/20 rounded-2xl p-4 border border-white/5 backdrop-blur-md">
          {/* Health Score */}
          <div className="flex items-center gap-4">
            <div className="relative grid h-12 w-12 place-items-center">
              <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 36 36">
                <path className="text-white/10" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className={score > 70 ? "text-leaf" : score > 40 ? "text-marigold" : "text-terracotta"} strokeDasharray={`${score}, 100`} strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <span className="font-display font-bold text-sm">{score}</span>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/50 font-bold">Business Health</p>
              <p className="font-medium text-sm text-white">Score</p>
            </div>
          </div>
          
          <div className="hidden md:block h-px w-full bg-white dark:bg-shopfront/10" />
          <div className="block md:hidden w-px h-full bg-white dark:bg-shopfront/10" />

          {/* Daily Goal */}
          <div className="flex flex-col justify-center">
             <div className="flex justify-between items-end mb-1.5">
               <span className="text-[10px] uppercase tracking-wider text-white/50 font-bold">Today's Goal</span>
               <span className="text-xs font-bold">{progress}%</span>
             </div>
             <div className="h-2 w-32 bg-white dark:bg-shopfront/10 rounded-full overflow-hidden">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: `${progress}%` }}
                 transition={{ duration: 1, delay: 0.5 }}
                 className={`h-full rounded-full ${progress >= 100 ? 'bg-leaf' : 'bg-marigold'}`}
               />
             </div>
             <div className="flex justify-between mt-1">
               <span className="text-[10px] text-white/40">{money(todayRevenue)}</span>
               <span className="text-[10px] text-white/40">{money(todaysGoal)}</span>
             </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
