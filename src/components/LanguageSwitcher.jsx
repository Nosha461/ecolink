import { useI18n } from "../i18n/i18nContext";

export default function LanguageSwitcher({ compact = false }) {
  const { language, setLanguage, t } = useI18n();

  return (
    <div className={`language-switcher ${compact ? "language-switcher-compact" : ""}`} aria-label={t("common.language")}>
      <button
        type="button"
        className={language === "en" ? "active" : ""}
        onClick={() => setLanguage("en")}
        aria-pressed={language === "en"}
      >
        EN
      </button>
      <button
        type="button"
        className={language === "ar" ? "active" : ""}
        onClick={() => setLanguage("ar")}
        aria-pressed={language === "ar"}
      >
        AR
      </button>
    </div>
  );
}

