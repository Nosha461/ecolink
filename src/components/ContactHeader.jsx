import { Link, useLocation } from "react-router-dom";
import LanguageSwitcher from "./LanguageSwitcher";
import { useI18n } from "../i18n/i18nContext";

function ContactHeader() {
  const location = useLocation();
  const { t } = useI18n();

  return (
    <nav className="navbar custom-navbar">
      <div className="container header-row">
        <Link className="brand-logo" to="/">
          <img src="/assets/logo.png" alt="EcoLink Logo" className="main-logo" />
        </Link>

        <ul className="nav-center-links">
          <li>
            <Link
              className={`nav-link ${location.pathname === "/" ? "active" : ""}`}
              to="/"
            >
              {t("common.home")}
            </Link>
          </li>

          <li>
            <Link
              className={`nav-link ${location.pathname === "/contact" ? "active" : ""}`}
              to="/contact"
            >
              {t("common.contactUs")}
            </Link>
          </li>

          <li>
            <Link
              className={`nav-link ${location.pathname === "/pricing" ? "active" : ""}`}
              to="/pricing"
            >
              {t("common.pricing")}
            </Link>
          </li>
        </ul>

        <div className="header-actions">
          <Link to="/login" className="login-btn">
            {t("common.login")}
          </Link>
          <LanguageSwitcher />
        </div>
      </div>
    </nav>
  );
}

export default ContactHeader;

