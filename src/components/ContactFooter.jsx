import { Link } from "react-router-dom";
import { useI18n } from "../i18n/i18nContext";

function ContactFooter() {
  const { t } = useI18n();

  return (
    <footer className="site-footer">
      <div className="container text-center">
        <Link
          className="footer-brand d-inline-flex align-items-center justify-content-center text-decoration-none"
          to="/"
        >
          <img src="/assets/logo.png" alt="EcoLink Logo" className="footer-logo-img" />
        </Link>

        <div className="footer-links d-flex flex-wrap justify-content-center align-items-center gap-4">
          <Link to="/contact">
            <span className="arrow">↗</span> {t("common.contactUs")}
          </Link>
          <a href="#how-it-works">
            <span className="arrow">↗</span> {t("common.services")}
          </a>
          <a href="#about">
            <span className="arrow">↗</span> {t("common.aboutEcoLink")}
          </a>
        </div>

        <p className="copyright mb-0">{t("common.copyright")}</p>
      </div>
    </footer>
  );
}

export default ContactFooter;

