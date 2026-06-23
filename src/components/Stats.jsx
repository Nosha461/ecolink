import { useI18n } from "../i18n/i18nContext";

export default function Stats() {
  const { t } = useI18n();

  return (
    <section className="stats-section">
      <div className="home-container">
        <div className="section-title-row">
          <span className="title-line"></span>
          <h2>{t("home.statsTitle")}</h2>
        </div>

        <div className="stats-cards">
          <div className="stat-card">
            <div className="stat-icon">
              <img src="/assets/recycle.png" alt="Recycle icon" />
            </div>
            <h3>500+</h3>
            <p>
              {t("home.tonsRecycled")}
            </p>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <img src="/assets/networking.png" alt="Partners icon" />
            </div>
            <h3>120+</h3>
            <p>
              {t("home.activePartners")}
            </p>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <img src="/assets/reduction.png" alt="Cost reduction icon" />
            </div>
            <h3>35%</h3>
            <p>
              {t("home.costReduction")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

