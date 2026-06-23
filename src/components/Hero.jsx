import { Link } from "react-router-dom";
import { useI18n } from "../i18n/i18nContext";

export default function Hero() {
  const { isRtl, t } = useI18n();

  return (
    <section className="hero" id="home">
      <div className="home-container hero-content">
        <div className="hero-text">
          <h1>
            {t("home.heroTitleBefore")} <span>{t("home.heroTitleHighlight")}</span>
            <br />
            {t("home.heroTitleAfter")}
          </h1>

          <p>{t("home.heroText")}</p>

          <Link to="/register" className="outline-btn">{t("common.getStarted")}</Link>

          <img
            src={isRtl ? "/assets/leaf-bigar.PNG" : "/assets/leaf-left.png"}
            alt=""
            className="leaf leaf-left"
            aria-hidden="true"
          />
          <img src="/assets/leaf-top.png" alt="leaf" className="leaf leaf-top" />
        </div>

        <div className="hero-image-wrapper">
          <img
            src="/assets/recycle-hero.png"
            alt="Recycling"
            className="hero-image"
          />
          <img
            src="/assets/leaf-small-left.png"
            alt="leaf"
            className="floating-leaf floating-left"
          />
          <img
            src="/assets/leaf-small-right.png"
            alt="leaf"
            className="floating-leaf floating-right"
          />
          <img
            src="/assets/leaf-top-center.png"
            alt="leaf"
            className="floating-leaf top-center-leaf"
          />
        </div>
      </div>
    </section>
  );
}

