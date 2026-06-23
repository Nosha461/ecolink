import apiClient from "./apiClient";
import { API_ENDPOINTS } from "./apiConfig";

export async function getOrder(orderId) {
  const response = await apiClient.get(API_ENDPOINTS.orders.byId(orderId));
  return response.data?.data || response.data;
}

export async function getMyOrders() {
  const response = await apiClient.get(API_ENDPOINTS.orders.mine);
  const payload = response.data?.data || response.data;
  return Array.isArray(payload) ? payload : payload?.orders || payload?.items || [];
}

export async function createOrder({ listingId, quantity, shippingAddress }) {
  const response = await apiClient.post(API_ENDPOINTS.orders.create, {
    quantity: Number(quantity),
    shippingAddress,
    wasteId: listingId,
  });
  return response.data?.data || response.data;
}

export async function deleteOrder(orderId) {
  const response = await apiClient.delete(API_ENDPOINTS.orders.delete(orderId));
  return response.data?.data || response.data;
}

function normalizeExpiry(value) {
  const compact = String(value || "").replace(/\s/g, "");
  const match = compact.match(/^(\d{2})\/(\d{2}|\d{4})$/);

  if (!match) {
    return compact;
  }

  const [, month, year] = match;
  return `${month}/${year.slice(-2)}`;
}

export async function markOrderPaid(orderId, card) {
  const response = await apiClient.post(API_ENDPOINTS.payments.create, {
    cardNumber: card.number.replace(/\s/g, ""),
    orderId,
    expiry: normalizeExpiry(card.expiry),
    cvv: card.cvv,
  });
  return response.data?.data || response.data;
}

export async function notifySellerPayment(orderId) {
  const response = await apiClient.post(API_ENDPOINTS.payments.notifySeller(orderId));
  return response.data?.data || response.data;
}
