import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { SupplierProfile, SupplierSidebar } from "../components/SupplierDashboardLayout";
import { getSupplierUser } from "../utils/supplierUser";
import { useI18n } from "../i18n/i18nContext";
import { getApiErrorMessage } from "../utils/apiClient";
import { calculateCommissionBreakdown } from "../utils/commission";
import { normalizeDealState } from "../utils/dealStatus";
import { getListing, resolveUploadedImageUrl } from "../utils/listingApi";
import { getMyOrders, getOrder, markOrderPaid } from "../utils/paymentApi";
import { markCartDealMetaPaid } from "../utils/cartDealMeta";
import "./Payment.css";

const PAYMENT_DETAIL_ICONS = {
  location: "/assets/placeholder.png",
  price: "/assets/best-price.png",
  quantity: "/assets/procurement.png",
  sustainability: "/assets/recycling.png",
};

const emptyCheckout = {
  order: {
    _id: "",
    quantity: 0,
    unitPrice: 0,
    totalAmount: 0,
    currency: "EGP",
  },
  payment: {
    method: "card",
    status: "pending",
  },
  waste: {
    title: "",
    price: 0,
    currency: "EGP",
    quantity: 0,
    unit: "",
    description: "",
    images: [],
    sellerName: "",
    location: "",
  },
};

const initialCard = {
  name: "",
  expiry: "",
  number: "",
  cvv: "",
};

const initialCheckoutDetails = {
  shippingAddress: "",
};

function normalizeOrder(payload, fallbackWaste = emptyCheckout.waste) {
  const order = payload?.order || payload || emptyCheckout.order;
  const rawWaste = order?.waste || payload?.waste || payload?.wasteId;
  const orderWaste = rawWaste && typeof rawWaste === "object" ? rawWaste : {};
  const fallbackImages = fallbackWaste?.existingImages || fallbackWaste?.images || [];
  const orderImages = orderWaste?.existingImages || orderWaste?.images || [];
  const waste = {
    ...fallbackWaste,
    ...orderWaste,
    existingImages: orderWaste.existingImages || fallbackWaste?.existingImages || fallbackImages,
    images:
      Array.isArray(orderImages) && orderImages.some((image) => String(image || "").trim() && String(image).trim() !== "undefined")
        ? orderImages
        : fallbackImages,
  };
  const payment = payload?.payment || emptyCheckout.payment;
  const deal = payload?.deal || {};
  const normalizedState = normalizeDealState({ order, deal, payment });
  const seller = order?.seller || waste?.factory || {};
  const sellerName = seller?.name || waste?.sellerName || "";
  const sellerFactoryId = seller?._id || seller?.id || waste?.factoryId || waste?.ownerFactoryId || "";
  const location = [seller?.city, seller?.address].filter(Boolean).join(",") || waste?.location || "";

  return {
    order,
    payment: {
      ...payment,
      status: normalizedState.paymentStatus,
    },
    dealStatus: normalizedState.dealStatus,
    canPay: normalizedState.canPay,
    waste: {
      ...emptyCheckout.waste,
      ...waste,
      sellerName,
      sellerFactoryId,
      location,
    },
  };
}

function getOrderWasteId(payload) {
  const order = payload?.order || payload || {};
  const waste = order?.waste || payload?.waste || payload?.wasteId;

  if (typeof waste === "string") {
    return waste;
  }

  return waste?._id || waste?.id || order?.wasteId || "";
}

function normalizeListingCheckout(listing) {
  const location = [listing.area, listing.city, listing.address].filter(Boolean).join(", ");

  return {
    order: {
      ...emptyCheckout.order,
      quantity: Number(listing.quantity || 0),
      unitPrice: Number(listing.price || 0),
      totalAmount: Number(listing.price || 0),
      currency: "EGP",
    },
    payment: emptyCheckout.payment,
    waste: {
      ...emptyCheckout.waste,
      _id: listing.id,
      title: listing.materialName,
      price: Number(listing.price || 0),
      currency: "EGP",
      quantity: Number(listing.quantity || 0),
      unit: listing.unit,
      description: listing.description,
      images: listing.existingImages || [],
      sellerName: "",
      sellerFactoryId: listing.ownerFactoryId || listing.ownerUserId || "",
      location,
      shippingAddress: listing.address || location,
    },
  };
}

function formatAmount(value, language) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return new Intl.NumberFormat(language === "ar" ? "ar-EG" : "en-US", { maximumFractionDigits: 0 }).format(number);
}

function getOrderImage(waste) {
  const imageCandidates = [
    waste?.existingImages,
    waste?.images,
    waste?.image,
    waste?.imageUrl,
    waste?.thumbnail,
    waste?.wasteImage,
  ];
  const image = imageCandidates
    .flatMap((candidate) => (Array.isArray(candidate) ? candidate : [candidate]))
    .find(Boolean);
  const resolvedImage = resolveUploadedImageUrl(image, waste);

  if (!resolvedImage) {
    return "/assets/dashboard/materials-plastic.png";
  }

  return resolvedImage;
}

function validateCheckout(card, checkoutDetails) {
  const errors = {};
  const digits = card.number.replace(/\D/g, "");
  const cvvDigits = card.cvv.replace(/\D/g, "");

  if (!checkoutDetails.shippingAddress.trim()) {
    errors.shippingAddress = "errors.shippingAddressRequired";
  }

  if (!card.name.trim()) {
    errors.name = "payment.nameRequired";
  }

  if (digits.length < 12) {
    errors.number = "payment.validCard";
  }

  if (!/^\d{2}\s*\/\s*\d{2,4}$/.test(card.expiry.trim())) {
    errors.expiry = "payment.expiryFormat";
  }

  if (cvvDigits.length < 3) {
    errors.cvv = "payment.cvvRequired";
  }

  return errors;
}

function getPaymentFieldError(errorKeyOrMessage, t) {
  const knownPaymentErrors = {
    "Name is required.": "payment.nameRequired",
    "Enter a valid card number.": "payment.validCard",
    "Use MM / YY or MM / YYYY.": "payment.expiryFormat",
    "CVV is required.": "payment.cvvRequired",
  };

  const translationKey = knownPaymentErrors[errorKeyOrMessage] || errorKeyOrMessage;
  return translationKey?.startsWith("payment.") || translationKey?.startsWith("errors.")
    ? t(translationKey)
    : translationKey;
}

function getPaymentLoadError(error, t) {
  const backendMessage = String(
    error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      ""
  ).trim();

  if (error?.response?.status === 404 || backendMessage.toLowerCase() === "not found") {
    return t("payment.noOrderFound");
  }

  return getApiErrorMessage(error, t("payment.loadOrderError"), t);
}

export default function Payment() {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const listingId = searchParams.get("listingId") || "";
  const navigate = useNavigate();
  const { language, t } = useI18n();
  const user = getSupplierUser();
  const [checkout, setCheckout] = useState(emptyCheckout);
  const [checkoutDetails, setCheckoutDetails] = useState(initialCheckoutDetails);
  const [card, setCard] = useState(initialCard);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    let isMounted = true;

    async function loadOrder() {
      try {
        setIsLoading(true);
        setMessage({ type: "", text: "" });

        if (orderId) {
          const order = await getOrder(orderId);
          const wasteId = getOrderWasteId(order);
          const listing = wasteId ? await getListing(wasteId).catch(() => null) : null;
          if (isMounted) {
            const normalizedOrder = normalizeOrder(order, listing || emptyCheckout.waste);
            setCheckout(normalizedOrder);
            setCheckoutDetails({
              shippingAddress:
                order?.shipping?.address === "Not provided" || order?.shipping?.address === "Pending buyer entry"
                  ? ""
                  : order?.shipping?.address || "",
            });
          }
          return;
        }

        if (listingId) {
          const listing = await getListing(listingId);
          if (isMounted) {
            const normalizedCheckout = listing ? normalizeListingCheckout(listing) : emptyCheckout;
            setCheckout(normalizedCheckout);
            setCheckoutDetails({
              shippingAddress:
                normalizedCheckout.waste.shippingAddress === "Not provided"
                  ? ""
                  : normalizedCheckout.waste.shippingAddress || "",
            });
            if (!listing) {
              setMessage({ type: "error", text: t("payment.noOrderFound") });
            }
          }
          return;
        }

        const orders = await getMyOrders();
        const pendingOrder = orders.find((item) => item.status === "pending") || orders[0];

        if (pendingOrder && isMounted) {
          const normalizedOrder = normalizeOrder(pendingOrder);
          setCheckout(normalizedOrder);
          setCheckoutDetails({
            shippingAddress:
              pendingOrder?.shipping?.address === "Not provided" ||
              pendingOrder?.shipping?.address === "Pending buyer entry"
                ? ""
                : pendingOrder?.shipping?.address || "",
          });
        } else if (isMounted) {
          setMessage({ type: "error", text: t("payment.noOrderFound") });
        }
      } catch (error) {
        if (isMounted) {
          setMessage({
            type: "error",
            text: getPaymentLoadError(error, t),
          });
          setCheckout(emptyCheckout);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadOrder();

    return () => {
      isMounted = false;
    };
  }, [listingId, orderId, t]);

  const totals = useMemo(() => {
    const price = Number(checkout.order?.totalAmount || checkout.order?.unitPrice || checkout.waste?.price || 0);
    const breakdown = calculateCommissionBreakdown(price);

    return {
      price: breakdown.originalAmount,
      serviceFee: breakdown.commissionAmount,
      supplierAmount: breakdown.supplierAmount,
      total: breakdown.totalAmount,
      currency: checkout.order?.currency || checkout.waste?.currency || "EGP",
    };
  }, [checkout]);

  useEffect(() => {
    const orderIdValue = checkout.order?._id || checkout.order?.id || "";
    const paidWasteId =
      getOrderWasteId(checkout.order) ||
      checkout.waste?._id ||
      checkout.waste?.id ||
      "";
    const orderStatus = String(checkout.order?.status || "").toLowerCase();
    const paymentStatus = String(checkout.payment?.status || "").toLowerCase();
    const dealStatus = String(checkout.dealStatus || "").toLowerCase();
    const isPaid =
      orderStatus === "completed" ||
      orderStatus === "paid" ||
      paymentStatus === "paid" ||
      dealStatus === "completed";

    if (!isPaid || (!paidWasteId && !orderIdValue) || !totals.total) {
      return;
    }

    markCartDealMetaPaid({
      wasteId: paidWasteId,
      orderId: orderIdValue,
      originalAmount: totals.total,
      supplierAmount: totals.supplierAmount,
      commissionAmount: totals.serviceFee,
      currency: totals.currency,
    });
  }, [checkout, totals]);

  const updateCard = (name, value) => {
    setCard((currentCard) => ({
      ...currentCard,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        [name]: "",
      }));
    }
  };

  const updateCheckoutDetail = (name, value) => {
    setCheckoutDetails((currentDetails) => ({
      ...currentDetails,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        [name]: "",
      }));
    }
  };

  const handleCancel = () => {
    navigate(user.role === "Buyer" ? "/search-listing" : "/manage-listing");
  };

  const handlePayment = async (event) => {
    event.preventDefault();

    const nextErrors = validateCheckout(card, checkoutDetails);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setMessage({ type: "error", text: t("payment.checkDetails") });
      return;
    }

    let orderToPay = checkout.order;
    if (!orderToPay?._id && !orderToPay?.id) {
      setMessage({
        type: "error",
        text: t("payment.needsOrder"),
      });
      return;
    }

    if (!checkout.canPay && checkout.payment?.status !== "paid") {
      setMessage({
        type: "error",
        text: t("payment.dealNotReady"),
      });
      return;
    }

    try {
      setIsPaying(true);
      setMessage({ type: "", text: "" });

      const paymentResult = await markOrderPaid(orderToPay._id || orderToPay.id, card);
      const refreshedOrder = await getOrder(orderToPay._id || orderToPay.id).catch(() => null);
      const nextCheckout = refreshedOrder
        ? normalizeOrder(refreshedOrder, checkout.waste)
        : {
            ...checkout,
            payment: {
              ...(paymentResult?.payment || checkout.payment),
              status: paymentResult?.payment?.status || "paid",
            },
            dealStatus: paymentResult?.deal?.status || "completed",
          };

      setMessage({ type: "success", text: t("payment.completed") });
      setCheckout(nextCheckout);
      const paidWasteId = getOrderWasteId(refreshedOrder || orderToPay) || checkout.waste?._id || checkout.waste?.id || "";
      markCartDealMetaPaid({
        wasteId: paidWasteId,
        orderId: orderToPay._id || orderToPay.id,
        originalAmount: totals.total,
        supplierAmount: totals.supplierAmount,
        commissionAmount: totals.serviceFee,
        currency: totals.currency,
      });
      window.dispatchEvent(new Event("ecolink:dashboard-refresh"));
      window.dispatchEvent(new Event("ecolink:requests-refresh"));
      window.dispatchEvent(new Event("ecolink:notifications-refresh"));
      window.dispatchEvent(new Event("ecolink:listings-refresh"));

      const reviewWasteId =
        checkout.waste?._id ||
        checkout.waste?.id ||
        checkout.order?.wasteId ||
        (typeof checkout.order?.waste === "string" ? checkout.order.waste : "");
      const reviewFactoryId = checkout.waste?.sellerFactoryId;
      if (reviewWasteId || reviewFactoryId) {
        window.setTimeout(() => {
          const reviewParams = new URLSearchParams();
          if (reviewWasteId) {
            reviewParams.set("wasteId", reviewWasteId);
          } else {
            reviewParams.set("factoryId", reviewFactoryId);
          }
          navigate(`/review?${reviewParams.toString()}`);
        }, 900);
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: getApiErrorMessage(error, t("payment.completeError"), t),
      });
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <main className="dashboard-shell payment-shell">
      <SupplierSidebar />

      <section className="payment-content">
        <header className="payment-topbar">
          <Link to={user.role === "Buyer" ? "/search-listing" : "/manage-listing"} className="payment-back-link">
            <i className="bi bi-chevron-left" aria-hidden="true" />
            {t("common.backToListings")}
          </Link>

          <SupplierProfile user={user} />
        </header>

        <h1>{t("payment.secureCheckout")}</h1>

        {message.text && (
          <p className={`payment-alert payment-alert-${message.type}`}>{message.text}</p>
        )}

        <div className="payment-grid" aria-busy={isLoading}>
          <section className="payment-summary-card">
            <div className="payment-summary-main">
              <div className="payment-section-title">
                <i className="bi bi-card-checklist" aria-hidden="true" />
                <h2>{t("payment.orderSummary")}</h2>
              </div>
              <p>{t("payment.summaryText")}</p>

              <article className="payment-product">
                <img src={getOrderImage(checkout.waste)} alt={checkout.waste.title} />

                <div className="payment-product-copy">
                  <h3>{checkout.waste.title}</h3>
                  <span>{t("payment.seller", { name: checkout.waste.sellerName })}</span>

                  <p>
                    <img src={PAYMENT_DETAIL_ICONS.location} alt="" aria-hidden="true" />
                    {checkout.waste.location}
                  </p>
                  <p>
                    <img src={PAYMENT_DETAIL_ICONS.price} alt="" aria-hidden="true" />
                    {formatAmount(checkout.waste.price, language)}
                    {checkout.waste.currency}
                  </p>
                  <p>
                    <img src={PAYMENT_DETAIL_ICONS.quantity} alt="" aria-hidden="true" />
                    {checkout.order?.quantity || checkout.waste.quantity} {checkout.waste.unit}
                  </p>
                  <p>
                    <img src={PAYMENT_DETAIL_ICONS.sustainability} alt="" aria-hidden="true" />
                    {checkout.waste.description}
                  </p>
                </div>
              </article>
            </div>

            <dl className="payment-totals">
              <div>
                <dt>{t("payment.price")}</dt>
                <dd>{formatAmount(totals.price, language)}</dd>
              </div>
              <div>
                <dt>{t("payment.serviceFee")}</dt>
                <dd>{formatAmount(totals.serviceFee, language)}</dd>
              </div>
              <div>
                <dt>{t("payment.supplierAmount")}</dt>
                <dd>{formatAmount(totals.supplierAmount, language)}</dd>
              </div>
              <div className="payment-total-row">
                <dt>{t("payment.totalAmount")}</dt>
                <dd>{formatAmount(totals.total, language)}</dd>
              </div>
            </dl>

            <p className="payment-impact">
              <img src="/assets/planet-earth.png" alt="" aria-hidden="true" />
              {t("payment.impact")}
            </p>
          </section>

          <form className="payment-method-card" onSubmit={handlePayment} noValidate>
            <span className="payment-tree" aria-hidden="true">
              <img src="/assets/tree.png" alt="" />
            </span>

            <span className="payment-feature-icon">
              <img src="/assets/debit-card.png" alt="" aria-hidden="true" />
            </span>

            <h2>{t("payment.confirmMethod")}</h2>

            <div className="payment-form-grid">
              <label className="payment-field payment-field-wide payment-field-address">
                <span>{t("payment.shippingAddress")}</span>
                <textarea
                  placeholder={t("payment.shippingAddressPlaceholder")}
                  value={checkoutDetails.shippingAddress}
                  onChange={(event) => updateCheckoutDetail("shippingAddress", event.target.value)}
                  aria-invalid={Boolean(errors.shippingAddress)}
                />
                {errors.shippingAddress && <small>{getPaymentFieldError(errors.shippingAddress, t)}</small>}
              </label>

              <label className="payment-field payment-field-wide">
                <span>{t("payment.nameOnCard")}</span>
                <input
                  type="text"
                  placeholder="Olivia Rhye"
                  value={card.name}
                  onChange={(event) => updateCard("name", event.target.value)}
                  aria-invalid={Boolean(errors.name)}
                />
                {errors.name && <small>{getPaymentFieldError(errors.name, t)}</small>}
              </label>

              <label className="payment-field">
                <span>{t("payment.expiry")}</span>
                <input
                  type="text"
                  placeholder="06 / 27"
                  value={card.expiry}
                  onChange={(event) => updateCard("expiry", event.target.value)}
                  aria-invalid={Boolean(errors.expiry)}
                />
                {errors.expiry && <small>{getPaymentFieldError(errors.expiry, t)}</small>}
              </label>

              <label className="payment-field payment-field-wide">
                <span>{t("payment.cardNumber")}</span>
                <div className="payment-card-input">
                  <span className="payment-mastercard" aria-hidden="true">
                    <span />
                    <span />
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="1234 1234 1234 1234"
                    value={card.number}
                    onChange={(event) => updateCard("number", event.target.value)}
                    aria-invalid={Boolean(errors.number)}
                  />
                </div>
                {errors.number && <small>{getPaymentFieldError(errors.number, t)}</small>}
              </label>

              <label className="payment-field">
                <span>{t("payment.cvv")}</span>
                <input
                  type="password"
                  inputMode="numeric"
                  placeholder="123"
                  value={card.cvv}
                  onChange={(event) => updateCard("cvv", event.target.value)}
                  aria-invalid={Boolean(errors.cvv)}
                />
                {errors.cvv && <small>{getPaymentFieldError(errors.cvv, t)}</small>}
              </label>
            </div>

            <div className="payment-actions">
              <button type="button" className="payment-cancel" onClick={handleCancel}>
                {t("common.cancel")}
              </button>
              <button type="submit" className="payment-submit" disabled={isPaying}>
                {isPaying ? t("payment.processing") : t("payment.payNow")}
              </button>
            </div>

            <div className="payment-methods" aria-label={t("payment.acceptedMethods")}>
              <strong>VISA</strong>
              <span className="payment-mastercard-large" aria-hidden="true">
                <span />
                <span />
              </span>
              <span className="payment-apple">
                <i className="bi bi-apple" aria-hidden="true" />
                {t("payment.pay")}
              </span>
            </div>

            <p className="payment-secure">
              <i className="bi bi-shield-fill-check" aria-hidden="true" />
              {t("payment.secure")}
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
