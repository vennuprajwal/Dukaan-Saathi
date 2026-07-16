import { motion } from "motion/react";

export default function AboutPage() {
  return (
    <div className="space-y-8 pb-12">
      <div className="text-center space-y-4 pt-8">
        <div className="inline-grid h-16 w-16 place-items-center rounded-2xl bg-shopfront text-2xl font-bold text-marigold shadow-lg mx-auto">
          दु
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-shopfront">Dukaan Saathi</h1>
        <p className="text-ink/60 max-w-xl mx-auto">
          Your AI Business Partner
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="rounded-[1.5rem] bg-white p-6 shadow-sm ring-1 ring-black/5">
          <h2 className="font-display text-xl font-bold text-shopfront mb-3">Our Mission</h2>
          <p className="text-ink/70 leading-relaxed">
            Dukaan Saathi is an AI-powered business assistant designed to help Indian Kirana Stores manage sales, inventory, udhaar, reports and business growth using voice, AI and automation.
          </p>
        </section>
        
        <section className="rounded-[1.5rem] bg-gradient-to-br from-shopfront to-shopfront-700 text-white p-6 shadow-sm">
          <h2 className="font-display text-xl font-bold mb-3">Our Vision</h2>
          <p className="text-white/80 leading-relaxed">
            Empowering every small shopkeeper with modern AI technology while keeping the experience simple, affordable and accessible.
          </p>
        </section>
      </div>

      <section className="rounded-[1.5rem] bg-white p-6 shadow-sm ring-1 ring-black/5">
        <h2 className="font-display text-xl font-bold text-shopfront mb-4">Key Features</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            "Voice-first business management",
            "AI-powered insights",
            "Inventory management",
            "Udhaar tracking",
            "OCR notebook digitization",
            "Business analytics",
            "Multilingual support"
          ].map((feature, i) => (
            <div key={i} className="flex items-center gap-3 bg-paper px-4 py-3 rounded-xl border border-black/5">
              <span className="text-marigold font-bold text-lg leading-none">&bull;</span>
              <span className="text-sm font-medium text-ink/70">{feature}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[1.5rem] bg-white p-6 shadow-sm ring-1 ring-black/5">
        <h2 className="font-display text-xl font-bold text-shopfront mb-4">Built for modern retail teams</h2>
        <p className="text-ink/70 leading-relaxed">
          Dukaan Saathi helps stores move from manual bookkeeping to a more intelligent, reliable operating system without changing the way they already work.
        </p>
      </section>

      <footer className="text-center pt-8 border-t border-black/5 text-sm text-ink/50">
        <p>Built for India's growing retail businesses</p>
        <p className="mt-4 text-xs opacity-50">v1.0.0</p>
      </footer>
    </div>
  );
}
