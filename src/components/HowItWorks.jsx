import { useI18n } from "../i18n/i18nContext";

export default function HowItWorks() {
  const { t } = useI18n();

  return (
    <section className="how-section" id="how-it-works">
      <div className="container how-grid">
        <div className="how-left">
          <div className="section-title-row section-left">
            <span className="title-line"></span>
            <div>
              <h2>{t("home.howTitle")}</h2>
              <p>{t("home.howSubtitle")}</p>
            </div>
          </div>
        </div>

        <div className="how-right">
          <div className="timeline">
            <div className="timeline-line"></div>

            <div className="timeline-item completed">
              <span className="circle">&#10003;</span>
              <div className="timeline-box">{t("home.registerBusiness")}</div>
            </div>

            <div className="timeline-item completed">
              <span className="circle">&#10003;</span>
              <div className="timeline-box">{t("home.listFindMaterials")}</div>
            </div>

            <div className="timeline-item completed">
              <span className="circle">&#10003;</span>
              <div className="timeline-box">{t("home.matchedInstantly")}</div>
            </div>

            <div className="timeline-item pending">
              <span className="circle"></span>
              <div className="timeline-box">{t("home.trackOptimize")}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

