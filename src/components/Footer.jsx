import { useTranslation } from "react-i18next";

export default function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-shopfront/10 bg-paper-deep/50">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-5 py-10 sm:flex-row sm:px-8">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-shopfront font-display text-lg font-bold text-marigold">दु</span>
          <div className="leading-tight">
            <p className="font-display text-lg font-semibold text-shopfront">Dukaan Saathi</p>
            <p className="font-body text-xs text-ink/50">{t("footer.tagline")}</p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 ring-1 ring-black/5">
          <span className="font-sans text-xs font-medium text-ink/70">Trusted by modern retail teams</span>
        </div>
      </div>
      <div className="border-t border-shopfront/10 py-4 text-center">
        <p className="font-body text-xs text-ink/40">{t("footer.disclaimer")}</p>
      </div>
    </footer>
  );
}
