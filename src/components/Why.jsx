import { useI18n } from "../i18n/i18nContext";

export default function Why() {
  const { t } = useI18n();

  return (
    <section className="why-section">
      <div className="home-container">
        <h2 className="why-title">{t("home.whyTitle")}</h2>

        <div className="why-cards">
          <div className="why-card">
            <div className="why-image">
              <img src="/assets/factoryfull.jpeg" alt="Factory" />
            </div>

            <div className="why-content">
              <div className="why-icon">
                <img src="/assets/eco-factory.png" alt="Factory icon" />
              </div>
              <h3>{t("home.forFactories")}</h3>
              <ul>
                <li>{t("home.factoryPoint1")}</li>
                <li>{t("home.factoryPoint2")}</li>
                <li>{t("home.factoryPoint3")}</li>
              </ul>
            </div>
          </div>

          <div className="why-card">
            <div className="why-image">
              <img src="/assets/recyclefull.jpeg" alt="Recycler" />
            </div>

            <div className="why-content">
              <div className="why-icon">
                <img src="/assets/facility.png" alt="Facility icon" />
              </div>
              <h3>{t("home.forRecyclers")}</h3>
              <ul>
                <li>{t("home.recyclerPoint1")}</li>
                <li>{t("home.recyclerPoint2")}</li>
                <li>{t("home.recyclerPoint3")}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

