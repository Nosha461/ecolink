import { useEffect, useMemo, useState } from "react";
import { I18nContext } from "./i18nContext";
import en from "./en.json";
import ar from "./ar.json";

const translations = { en, ar };
const languageDirections = { en: "ltr", ar: "rtl" };

function getNestedValue(source, key) {
  return key.split(".").reduce((value, part) => value?.[part], source);
}

function interpolate(value, params = {}) {
  return String(value).replace(/\{\{(\w+)\}\}/g, (_, name) => params[name] ?? "");
}

function getInitialLanguage() {
  const savedLanguage = localStorage.getItem("EcoLinkLanguage");
  return savedLanguage === "ar" ? "ar" : "en";
}

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage);

  useEffect(() => {
    const direction = languageDirections[language];
    localStorage.setItem("EcoLinkLanguage", language);
    document.documentElement.lang = language;
    document.documentElement.dir = direction;
    document.body.dir = direction;
  }, [language]);

  const value = useMemo(() => {
    const t = (key, params) => {
      const selected = getNestedValue(translations[language], key);
      const fallback = getNestedValue(translations.en, key);
      return interpolate(selected ?? fallback ?? key, params);
    };

    const tChoice = (baseKey, count, params = {}) => {
      const suffix = Number(count) === 1 ? "one" : "other";
      return t(`${baseKey}_${suffix}`, { ...params, count });
    };

    return {
      language,
      direction: languageDirections[language],
      isRtl: language === "ar",
      setLanguage: (nextLanguage) => setLanguageState(nextLanguage === "ar" ? "ar" : "en"),
      toggleLanguage: () => setLanguageState((current) => (current === "ar" ? "en" : "ar")),
      t,
      tChoice,
      optionLabel: (valueToTranslate) => t(`options.${valueToTranslate}`),
    };
  }, [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
