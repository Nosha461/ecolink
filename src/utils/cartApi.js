import apiClient from "./apiClient";
import { API_ENDPOINTS } from "./apiConfig";
import { normalizeListing } from "./listingApi";

export const SYNC_ACCEPTED_REQUESTS_TO_CART_KEY = "EcoLinkSyncAcceptedRequestsToCart";
export const ACTIVE_CART_WASTE_ID_KEY = "EcoLinkActiveCartWasteId";

function unwrapData(response) {
  return response?.data?.data || response?.data || null;
}

function normalizeCartItem(rawItem) {
  if (!rawItem || typeof rawItem !== "object") {
    return null;
  }

  const waste = normalizeListing(rawItem.waste || rawItem.listing || rawItem.item || {});
  const quantity = Number(rawItem.quantity || 0);
  const unitPrice = Number(rawItem.price || waste?.price || 0);

  return {
    id: rawItem._id || rawItem.id || rawItem.itemId || "",
    wasteId: waste?.id || rawItem.wasteId || rawItem.listingId || rawItem.item?.wasteId || "",
    waste,
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
    unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
  };
}

export function normalizeCart(payload) {
  const data = payload?.cart && payload?.items ? payload : payload?.data || payload || {};
  const rawItems = Array.isArray(data.items) ? data.items : Array.isArray(data.cartItems) ? data.cartItems : [];
  const items = rawItems.map(normalizeCartItem).filter(Boolean);
  const calculatedTotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const total = Number(data.total ?? data.amount ?? calculatedTotal);

  return {
    cart: data.cart || null,
    items,
    total: Number.isFinite(total) ? total : calculatedTotal,
  };
}

export async function getCart() {
  const response = await apiClient.get(API_ENDPOINTS.cart.root);
  return normalizeCart(unwrapData(response));
}

export async function addCartItem({ wasteId, quantity = 1 }) {
  const response = await apiClient.post(API_ENDPOINTS.cart.add, {
    wasteId,
    quantity: Number(quantity),
  });
  return unwrapData(response);
}

export async function updateCartItemQuantity(itemId, quantity) {
  const response = await apiClient.patch(API_ENDPOINTS.cart.byId(itemId), {
    quantity: Number(quantity),
  });
  return unwrapData(response);
}

export async function removeCartItem(itemId) {
  const response = await apiClient.delete(API_ENDPOINTS.cart.byId(itemId));
  return unwrapData(response);
}

export async function getCartTotal() {
  const response = await apiClient.get(API_ENDPOINTS.cart.total);
  return unwrapData(response);
}

export async function checkoutCart() {
  const response = await apiClient.post(API_ENDPOINTS.cart.checkout);
  return unwrapData(response);
}
