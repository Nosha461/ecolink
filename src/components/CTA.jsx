import { Link } from "react-router-dom";
import { useI18n } from "../i18n/i18nContext";

export default function CTA() {
  const { t } = useI18n();

  return (
    <section className="cta-section" id="pricing">
      <div className="home-container cta-content">
        <h2>{t("home.ctaTitle")}</h2>
        <p>{t("home.ctaText")}</p>

        <div className="cta-buttons">
          <Link to="/register" className="filled-btn">{t("common.getStarted")}</Link>
          <Link to="/contact" className="outline-btn">{t("common.contactUs")}</Link>
        </div>
      </div>
    </section>
  );
}

