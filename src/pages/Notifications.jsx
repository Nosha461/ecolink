import { useEffect, useMemo, useState } from "react";
import DashboardDropdown from "../components/DashboardDropdown";
import { SupplierProfile, SupplierSidebar } from "../components/SupplierDashboardLayout";
import { useSocket } from "../context/SocketProvider";
import { useI18n } from "../i18n/i18nContext";
import { getSupplierUser } from "../utils/supplierUser";
import { getApiErrorMessage } from "../utils/apiClient";
import {
  getNotifications,
  mergeNotifications,
  setNotificationReadStatus,
} from "../utils/notificationApi";
import "./Dashboard.css";
import "./Notifications.css";

const PAGE_SIZE = 6;
const supportsUnreadToggle = false;

const notificationFilters = [
  { value: "All", labelKey: "notifications.all" },
  { value: "Unread", labelKey: "notifications.unread" },
  { value: "Read", labelKey: "notifications.read" },
  { value: "Requests", labelKey: "notifications.requests" },
  { value: "Orders", labelKey: "notifications.orders" },
  { value: "Payments", labelKey: "notifications.payments" },
  { value: "Messages", labelKey: "notifications.messages" },
];

const typeIcons = {
  request: "bi-send-check",
  order: "bi-clipboard-check",
  payment: "bi-cash-coin",
  message: "bi-chat-dots",
  delete_item: "bi-x-circle",
  default: "bi-exclamation-circle",
};

function formatNotificationDate(value, language) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();

  if (isToday) {
    return date.toLocaleTimeString(language === "ar" ? "ar-EG" : "en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).replace(" ", "").toLowerCase();
  }

  return date.toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function matchesFilter(notification, filter) {
  if (filter === "Unread") {
    return !notification.isRead;
  }

  if (filter === "Read") {
    return notification.isRead;
  }

  if (filter === "Orders") {
    return notification.type === "order";
  }

  if (filter === "Requests") {
    return notification.type === "request";
  }

  if (filter === "Payments") {
    return notification.type === "payment";
  }

  if (filter === "Messages") {
    return notification.type === "message";
  }

  return true;
}

function getTranslatedNotificationValue(notification, field, t) {
  const key = notification[`${field}Key`];
  if (key) {
    return t(key, notification[`${field}Params`] || {});
  }

  return notification[field] || "";
}

function getNotificationTitle(notification, t) {
  return (
    getTranslatedNotificationValue(notification, "title", t) ||
    getTranslatedNotificationValue(notification, "body", t) ||
    t("notifications.newNotification")
  );
}

function getNotificationBody(notification, t) {
  return getTranslatedNotificationValue(notification, "body", t);
}

export default function Notifications() {
  const { language, t } = useI18n();
  const {
    incomingNotifications = [],
    consumeIncomingNotifications,
    refreshUnreadNotifications,
  } = useSocket() || {};
  const supplierUser = getSupplierUser();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("All");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadNotifications() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const data = await getNotifications();

        if (isMounted) {
          setNotifications(mergeNotifications(Array.isArray(data) ? data : [], []));
        }
      } catch (error) {
        if (isMounted) {
          setNotifications([]);
          setErrorMessage(getApiErrorMessage(error, t("notifications.loadError"), t));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadNotifications();
    window.addEventListener("ecolink:notifications-refresh", loadNotifications);
    const intervalId = window.setInterval(loadNotifications, 15000);

    return () => {
      isMounted = false;
      window.removeEventListener("ecolink:notifications-refresh", loadNotifications);
      window.clearInterval(intervalId);
    };
  }, [t]);

  useEffect(() => {
    if (!incomingNotifications.length) {
      return;
    }

    setNotifications((currentNotifications) =>
      mergeNotifications(incomingNotifications, currentNotifications)
    );
    consumeIncomingNotifications?.();
  }, [consumeIncomingNotifications, incomingNotifications]);

  const filteredNotifications = useMemo(
    () => notifications.filter((notification) => matchesFilter(notification, filter)),
    [filter, notifications]
  );

  const visibleNotifications = filteredNotifications.slice(0, visibleCount);
  const canLoadMore = visibleCount < filteredNotifications.length;

  const handleFilterChange = (nextFilter) => {
    setFilter(nextFilter);
    setVisibleCount(PAGE_SIZE);
    setSuccessMessage("");
    setIsFilterOpen(false);
  };

  const toggleReadStatus = async (notification) => {
    if (notification.isRead && !supportsUnreadToggle) {
      return;
    }

    const nextIsRead = !notification.isRead;
    const action = nextIsRead ? "read" : "unread";
    try {
      await setNotificationReadStatus(notification._id, nextIsRead);
      await refreshUnreadNotifications?.();
      setNotifications((currentNotifications) =>
        currentNotifications.map((item) =>
          item._id === notification._id ? { ...item, isRead: nextIsRead } : item
        )
      );
      setSuccessMessage(t("notifications.marked", { action: t(`notifications.${action}`) }));
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, t("notifications.updateError"), t));
    }
  };

  return (
    <main className="dashboard-shell notifications-shell">
      <SupplierSidebar />

      <section className="notifications-content">
        <header className="notifications-topbar">
          <div>
            <p className="notifications-greeting">{t("dashboard.welcome", { name: supplierUser.firstName })}</p>
          </div>

          <SupplierProfile user={supplierUser} />
        </header>

        <section className="notifications-heading">
          <div>
            <h1>{t("notifications.title")}</h1>
            <p>{t("notifications.subtitle")}</p>
          </div>

          <div className="notifications-filter">
            <DashboardDropdown
              id="notifications-filter"
              label={t("common.filter")}
              options={notificationFilters.map((option) => ({
                value: option.value,
                label: t(option.labelKey),
              }))}
              value={filter}
              isOpen={isFilterOpen}
              onToggle={() => setIsFilterOpen((current) => !current)}
              onSelect={handleFilterChange}
              onClose={() => setIsFilterOpen(false)}
            />
          </div>
        </section>

        {errorMessage && <p className="notifications-alert notifications-alert-error">{errorMessage}</p>}
        {successMessage && (
          <p className="notifications-alert notifications-alert-success">{successMessage}</p>
        )}

        <section className="notifications-list" aria-live="polite">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div className="notification-row notification-row-loading" key={`notification-loading-${index}`}>
                <span />
                <div />
                <strong />
              </div>
            ))
          ) : visibleNotifications.length > 0 ? (
            visibleNotifications.map((notification) => (
              <button
                type="button"
                className={`notification-row ${notification.isRead ? "notification-read" : ""}`}
                key={notification._id}
                onClick={() => toggleReadStatus(notification)}
              >
                <span className={`notification-icon notification-icon-${notification.type || "default"}`}>
                  <i className={`bi ${typeIcons[notification.type] || typeIcons.default}`} aria-hidden="true" />
                </span>
                <span className="notification-copy">
                  <strong>{getNotificationTitle(notification, t)}</strong>
                  {getNotificationBody(notification, t) && (
                    <small>{getNotificationBody(notification, t)}</small>
                  )}
                </span>
                <time dateTime={notification.createdAt || notification.time}>
                  {formatNotificationDate(notification.createdAt || notification.time, language)}
                </time>
              </button>
            ))
          ) : (
            <div className="notifications-empty">
              <i className="bi bi-bell" aria-hidden="true" />
              <h2>{t("notifications.emptyTitle")}</h2>
              <p>{t("notifications.emptyText")}</p>
            </div>
          )}
        </section>

        {!isLoading && canLoadMore && (
          <button
            type="button"
            className="notifications-load-more"
            onClick={() => setVisibleCount((currentCount) => currentCount + PAGE_SIZE)}
          >
            {t("notifications.loadMore")}
            <i className="bi bi-chevron-down" aria-hidden="true" />
          </button>
        )}
      </section>
    </main>
  );
}

