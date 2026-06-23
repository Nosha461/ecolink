import { useI18n } from "../i18n/i18nContext";

export default function About() {
  const { t } = useI18n();

  return (
    <section className="about-section" id="about">
      <div className="home-container">
        <div className="section-title-row about-title-row">
          <span className="title-line"></span>
          <h2>{t("home.aboutTitle")}</h2>
        </div>

        <div className="about-top-box">
          <div className="about-top-image">
            <img src="/assets/about-trash.png" alt="Recycling Bin" />
          </div>

          <div className="about-top-text">
            <p>{t("home.aboutFirst")}</p>
          </div>
        </div>

        <div className="about-bottom-box">
          <div className="about-bottom-text">
            <p>{t("home.aboutSecond")}</p>
          </div>

          <div className="about-bottom-image">
            <img src="/assets/reuse-box.png" alt="Reuse" />
          </div>
        </div>

        <p className="about-small-text">
          {t("home.aboutSmall")}
        </p>
      </div>
    </section>
  );
}

