import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";

const LANGS = [
  { code: "en", short: "EN" },
  { code: "hi", short: "हिं" },
  { code: "te", short: "తె" },
];

/* Compact 3-way language toggle. Persists via i18next languagedetector. */
export default function LanguageSwitcher({ className = "", tone = "light" }) {
  const { i18n } = useTranslation();
  const current = (i18n.resolvedLanguage || "en").slice(0, 2);

  const base =
    tone === "dark"
      ? "text-paper opacity-70 hover:opacity-100"
      : "text-ink opacity-60 hover:opacity-100 hover:text-shopfront";
  const activeCls =
    tone === "dark" ? "bg-marigold text-shopfront" : "bg-shopfront text-paper opacity-100";

  return (
    <div
      className={`inline-flex items-center gap-0.5 rounded-full border ${
        tone === "dark" ? "border-white/15" : "border-shopfront/15"
      } p-0.5 ${className}`}
    >
      <Languages
        className={`ml-1.5 mr-0.5 h-3.5 w-3.5 ${tone === "dark" ? "text-paper opacity-50" : "text-ink opacity-40"}`}
      />
      {LANGS.map((l) => (
        <button
          key={l.code}
          onClick={() => i18n.changeLanguage(l.code)}
          className={`rounded-full px-2 py-1 font-sans text-xs font-semibold transition-colors tap-highlight-none ${
            current === l.code ? activeCls : base
          }`}
          aria-pressed={current === l.code}
        >
          {l.short}
        </button>
      ))}
    </div>
  );
}
