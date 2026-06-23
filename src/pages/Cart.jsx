import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SupplierProfile, SupplierSidebar } from "../components/SupplierDashboardLayout";
import { useI18n } from "../i18n/i18nContext";
import { getApiErrorMessage } from "../utils/apiClient";
import {
  ACTIVE_CART_WASTE_ID_KEY,
  addCartItem,
  getCart,
  getCartTotal,
  removeCartItem,
  SYNC_ACCEPTED_REQUESTS_TO_CART_KEY,
  updateCartItemQuantity,
} from "../utils/cartApi";
import { clearCartDealMeta, saveCartDealMeta } from "../utils/cartDealMeta";
import { calculateCommissionBreakdown } from "../utils/commission";
import { createOrder } from "../utils/paymentApi";
import { getMyAcceptedPurchaseRequests } from "../utils/requestApi";
import { getSupplierUser } from "../utils/supplierUser";
import "./Dashboard.css";
import "./Request.css";
import "./Cart.css";

function formatAmount(value, language) {
  const number = Number(value);
  return new Intl.NumberFormat(language === "ar" ? "ar-EG" : "en-US", {
    maximumFractionDigits: 0,
  }).format(Number.isFinite(number) ? number : 0);
}

function getFirstOrderId(payload) {
  const orders = Array.isArray(payload?.orders) ? payload.orders : [];
  const order = orders[0] || payload?.order || payload;

  return order?._id || order?.id || "";
}

function getAvailableQuantity(item) {
  const quantity = Number(item?.waste?.quantity);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : null;
}

function getActiveCartWasteId() {
  return sessionStorage.getItem(ACTIVE_CART_WASTE_ID_KEY) || "";
}

function calculateCartTotal(items = []) {
  return items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);
}

export default function Cart() {
  const navigate = useNavigate();
  const user = getSupplierUser();
  const { language, t, optionLabel } = useI18n();
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [busyItemId, setBusyItemId] = useState("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const isBuyer = user.role === "Buyer";

  const loadCart = useCallback(async () => {
    try {
      setStatus("loading");
      setMessage({ type: "", text: "" });
      let data = await getCart();
      const activeWasteId = getActiveCartWasteId();

      if (sessionStorage.getItem(SYNC_ACCEPTED_REQUESTS_TO_CART_KEY) === "1") {
        sessionStorage.removeItem(SYNC_ACCEPTED_REQUESTS_TO_CART_KEY);
        const acceptedRequests = await getMyAcceptedPurchaseRequests().catch(() => []);
        const missingRequests = acceptedRequests.filter(
          (request) =>
            request.wasteId &&
            (!activeWasteId || String(request.wasteId) === String(activeWasteId)) &&
            !data.items.some((item) => String(item.wasteId) === String(request.wasteId))
        );

        if (missingRequests.length > 0) {
          await Promise.all(
            missingRequests.map((request) =>
              addCartItem({
                wasteId: request.wasteId,
                quantity: request.quantity || 1,
              }).catch(() => null)
            )
          );
          data = await getCart();
        }
      }

      if (activeWasteId) {
        const staleItems = data.items.filter((item) => String(item.wasteId) !== String(activeWasteId));
        if (staleItems.length > 0) {
          await Promise.all(staleItems.map((item) => removeCartItem(item.id).catch(() => null)));
          data = await getCart();
        }
        data = {
          ...data,
          items: data.items.filter((item) => String(item.wasteId) === String(activeWasteId)),
        };
      } else {
        data = { ...data, items: [] };
      }

      const totalData = await getCartTotal().catch(() => null);
      const total = activeWasteId ? Number(totalData?.total ?? data.total) : 0;
      const calculatedTotal = calculateCartTotal(data.items);
      setCart({
        ...data,
        total: data.items.length > 0 ? calculatedTotal : total,
      });
      setStatus("ready");
    } catch (error) {
      setCart({ items: [], total: 0 });
      setMessage({
        type: "error",
        text: getApiErrorMessage(error, t("cart.loadError"), t),
      });
      setStatus("error");
    }
  }, [t]);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  const handleQuantityChange = async (itemId, quantity) => {
    if (quantity < 1) {
      setMessage({ type: "error", text: t("cart.quantityValidation") });
      return;
    }

    try {
      setBusyItemId(itemId);
      await updateCartItemQuantity(itemId, quantity);
      await loadCart();
      setMessage({ type: "success", text: t("cart.updateSuccess") });
    } catch (error) {
      setMessage({
        type: "error",
        text: getApiErrorMessage(error, t("cart.updateError"), t),
      });
    } finally {
      setBusyItemId("");
    }
  };

  const handleRemove = async (itemId) => {
    try {
      setBusyItemId(itemId);
      const item = cart.items.find((cartItem) => cartItem.id === itemId);
      await removeCartItem(itemId);
      clearCartDealMeta(item?.wasteId);
      if (String(item?.wasteId || "") === getActiveCartWasteId()) {
        sessionStorage.removeItem(ACTIVE_CART_WASTE_ID_KEY);
      }
      await loadCart();
      setMessage({ type: "success", text: t("cart.removeSuccess") });
    } catch (error) {
      setMessage({
        type: "error",
        text: getApiErrorMessage(error, t("cart.removeError"), t),
      });
    } finally {
      setBusyItemId("");
    }
  };

  const handleCheckout = async () => {
    if (cart.items.length === 0) {
      setMessage({ type: "error", text: t("cart.emptyTitle") });
      return;
    }

    if (!isBuyer) {
      setMessage({ type: "error", text: t("cart.buyerOnly") });
      return;
    }

    try {
      setIsCheckingOut(true);
      setMessage({ type: "", text: "" });

      const unavailableItem = cart.items.find((item) => getAvailableQuantity(item) === null);
      if (unavailableItem) {
        setMessage({
          type: "error",
          text: t("cart.listingUnavailable"),
        });
        return;
      }

      const overQuantityItem = cart.items.find((item) => {
        const availableQuantity = getAvailableQuantity(item);
        return availableQuantity !== null && Number(item.quantity) > availableQuantity;
      });

      if (overQuantityItem) {
        setMessage({
          type: "error",
          text: t("cart.quantityExceedsStock", {
            name: overQuantityItem.waste?.materialName || t("listing.untitled"),
            quantity: getAvailableQuantity(overQuantityItem),
            unit: optionLabel(overQuantityItem.waste?.unit) || overQuantityItem.waste?.unit || "",
          }),
        });
        return;
      }

      const checkoutResult = await createOrder({
        listingId: cart.items[0]?.wasteId || cart.items[0]?.waste?.id,
        quantity: cart.items[0]?.quantity || 1,
        shippingAddress: "Pending buyer entry",
      });
      const firstOrderId = getFirstOrderId(checkoutResult);
      saveCartDealMeta({
        wasteId: cart.items[0]?.wasteId || cart.items[0]?.waste?.id,
        orderId: firstOrderId,
        status: "approved",
        originalAmount: totals.totalAmount,
        supplierAmount: totals.supplierAmount,
        commissionAmount: totals.commissionAmount,
        currency: cart.items[0]?.waste?.currency || "EGP",
      });

      sessionStorage.removeItem(ACTIVE_CART_WASTE_ID_KEY);
      await loadCart();
      setMessage({ type: "success", text: t("cart.checkoutSuccess") });
      window.dispatchEvent(new Event("ecolink:notifications-refresh"));
      window.dispatchEvent(new Event("ecolink:requests-refresh"));

      if (firstOrderId) {
        navigate(`/payment/${firstOrderId}`);
      } else {
        setMessage({ type: "error", text: t("cart.checkoutError") });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: getApiErrorMessage(error, t("cart.checkoutError"), t),
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  const totals = calculateCommissionBreakdown(cart.total);

  return (
    <main className="dashboard-shell cart-shell">
      <SupplierSidebar />

      <section className="cart-content">
        <header className="cart-topbar">
          <div>
            <h1>{t("cart.title")}</h1>
            <p>{t("cart.subtitle")}</p>
          </div>

          <SupplierProfile user={user} />
        </header>

        {message.text && (
          <p className={`cart-alert cart-alert-${message.type}`} aria-live="polite">
            {message.text}
          </p>
        )}

        {!isBuyer && (
          <p className="cart-alert cart-alert-error" aria-live="polite">
            {t("cart.buyerOnly")}
          </p>
        )}

        <div className="cart-layout" aria-busy={status === "loading"}>
          <section className="cart-items">
            {status === "loading" && <p className="cart-state">{t("cart.loading")}</p>}

            {status !== "loading" && cart.items.length === 0 && (
              <div className="cart-empty">
                <img className="cart-empty-icon" src="/assets/cart-add.png" alt="" aria-hidden="true" />
                <h2>{t("cart.emptyTitle")}</h2>
                <p>{t("cart.emptyBody")}</p>
                <Link to="/search-listing">{t("cart.browseListings")}</Link>
              </div>
            )}

            {cart.items.map((item) => (
              <article className="cart-item" key={item.id}>
                <img
                  src={item.waste?.existingImages?.[0] || "/assets/recycle.png"}
                  alt={item.waste?.materialName || t("listing.untitled")}
                />

                <div className="cart-item-main">
                  <h2>{item.waste?.materialName || t("listing.untitled")}</h2>
                  <p>{item.waste?.description || t("cart.noDescription")}</p>
                  <span>
                    <i className="bi bi-tags-fill" aria-hidden="true" />
                    {formatAmount(item.unitPrice, language)} {t("common.egp")}
                  </span>
                </div>

                <div className="cart-quantity">
                  <button
                    type="button"
                    aria-label={t("cart.decreaseQuantity")}
                    disabled={busyItemId === item.id}
                    onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                  >
                    <i className="bi bi-dash" aria-hidden="true" />
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    type="button"
                    aria-label={t("cart.increaseQuantity")}
                    disabled={busyItemId === item.id}
                    onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                  >
                    <i className="bi bi-plus" aria-hidden="true" />
                  </button>
                </div>

                <div className="cart-item-total">
                  <strong>{formatAmount(item.quantity * item.unitPrice, language)} {t("common.egp")}</strong>
                  <small>{item.quantity} {optionLabel(item.waste?.unit) || item.waste?.unit}</small>
                  <button
                    type="button"
                    disabled={busyItemId === item.id}
                    onClick={() => handleRemove(item.id)}
                  >
                    <i className="bi bi-trash" aria-hidden="true" />
                    {t("cart.remove")}
                  </button>
                </div>
              </article>
            ))}
          </section>

          <aside className="cart-summary">
            <div className="cart-summary-heading">
              <img src="/assets/cart-add.png" alt="" aria-hidden="true" />
              <h2>{t("cart.summary")}</h2>
            </div>
            <dl>
              <div>
                <dt>{t("cart.subtotal")}</dt>
                <dd>{formatAmount(totals.originalAmount, language)} {t("common.egp")}</dd>
              </div>
              <div>
                <dt>{t("payment.serviceFee")}</dt>
                <dd>{formatAmount(totals.commissionAmount, language)} {t("common.egp")}</dd>
              </div>
              <div>
                <dt>{t("payment.supplierAmount")}</dt>
                <dd>{formatAmount(totals.supplierAmount, language)} {t("common.egp")}</dd>
              </div>
              <div className="cart-summary-total">
                <dt>{t("payment.totalAmount")}</dt>
                <dd>{formatAmount(totals.totalAmount, language)} {t("common.egp")}</dd>
              </div>
            </dl>
          <p className="cart-summary-note">{t("cart.approvalNote")}</p>
            <button
              type="button"
              onClick={handleCheckout}
              disabled={cart.items.length === 0 || isCheckingOut || !isBuyer}
            >
              {isCheckingOut ? t("cart.checkingOut") : t("cart.checkout")}
            </button>
          </aside>
        </div>
      </section>
    </main>
  );
}
