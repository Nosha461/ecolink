const PAYMENT_READY_STATUSES = new Set([
  "pending",
  "approved",
  "confirmed",
  "accepted",
  "agreed",
  "ready_for_payment",
  "ready-for-payment",
]);

function normalizeStatusValue(value, fallback = "pending") {
  const normalized = String(value || "").trim().toLowerCase().replace(/\s+/g, "_");
  return normalized || fallback;
}

export function normalizeDealState({ order = {}, deal = {}, payment = {} } = {}) {
  const orderStatus = normalizeStatusValue(order.status);
  const dealStatus = normalizeStatusValue(deal.status, "non_completed");
  const paymentStatus = normalizeStatusValue(payment.status || order.paymentStatus, "pending");
  const isPaid =
    paymentStatus === "paid" ||
    orderStatus === "completed" ||
    dealStatus === "completed";
  const isPaymentReady =
    !isPaid &&
    (PAYMENT_READY_STATUSES.has(orderStatus) || PAYMENT_READY_STATUSES.has(dealStatus));

  return {
    orderStatus: isPaid ? "completed" : orderStatus,
    dealStatus: isPaid ? "completed" : isPaymentReady ? "approved" : dealStatus,
    paymentStatus: isPaid ? "paid" : paymentStatus,
    isPaid,
    isPaymentReady,
    canAddToCart: isPaymentReady,
    canPay: isPaymentReady,
  };
}
