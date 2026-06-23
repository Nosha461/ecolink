import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SupplierProfile, SupplierSidebar } from "../components/SupplierDashboardLayout";
import { useSocket } from "../context/SocketProvider";
import { useI18n } from "../i18n/i18nContext";
import { getApiErrorMessage } from "../utils/apiClient";
import {
  ACTIVE_CART_WASTE_ID_KEY,
  addCartItem,
  getCart,
  SYNC_ACCEPTED_REQUESTS_TO_CART_KEY,
} from "../utils/cartApi";
import {
  deleteRequestPageRequest,
  getRequestPageRequests,
  updateRequestPageFlow,
} from "../utils/requestApi";
import { getSupplierUser } from "../utils/supplierUser";
import "./Dashboard.css";
import "./Request.css";

const REQUEST_META_ICONS = {
  quantity: "/assets/procurement.png",
  price: "/assets/best-price.png",
  date: "/assets/calendar.png",
  address: "/assets/placeholder.png",
};

function getCurrencyLabel(currency, t) {
  return String(currency || "").toUpperCase() === "EGP" ? t("common.egp") : currency || t("common.egp");
}

function formatAmount(value, currency, language, t) {
  const number = Number(value);
  const formatted = new Intl.NumberFormat(language === "ar" ? "ar-EG" : "en-US", {
    maximumFractionDigits: 0,
  }).format(Number.isFinite(number) ? number : 0);

  return `${formatted} ${getCurrencyLabel(currency, t)}`;
}

function formatDate(value, language, t) {
  if (!value) {
    return t("requests.dateUnavailable");
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return t("requests.dateUnavailable");
  }

  return date.toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function Request() {
  const navigate = useNavigate();
  const user = getSupplierUser();
  const { language, t, optionLabel } = useI18n();
  const { refreshUnreadNotifications } = useSocket() || {};
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [deletingId, setDeletingId] = useState("");
  const [flowActionId, setFlowActionId] = useState("");

  const isBuyer = user.role === "Buyer";

  useEffect(() => {
    let isMounted = true;

    async function loadRequests() {
      try {
        setStatus("loading");
        setMessage({ type: "", text: "" });
        const data = await getRequestPageRequests({ isBuyer });

        if (isMounted) {
          setRequests(data);
          setStatus("ready");
        }
      } catch (error) {
        if (isMounted) {
          setRequests([]);
          setMessage({
            type: "error",
            text: getApiErrorMessage(error, t("requests.loadError"), t),
          });
          setStatus("error");
        }
      }
    }

    loadRequests();
    window.addEventListener("ecolink:requests-refresh", loadRequests);

    return () => {
      isMounted = false;
      window.removeEventListener("ecolink:requests-refresh", loadRequests);
    };
  }, [isBuyer, t]);

  const stats = useMemo(() => {
    const pending = requests.filter((request) => request.status === "pending").length;
    const completed = requests.filter(
      (request) => request.status === "completed" || request.dealStatus === "approved"
    ).length;

    return { total: requests.length, pending, completed };
  }, [requests]);

  const handleDelete = async (requestId) => {
    const confirmed = window.confirm(t("requests.confirmDelete"));
    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(requestId);
      await deleteRequestPageRequest(requestId, { isBuyer });
      setRequests((current) => current.filter((request) => request.id !== requestId));
      setMessage({ type: "success", text: t("requests.deleteSuccess") });
      window.dispatchEvent(new Event("ecolink:notifications-refresh"));
      await refreshUnreadNotifications?.();
    } catch (error) {
      setMessage({
        type: "error",
        text: getApiErrorMessage(error, t("requests.deleteError"), t),
      });
    } finally {
      setDeletingId("");
    }
  };

  const handleFlowAction = async (requestId, action) => {
    try {
      setFlowActionId(`${requestId}:${action}`);
      const nextFlow = await updateRequestPageFlow(requestId, action);
      setRequests((current) =>
        current.map((request) => {
          if (request.id !== requestId) {
            return request;
          }

          const supplierConfirmed = Boolean(request.supplierConfirmed || nextFlow.supplierConfirmed);
          const buyerConfirmed = Boolean(request.buyerConfirmed || nextFlow.buyerConfirmed);
          const approved = supplierConfirmed && buyerConfirmed;

          return {
            ...request,
            ...nextFlow,
            supplierConfirmed,
            buyerConfirmed,
            negotiationStarted: Boolean(request.negotiationStarted || nextFlow.negotiationStarted),
            status: approved ? "confirmed" : nextFlow.status || request.status,
            dealStatus: approved ? "approved" : nextFlow.dealStatus || request.dealStatus,
          };
        })
      );
      setMessage({ type: "success", text: t(`requests.flowMessages.${action}`) });
      window.dispatchEvent(new Event("ecolink:notifications-refresh"));
      await refreshUnreadNotifications?.();
    } catch (error) {
      setMessage({
        type: "error",
        text: getApiErrorMessage(error, t("requests.flowMessages.error"), t),
      });
    } finally {
      setFlowActionId("");
    }
  };

  const handleMoveToCart = async (request) => {
    if (!request.wasteId) {
      setMessage({ type: "error", text: t("requests.cartMoveError") });
      return;
    }

    try {
      setFlowActionId(`${request.id}:cart`);
      setMessage({ type: "", text: "" });

      const cart = await getCart().catch(() => ({ items: [] }));
      const alreadyInCart = cart.items.some(
        (item) => String(item.wasteId) === String(request.wasteId)
      );

      if (!alreadyInCart) {
        await addCartItem({
          wasteId: request.wasteId,
          quantity: request.quantity || 1,
        });
      }

      sessionStorage.setItem(ACTIVE_CART_WASTE_ID_KEY, String(request.wasteId));
      sessionStorage.setItem(SYNC_ACCEPTED_REQUESTS_TO_CART_KEY, "1");
      window.dispatchEvent(new Event("ecolink:notifications-refresh"));
      await refreshUnreadNotifications?.();
      setMessage({ type: "success", text: t("requests.cartMoveSuccess") });
      navigate("/cart");
    } catch (error) {
      setMessage({
        type: "error",
        text: getApiErrorMessage(error, t("requests.cartMoveError"), t),
      });
    } finally {
      setFlowActionId("");
    }
  };

  return (
    <main className="dashboard-shell requests-shell">
      <SupplierSidebar />

      <section className="requests-content">
        <header className="requests-topbar">
          <div>
            <h1>{t("requests.title")}</h1>
            <p>{isBuyer ? t("requests.subtitleBuyer") : t("requests.subtitleSupplier")}</p>
          </div>

          <SupplierProfile user={user} />
        </header>

        <section className="requests-stats" aria-label={t("requests.summary")}>
          <article>
            <img src="/assets/request-total.png" alt="" aria-hidden="true" />
            <span>{t("requests.total")}</span>
            <strong>{stats.total}</strong>
          </article>
          <article>
            <img src="/assets/request-pending.png" alt="" aria-hidden="true" />
            <span>{t("requests.pending")}</span>
            <strong>{stats.pending}</strong>
          </article>
          <article>
            <img src="/assets/request-completed.png" alt="" aria-hidden="true" />
            <span>{t("requests.completed")}</span>
            <strong>{stats.completed}</strong>
          </article>
        </section>

        {message.text && (
          <p className={`requests-alert requests-alert-${message.type}`} aria-live="polite">
            {message.text}
          </p>
        )}

        <section className="requests-list" aria-busy={status === "loading"}>
          {status === "loading" && <p className="requests-state">{t("requests.loading")}</p>}

          {status !== "loading" && requests.length === 0 && (
            <div className="requests-empty">
              <i className="bi bi-clipboard2-check" aria-hidden="true" />
              <h2>{t("requests.emptyTitle")}</h2>
              <p>{isBuyer ? t("requests.emptyBuyer") : t("requests.emptySupplier")}</p>
              {isBuyer && (
                <Link to="/search-listing">{t("requests.browseListings")}</Link>
              )}
            </div>
          )}

          {requests.map((request) => {
            const actionId = request.requestId || request.id;
            const canSupplierRespond = !isBuyer && request.status === "pending";
            const canViewDeal = isBuyer;

            return (
            <article className="request-card" key={request.id}>
              <div className="request-card-icon">
                <img src={request.image || "/assets/recycling.png"} alt="" aria-hidden="true" />
              </div>

              <div className="request-card-main">
                <div className="request-card-heading">
                  <h2>{request.wasteTitle || t("listing.untitled")}</h2>
                  <span className={`request-status request-status-${request.status}`}>
                    {t(`requests.status.${request.status}`)}
                  </span>
                </div>

                <div className="request-meta-grid">
                  <span>
                    <img src={REQUEST_META_ICONS.quantity} alt="" aria-hidden="true" />
                    {request.quantity} {optionLabel(request.unit) || request.unit}
                  </span>
                  <span>
                    <img src={REQUEST_META_ICONS.price} alt="" aria-hidden="true" />
                    {formatAmount(request.totalAmount || request.unitPrice * request.quantity, request.currency, language, t)}
                  </span>
                  <span>
                    <img src={REQUEST_META_ICONS.date} alt="" aria-hidden="true" />
                    {formatDate(request.createdAt, language, t)}
                  </span>
                  <span>
                    <i className="bi bi-diagram-3" aria-hidden="true" />
                    {t(`requests.dealStatus.${request.dealStatus}`)}
                  </span>
                </div>

                {request.shippingAddress && (
                  <p className="request-address">
                    <img src={REQUEST_META_ICONS.address} alt="" aria-hidden="true" />
                    {request.shippingAddress}
                  </p>
                )}

                <div className="request-flow" aria-label={t("requests.flowTitle")}>
                  <span className={request.negotiationStarted ? "done" : ""}>
                    <i className="bi bi-chat-dots" aria-hidden="true" />
                    {t("requests.flow.requestSent")}
                  </span>
                  <span className={request.supplierConfirmed ? "done" : ""}>
                    <i className="bi bi-person-check" aria-hidden="true" />
                    {t("requests.flow.supplierConfirm")}
                  </span>
                  <span className={request.dealStatus === "approved" || request.dealStatus === "completed" ? "done" : ""}>
                    <i className="bi bi-cart-check" aria-hidden="true" />
                    {t("requests.flow.cart")}
                  </span>
                  <span className={request.dealStatus === "approved" || request.dealStatus === "completed" ? "done" : ""}>
                    <i className="bi bi-credit-card" aria-hidden="true" />
                    {t("requests.flow.payment")}
                  </span>
                </div>
              </div>

              <div className="request-actions">
                <Link to="/chat" className="request-secondary-action">
                  {t("requests.openNegotiation")}
                </Link>
                {canSupplierRespond && (
                  <>
                    <button
                      type="button"
                      className="request-primary-action"
                      onClick={() => handleFlowAction(actionId, "supplierConfirm")}
                      disabled={flowActionId === `${actionId}:supplierConfirm`}
                    >
                      {t("requests.acceptOffer")}
                    </button>
                    <button
                      type="button"
                      className="request-delete-action"
                      onClick={() => handleFlowAction(actionId, "declineRequest")}
                      disabled={flowActionId === `${actionId}:declineRequest`}
                    >
                      {t("requests.declineRequest")}
                    </button>
                  </>
                )}
                {canViewDeal && (
  <Link
    to={`/deal-details/${request.orderId || request.id}`}
    className="request-primary-action"
    state={{ dealRequest: request }}
  >
    {t("requests.viewDeal")}
  </Link>
)}
                {isBuyer && (request.dealStatus === "approved" || request.dealStatus === "completed") && (
                  <button
                    type="button"
                    className="request-payment-action"
                    onClick={() => handleMoveToCart(request)}
                    disabled={flowActionId === `${request.id}:cart`}
                  >
                    {flowActionId === `${request.id}:cart`
                      ? t("requests.movingToCart")
                      : t("requests.moveToCart")}
                  </button>
                )}
                {isBuyer && request.status === "pending" && (
                  <button
                    type="button"
                    className="request-delete-action"
                    onClick={() => handleDelete(request.id)}
                    disabled={deletingId === request.id}
                  >
                    {deletingId === request.id ? t("requests.deleting") : t("requests.cancelRequest")}
                  </button>
                )}
              </div>
            </article>
            );
          })}
        </section>
      </section>
    </main>
  );
}
