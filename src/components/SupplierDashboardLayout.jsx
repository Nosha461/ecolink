import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import LanguageSwitcher from "./LanguageSwitcher";
import { useSocket } from "../context/SocketProvider";
import { useI18n } from "../i18n/i18nContext";
import { clearAuthSession, logoutUser, refreshStoredUserProfile } from "../utils/authApi";
import { DEFAULT_PROFILE_IMAGE, getSupplierUser } from "../utils/supplierUser";

const DASHBOARD_ICON_PATH = "/assets/dashboard/";

const navItems = [
  { labelKey: "nav.dashboard", path: "/dashboard", adminPath: "/admin-dashboard", icon: `${DASHBOARD_ICON_PATH}dashboard.png` },
  { labelKey: "nav.requests", path: "/requests", icon: `${DASHBOARD_ICON_PATH}job-application.png` },
  { labelKey: "nav.listings", path: "/manage-listing", buyerPath: "/search-listing", icon: `${DASHBOARD_ICON_PATH}clipboard.png` },
  { labelKey: "nav.notifications", path: "/notifications", icon: `${DASHBOARD_ICON_PATH}3d-bell.png` },
  { labelKey: "nav.messages", path: "/chat", icon: `${DASHBOARD_ICON_PATH}tick.png` },
  { labelKey: "nav.profile", path: "/profile", icon: `${DASHBOARD_ICON_PATH}process.png` },
  { labelKey: "nav.support", path: "#", icon: `${DASHBOARD_ICON_PATH}technical-support.png` },
];

export function SupplierSidebar() {
  const location = useLocation();
  const { t } = useI18n();
  const [supplierUser, setSupplierUser] = useState(() => getSupplierUser());
  const isAdminArea = supplierUser.role === "Admin" || location.pathname.startsWith("/admin");

  useEffect(() => {
    let isMounted = true;
    const refreshUser = () => {
      if (isMounted) {
        setSupplierUser(getSupplierUser());
      }
    };

    window.addEventListener("ecolink:user-updated", refreshUser);
    window.addEventListener("storage", refreshUser);

    refreshStoredUserProfile().catch(() => {});

    return () => {
      isMounted = false;
      window.removeEventListener("ecolink:user-updated", refreshUser);
      window.removeEventListener("storage", refreshUser);
    };
  }, []);

  return (
    <aside className="dashboard-sidebar">
      <Link to="/" className="dashboard-brand" aria-label={t("nav.ecoLinkHome")}>
        <img src="/assets/logooo.png" alt="EcoLink" />
      </Link>

      <nav className="dashboard-nav" aria-label={t("nav.dashboardNavigation")}>
        {navItems.map((item) => {
          const itemPath =
            isAdminArea && item.adminPath
              ? item.adminPath
              : supplierUser.role === "Buyer" && item.buyerPath
                ? item.buyerPath
                : item.path;
          const isActive =
            itemPath !== "#" &&
            (location.pathname === itemPath ||
              ((itemPath === "/manage-listing" || itemPath === "/search-listing") &&
                (location.pathname === "/manage-listing" ||
                  location.pathname === "/listings" ||
                  location.pathname === "/search-listings" ||
                  location.pathname.startsWith("/manage-listing/") ||
                  location.pathname.startsWith("/edit-listing/"))) ||
              (itemPath === "/requests" && location.pathname.startsWith("/deal-details/")));

          return (
            <Link key={item.labelKey} to={itemPath} className={isActive ? "active" : ""}>
              <img className="dashboard-nav-icon" src={item.icon} alt="" aria-hidden="true" />
              <span>{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function SupplierProfile({ user }) {
  const [currentUser, setCurrentUser] = useState(() => user || getSupplierUser());
  const { unreadNotifications = 0 } = useSocket() || {};
  const { t } = useI18n();
  const navigate = useNavigate();
  const supplierUser = currentUser;
  const roleText =
    supplierUser.role === "Supplier"
      ? t("common.supplier")
      : supplierUser.role === "Admin"
        ? t("common.admin")
      : supplierUser.role === "Buyer"
        ? t("common.buyer")
        : t("common.unknownRole");

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch {
      // Logout should clear the local session even if the token is already expired.
    } finally {
      clearAuthSession();
      navigate("/login");
    }
  };

  useEffect(() => {
    setCurrentUser(user || getSupplierUser());
  }, [user]);

  useEffect(() => {
    const refreshUser = () => setCurrentUser(getSupplierUser());

    window.addEventListener("ecolink:user-updated", refreshUser);
    window.addEventListener("storage", refreshUser);

    refreshStoredUserProfile().catch(() => {});

    return () => {
      window.removeEventListener("ecolink:user-updated", refreshUser);
      window.removeEventListener("storage", refreshUser);
    };
  }, []);

  return (
    <div className="dashboard-user">
      <Link to="/notifications" className="dashboard-bell" aria-label={t("nav.notifications")}>
        <img src={`${DASHBOARD_ICON_PATH}3d-bell.png`} alt="" aria-hidden="true" />
        {unreadNotifications > 0 && (
          <span className="dashboard-bell-badge">
            {unreadNotifications > 99 ? "99+" : unreadNotifications}
          </span>
        )}
      </Link>
      {supplierUser.role === "Buyer" && (
        <Link to="/cart" className="dashboard-header-icon" aria-label={t("nav.cart")}>
          <i className="bi bi-cart3" aria-hidden="true" />
        </Link>
      )}
      <button type="button" className="dashboard-logout" onClick={handleLogout}>
        {t("common.logout")}
      </button>
      <img
        src={supplierUser.image}
        alt={supplierUser.fullName}
        onError={(event) => {
          event.currentTarget.src = DEFAULT_PROFILE_IMAGE;
        }}
      />
      <div>
        <strong>{supplierUser.fullName}</strong>
        <span>{roleText}</span>
      </div>
      <LanguageSwitcher compact />
    </div>
  );
}
