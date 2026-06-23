import { Link } from "react-router-dom";
import { useI18n } from "../i18n/i18nContext";
import "./Pricing.css";

function Pricing() {
  const { t } = useI18n();
  const badges = [t("pricing.noHidden"), t("pricing.riskFree"), t("pricing.transparent")];

  const faqItems = [
    { id: "One", question: t("pricing.faq1Q"), answer: t("pricing.faq1A") },
    { id: "Two", question: t("pricing.faq2Q"), answer: t("pricing.faq2A") },
    { id: "Three", question: t("pricing.faq3Q"), answer: t("pricing.faq3A") },
    { id: "Four", question: t("pricing.faq4Q"), answer: t("pricing.faq4A") },
  ];

  return (
    <main className="pricing-page">
      <section className="pricing-hero position-relative">
        <div className="leaf-decor">
          <img src="/assets/leaf.pricing.png" alt="" aria-hidden="true" />
        </div>

        <div className="container">
          <div className="row justify-content-center">
            <div className="col-xl-9 col-lg-10 text-center">
              <h1 className="pricing-heading">{t("pricing.title")}</h1>

              <p className="pricing-subtitle">{t("pricing.subtitle")}</p>

              <div className="commission-card mx-auto">
                <h2 className="commission-title">
                  <span className="commission-rate">10%</span> {t("pricing.commission")}
                </h2>

                <ul className="commission-features list-unstyled mb-0">
                  {[t("pricing.securePayment"), t("pricing.noUpfront"), t("pricing.afterConfirmation"), t("pricing.noSubscription")].map((item) => (
                    <li key={item}>
                      <i className="bi bi-check-lg" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <Link to="/register" className="btn pricing-outline-btn start-btn">
                  {t("pricing.startNow")}
                </Link>

                <p className="commission-note mb-0">{t("pricing.note")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="example-section">
        <div className="container">
          <div className="row justify-content-center text-center">
            <div className="col-xl-10">
              <h2 className="section-title">{t("pricing.simpleExample")}</h2>

              <p className="example-text">{t("pricing.exampleText")}</p>

              <div className="example-badges">
                {badges.map((badge) => (
                  <span className="example-badge" key={badge}>
                    {badge}
                  </span>
                ))}
              </div>

              <p className="example-note mb-0">{t("pricing.exampleNote")}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="how-it-works-section">
        <div className="container">
          <div className="row">
            <div className="col-12 text-center">
              <h2 className="section-title">{t("pricing.howItWorks")}</h2>
            </div>
          </div>

          <div className="row g-4 justify-content-center how-grid">
            {[
              { image: "/assets/list-waste.png", title: t("pricing.step1Title"), text: t("pricing.step1Text") },
              { image: "/assets/search-connect.png", title: t("pricing.step2Title"), text: t("pricing.step2Text") },
              { image: "/assets/negotiate-confirm.png", title: t("pricing.step3Title"), text: t("pricing.step3Text") },
              { image: "/assets/secure-payment.png", title: t("pricing.step4Title"), text: t("pricing.step4Text") },
            ].map((step) => (
              <div className="col-md-6 col-lg-5" key={step.title}>
                <article className="work-step text-center">
                  <div className="work-image-wrap">
                    <img src={step.image} alt="" aria-hidden="true" className="img-fluid" />
                  </div>
                  <h3 className="work-step-title">{step.title}</h3>
                  <p className="work-step-text">{step.text}</p>
                </article>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="faq-section">
        <div className="container">
          <div className="row align-items-start faq-row g-4 g-lg-5">
            <div className="col-lg-4">
              <div className="faq-intro">
                <h2 className="faq-title">
                  {t("pricing.faqTitleA")}
                  <span>{t("pricing.faqTitleB")}</span>
                </h2>

                <p className="faq-subtext">{t("pricing.faqSubtitle")}</p>

                <Link to="/contact" className="btn pricing-outline-btn faq-contact-btn">
                  {t("common.contactUs")}
                </Link>
              </div>
            </div>

            <div className="col-lg-8">
              <div className="accordion custom-faq-accordion" id="pricingFaq">
                {faqItems.map((item, index) => (
                  <div className="accordion-item faq-item" key={item.id}>
                    <h2 className="accordion-header" id={`heading${item.id}`}>
                      <button
                        className={`accordion-button ${index !== 0 ? "collapsed" : ""}`}
                        type="button"
                        data-bs-toggle="collapse"
                        data-bs-target={`#collapse${item.id}`}
                        aria-expanded={index === 0 ? "true" : "false"}
                        aria-controls={`collapse${item.id}`}
                      >
                        {item.question}
                      </button>
                    </h2>

                    <div
                      id={`collapse${item.id}`}
                      className={`accordion-collapse collapse ${index === 0 ? "show" : ""}`}
                      aria-labelledby={`heading${item.id}`}
                      data-bs-parent="#pricingFaq"
                    >
                      <div className="accordion-body">{item.answer}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Pricing;

