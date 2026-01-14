// src/lib/i18n.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

const resources = {
  en: { translation: { business: "Business" } },
  zh: { translation: { business: "业务" } },
  hi: { translation: { business: "व्यवसाय" } },
  es: { translation: { business: "Negocio" } },
  fr: { translation: { business: "Entreprise" } },
  ar: { translation: { business: "أعمال" } },
  bn: { translation: { business: "ব্যবসা" } },
  pt: { translation: { business: "Negócios" } },
  ru: { translation: { business: "Бизнес" } },
  id: { translation: { business: "Bisnis" } },
  ur: { translation: { business: "کاروبار" } },
  de: { translation: { business: "Geschäft" } },
  ja: { translation: { business: "ビジネス" } },
  sw: { translation: { business: "Biashara" } },
  ko: { translation: { business: "비즈니스" } },
  it: { translation: { business: "Azienda" } },
  tr: { translation: { business: "İş" } },
  vi: { translation: { business: "Kinh doanh" } },
  fa: { translation: { business: "کسب و کار" } },
  pa: { translation: { business: "ਵਪਾਰ" } },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false, // React already does escaping
    },
  });

export default i18n;