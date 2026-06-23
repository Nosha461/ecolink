import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { SupplierProfile, SupplierSidebar } from "../components/SupplierDashboardLayout";
import { useI18n } from "../i18n/i18nContext";
import { getApiErrorMessage } from "../utils/apiClient";
import { ACTIVE_CART_WASTE_ID_KEY, addCartItem, SYNC_ACCEPTED_REQUESTS_TO_CART_KEY } from "../utils/cartApi";
import { getCartDealMeta, getCartDealMetaByOrderId, getCartDealMetaByRequestId, saveCartDealMeta } from "../utils/cartDealMeta";
import { normalizeDealState } from "../utils/dealStatus";
import { getOrder } from "../utils/paymentApi";
import { resolveUploadedImageUrl } from "../utils/listingApi";
import { getSupplierUser } from "../utils/supplierUser";
import "./Dashboard.css";
import "./Request.css";
import "./DealDetails.css";
import { getPurchaseRequestStatus, updateRequestPageFlow } from "../utils/requestApi";

function getPaymentStatus(payload, normalizedState) {
  const rawPaymentStatus = String(
    payload?.paymentStatus ||
      payload?.payment?.status ||
      payload?.order?.paymentStatus ||
      ""
  )
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  if (rawPaymentStatus) {
    return rawPaymentStatus;
  }

  return normalizedState.paymentStatus;
}

function applySavedDealMeta(dealData) {
  const savedMeta =
    getCartDealMeta(dealData?.waste?.id) ||
    getCartDealMeta(dealData?.wasteId) ||
    getCartDealMetaByOrderId(dealData?.orderId) ||
    getCartDealMetaByRequestId(dealData?.requestId) ||
    getCartDealMetaByOrderId(dealData?.requestId);

  if (!savedMeta || savedMeta.paymentStatus !== "paid") {
    return dealData;
  }

  return {
    ...dealData,
    status: "completed",
    dealStatus: "completed",
    paymentStatus: "paid",
    canAddToCart: false,
    canPay: false,
  };
}

function normalizeDeal(payload, fallback = {}) {
  const order = payload?.order || payload || {};
  const waste = order.waste || payload?.waste || {};
  const buyer = order.buyer || payload?.buyer || {};
  const seller = order.seller || payload?.seller || {};
  const listing = payload?.listing || payload?.wasteListing || {};
  const shipping = payload?.shipping || {};
  const payment = payload?.payment || {};
  const deal = payload?.deal || {};
  const normalizedState = normalizeDealState({ order, deal, payment });
  const rawStatus = String(payload?.rawStatus || payload?.status || order.status || "").toLowerCase();
  const isPurchaseRequest = payload?.source === "purchase-request" || Boolean(payload?.requestId);
  const supplierConfirmed = Boolean(
    payload?.supplierConfirmed ||
      order.supplierConfirmed ||
      deal.supplierConfirmed ||
      rawStatus === "accepted" ||
      rawStatus === "confirmed"
  );
  const paymentStatus = getPaymentStatus(payload, normalizedState);
  const isPaid = paymentStatus === "paid" || normalizedState.orderStatus === "completed";
  const isReadyForCart = !isPaid && (isPurchaseRequest ? supplierConfirmed : normalizedState.canAddToCart);
  const requestDealStatus = (() => {
    if (isPaid) {
      return "completed";
    }

    if (supplierConfirmed) {
      return "approved";
    }

    if (rawStatus === "declined" || rawStatus === "rejected") {
      return "declined";
    }

    if (rawStatus === "cancelled" || rawStatus === "canceled") {
      return "canceled";
    }

    return "pending";
  })();
  const fallbackUnitPrice = Number(payload?.unitPrice || order.unitPrice || waste.price || 0);
  const quantity = Number(payload?.quantity || order.quantity || 0);

  return applySavedDealMeta({
    orderId: order._id || order.id || payload?.orderId || fallback.orderId || "",
    requestId: payload?.requestId || order.purchaseRequestId || (isPurchaseRequest ? payload?.id : "") || fallback.requestId || fallback.id || "",
    status: isPurchaseRequest ? payload.status || rawStatus || "pending" : normalizedState.orderStatus,
    paymentStatus,
    dealStatus: isPurchaseRequest ? requestDealStatus : normalizedState.dealStatus,
    canAddToCart: isReadyForCart,
    canPay: !isPaid && !isPurchaseRequest && normalizedState.canPay,
    transactionId: payment.transactionId || "",
    shippingStatus: shipping.status || "pending",
    shippingAddress: payload?.shippingAddress || shipping.address || order.shippingAddress || fallback.shippingAddress || "",
    quantity,
    unitPrice: fallbackUnitPrice,
    totalAmount: payload?.totalAmount || order.totalAmount || order.amount || quantity * fallbackUnitPrice,
    currency: payload?.currency || order.currency || waste.currency || "EGP",
    createdAt: payload?.createdAt || order.createdAt || "",
    waste: {
      id: payload?.wasteId || waste._id || waste.id || fallback.wasteId || "",
      title: payload?.wasteTitle || waste.title || waste.materialName || waste.name || fallback.wasteTitle || "",
      description:
        payload?.description ||
        payload?.message ||
        payload?.wasteDescription ||
        listing.description ||
        waste.description ||
        order.description ||
        fallback.description ||
        "",
      unit: payload?.unit || waste.unit || fallback.unit || "",
      image:
        payload?.image ||
        fallback.image ||
        resolveUploadedImageUrl(Array.isArray(waste.images) ? waste.images[0] : waste.image || waste.imageUrl, waste) ||
        "/assets/recycle.png",
    },
    buyerName: payload?.buyerName || buyer.name || buyer.factoryName || buyer.fullName || fallback.buyerName || "",
    sellerName: payload?.sellerName || seller.name || seller.factoryName || seller.fullName || fallback.sellerName || "",
    supplierConfirmed,
    buyerConfirmed: Boolean(payload?.buyerConfirmed || order.buyerConfirmed || deal.buyerConfirmed),
    negotiationStarted: Boolean(payload?.negotiationStarted || order.negotiationStarted || deal.status),
  });
}

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
    return t("dealDetails.dateUnavailable");
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return t("dealDetails.dateUnavailable");
  }

  return date.toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function DealDetails() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const routeDealRequest = location.state?.dealRequest || {};
  const user = getSupplierUser();
  const { language, t, optionLabel } = useI18n();
  const [deal, setDeal] = useState(null);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [actionMessage, setActionMessage] = useState({ type: "", text: "" });
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadDeal() {
      if (!orderId) {
        setStatus("error");
        setErrorMessage(t("dealDetails.missingId"));
        return;
      }

      try {
        setStatus("loading");
        setErrorMessage("");
        let data;

try {
  data = await getOrder(orderId);
} catch {
  data = await getPurchaseRequestStatus(orderId);
}

        if (isMounted) {
          setDeal(normalizeDeal(data, routeDealRequest));
          setStatus("ready");
        }
      } catch (error) {
        if (isMounted) {
          setDeal(null);
          setErrorMessage(getApiErrorMessage(error, t("dealDetails.loadError"), t));
          setStatus("error");
        }
      }
    }

    loadDeal();

    return () => {
      isMounted = false;
    };
  }, [orderId, t]);

  const timeline = useMemo(() => {
    const isCompleted = deal?.status === "completed" || deal?.dealStatus === "completed";
    const isPaid = deal?.paymentStatus === "paid" || isCompleted;
    const isDeclined = deal?.dealStatus === "declined" || deal?.status === "declined";
    const currentStep = isCompleted
      ? "completed"
      : isPaid
        ? "completed"
        : deal?.canAddToCart
          ? "cart"
          : isDeclined
            ? "supplierConfirm"
            : deal?.supplierConfirmed
              ? "cart"
              : "supplierConfirm";

    return [
      { key: "requestSent", done: Boolean(deal), current: currentStep === "requestSent", icon: "bi-send-check" },
      { key: "supplierConfirm", done: Boolean(deal?.supplierConfirmed), current: currentStep === "supplierConfirm", icon: "bi-person-check" },
      { key: "cart", done: Boolean(deal?.canAddToCart || isPaid), current: currentStep === "cart", icon: "bi-cart-check" },
      { key: "payment", done: isPaid, current: currentStep === "payment", icon: "bi-credit-card" },
      { key: "completed", done: isCompleted, current: currentStep === "completed", icon: "bi-check2-circle" },
    ];
  }, [deal]);

  const handleAddToCart = async () => {
    if (!deal?.canAddToCart) {
      setActionMessage({ type: "error", text: t("dealDetails.cartUnavailable") });
      return;
    }

    if (!deal?.waste.id) {
      setActionMessage({ type: "error", text: t("errors.wasteIdRequired") });
      return;
    }

    try {
      setIsAddingToCart(true);
      setActionMessage({ type: "", text: "" });
      await addCartItem({ wasteId: deal.waste.id, quantity: deal.quantity || 1 });
      sessionStorage.setItem(ACTIVE_CART_WASTE_ID_KEY, String(deal.waste.id));
      sessionStorage.setItem(SYNC_ACCEPTED_REQUESTS_TO_CART_KEY, "1");
      saveCartDealMeta({
        wasteId: deal.waste.id,
        orderId: deal.orderId,
        requestId: deal.requestId,
        status: deal.dealStatus,
      });
      window.dispatchEvent(new Event("ecolink:notifications-refresh"));
      setActionMessage({ type: "success", text: t("dealDetails.cartAdded") });
      navigate("/cart");
    } catch (error) {
      setActionMessage({
        type: "error",
        text: getApiErrorMessage(error, t("dealDetails.cartAddError"), t),
      });
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleSupplierAccept = async () => {
    const requestId = deal?.requestId || orderId;
    if (!requestId) {
      setActionMessage({ type: "error", text: t("dealDetails.loadError") });
      return;
    }

    try {
      setIsAccepting(true);
      setActionMessage({ type: "", text: "" });
      await updateRequestPageFlow(requestId, "supplierConfirm");
      setDeal((currentDeal) =>
        currentDeal
          ? {
              ...currentDeal,
              status: "confirmed",
              dealStatus: "approved",
              supplierConfirmed: true,
              canAddToCart: true,
            }
          : currentDeal
      );
      window.dispatchEvent(new Event("ecolink:requests-refresh"));
      window.dispatchEvent(new Event("ecolink:notifications-refresh"));
      setActionMessage({ type: "success", text: t("requests.flowMessages.supplierConfirm") });
    } catch (error) {
      setActionMessage({
        type: "error",
        text: getApiErrorMessage(error, t("requests.flowMessages.error"), t),
      });
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <main className="dashboard-shell deal-details-shell">
      <SupplierSidebar />

      <section className="deal-details-content">
        <header className="deal-details-topbar">
          <div>
            <Link to="/requests" className="deal-back-link">
              <i className="bi bi-chevron-left" aria-hidden="true" />
              {t("dealDetails.backToRequests")}
            </Link>
            <h1>{t("dealDetails.title")}</h1>
            <p>{user.role === "Supplier" ? t("dealDetails.supplierSubtitle") : t("dealDetails.subtitle")}</p>
          </div>

          <SupplierProfile user={user} />
        </header>

        {status === "loading" && <p className="deal-state">{t("dealDetails.loading")}</p>}
        {status === "error" && <p className="deal-state deal-state-error">{errorMessage}</p>}
        {actionMessage.text && (
          <p className={`requests-alert requests-alert-${actionMessage.type}`} aria-live="polite">
            {actionMessage.text}
          </p>
        )}

        {status === "ready" && deal && (
          <div className="deal-details-grid">
            <section className="deal-summary-panel">
              <img src={deal.waste.image} alt={deal.waste.title || t("listing.untitled")} />
              <div>
                <span className={`deal-status deal-status-${deal.dealStatus}`}>
                  {t(`dealDetails.dealStatus.${deal.dealStatus}`)}
                </span>
                <h2>{deal.waste.title || t("listing.untitled")}</h2>
                <p>{deal.waste.description || t("dealDetails.noDescription")}</p>
              </div>
            </section>

            <section className="deal-info-panel">
              <h2>{t("dealDetails.orderSummary")}</h2>
              <dl>
                <div>
                  <dt>{t("dealDetails.orderId")}</dt>
                  <dd>{deal.orderId || deal.requestId || t("dealDetails.notProvided")}</dd>
                </div>
                <div>
                  <dt>{t("listing.quantity")}</dt>
                  <dd>{deal.quantity} {optionLabel(deal.waste.unit) || deal.waste.unit}</dd>
                </div>
                <div>
                  <dt>{t("dealDetails.unitPrice")}</dt>
                  <dd>{formatAmount(deal.unitPrice, deal.currency, language, t)}</dd>
                </div>
                <div>
                  <dt>{t("dealDetails.totalAmount")}</dt>
                  <dd>{formatAmount(deal.totalAmount || deal.quantity * deal.unitPrice, deal.currency, language, t)}</dd>
                </div>
                <div>
                  <dt>{t("dealDetails.createdAt")}</dt>
                  <dd>{formatDate(deal.createdAt, language, t)}</dd>
                </div>
                <div>
                  <dt>{t("dealDetails.shippingAddress")}</dt>
                  <dd>{deal.shippingAddress || t("dealDetails.shippingPending")}</dd>
                </div>
                <div>
                  <dt>{t("dealDetails.dealStatusLabel")}</dt>
                  <dd>{t(`dealDetails.dealStatus.${deal.dealStatus}`)}</dd>
                </div>
                <div>
                  <dt>{t("dealDetails.paymentStatus")}</dt>
                  <dd>{t(`dealDetails.payment.${deal.paymentStatus}`)}</dd>
                </div>
              </dl>

              {user.role === "Supplier" && (
                <div className="deal-supplier-actions">
                  <Link to="/chat" className="deal-secondary-link">
                    <i className="bi bi-chat-dots" aria-hidden="true" />
                    {t("requests.openNegotiation")}
                  </Link>
                  {!deal.supplierConfirmed ? (
                    <button
                      type="button"
                      className="deal-payment-link"
                      onClick={handleSupplierAccept}
                      disabled={isAccepting}
                    >
                      {isAccepting ? t("requests.responding") : t("requests.acceptOffer")}
                    </button>
                  ) : (
                    <p className="deal-flow-note">{t("dealDetails.waitingForPayment")}</p>
                  )}
                </div>
              )}

              {user.role !== "Supplier" && deal.canAddToCart ? (
                <button
                  type="button"
                  className="deal-payment-link"
                  onClick={handleAddToCart}
                  disabled={isAddingToCart}
                >
                  {isAddingToCart ? t("listingDetails.addingToCart") : t("dealDetails.moveToCart")}
                </button>
              ) : user.role !== "Supplier" && deal.canPay ? (
                <Link to={`/payment/${deal.orderId}`} className="deal-payment-link">
                  {t("dealDetails.moveToPayment")}
                </Link>
              ) : user.role !== "Supplier" ? (
                <p className="deal-flow-note">{t("dealDetails.cartUnavailable")}</p>
              ) : null}
            </section>

            <section className="deal-timeline-panel">
              <h2>{t("dealDetails.timeline")}</h2>
              <div className="deal-timeline">
                {timeline.map((step) => (
                  <article
                    className={[step.done ? "done" : "", step.current ? "current" : ""].filter(Boolean).join(" ")}
                    key={step.key}
                  >
                    <span>
                      <i className={`bi ${step.icon}`} aria-hidden="true" />
                    </span>
                    <div>
                      <h3>{t(`dealDetails.steps.${step.key}.title`)}</h3>
                      <p>{t(`dealDetails.steps.${step.key}.body`)}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="deal-party-panel">
              <h2>{t("dealDetails.parties")}</h2>
              <div>
                <span>{t("dealDetails.buyerFactory")}</span>
                <strong>{deal.buyerName || t("dealDetails.notProvided")}</strong>
              </div>
              <div>
                <span>{t("dealDetails.supplierFactory")}</span>
                <strong>{deal.sellerName || t("dealDetails.notProvided")}</strong>
              </div>
              <div>
                <span>{t("dealDetails.paymentStatus")}</span>
                <strong>{t(`dealDetails.payment.${deal.paymentStatus}`)}</strong>
              </div>
              {deal.transactionId && (
                <div>
                  <span>{t("dealDetails.transactionId")}</span>
                  <strong>{deal.transactionId}</strong>
                </div>
              )}
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
