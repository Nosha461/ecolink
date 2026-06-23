import { normalizeDealState } from "./dealStatus";
import { getListings, getMyListings, resolveUploadedImageUrl } from "./listingApi";
import apiClient from "./apiClient";
import { API_ENDPOINTS } from "./apiConfig";

function getOrderId(order) {
  return order?._id || order?.id || order?.order?._id || order?.order?.id || "";
}

function normalizeStatus(value, fallback = "pending") {
  return String(value || fallback).trim().toLowerCase().replace(/\s+/g, "_");
}

function normalizePurchaseRequestStatus(value) {
  const status = normalizeStatus(value);
  return status === "accepted" ? "confirmed" : status;
}

function getDealStatusFromRequestStatus(value) {
  const status = normalizeStatus(value);

  if (status === "accepted" || status === "confirmed") {
    return "approved";
  }

  if (status === "declined") {
    return "declined";
  }

  return "pending";
}

function extractArray(payload) {
  const data = payload?.data || payload;
  const candidates = [
    data?.requests,
    data?.purchaseRequests,
    data?.items,
    data?.results,
    data?.docs,
    data,
  ];

  return candidates.find(Array.isArray) || [];
}

function getRequestId(payload) {
  return payload?._id || payload?.id || payload?.request?._id || payload?.request?.id || "";
}

function getPartyName(party) {
  return (
    party?.factoryName ||
    party?.companyName ||
    party?.fullName ||
    party?.name ||
    [party?.firstName, party?.lastName].filter(Boolean).join(" ").trim() ||
    ""
  );
}
async function attachListingDataToRequests(requests) {
  const listings = await getListings().catch(() => []);

  return requests.map((request) => {
    if (request.image && request.wasteTitle && request.wasteTitle !== "Untitled listing") {
      return request;
    }

    const listing = listings.find((item) => String(item.id) === String(request.wasteId));

    return {
      ...request,
      wasteTitle: request.wasteTitle || listing?.materialName || listing?.title || "Untitled listing",
      image: request.image || listing?.existingImages?.[0] || listing?.images?.[0] || "",
      description: request.description || listing?.description || "",
      sellerName: request.sellerName || listing?.sellerName || "",
      unit: request.unit || listing?.unit || "Units",
      currency: request.currency || listing?.currency || "EGP",
    };
  });
}

function normalizePurchaseRequest(payload, listing = {}) {
  const request = payload?.request || payload || {};
  const requestId = getRequestId(request);
  
  const rawWaste = request.wasteId || request.waste || {};
  const waste = typeof rawWaste === "object" && rawWaste ? rawWaste : {};
  const buyer = typeof request.buyerId === "object" && request.buyerId ? request.buyerId : {};
  const seller =
    typeof request.sellerId === "object" && request.sellerId
      ? request.sellerId
      : typeof request.supplierId === "object" && request.supplierId
        ? request.supplierId
        : {};
  const quantity = Number(request.quantity || 0);
  const offeredPrice = Number(request.offeredPrice || 0);
  const listingPrice = Number(listing.price || waste.price || 0);
  const unitPrice = offeredPrice || listingPrice;
  const rawStatus = normalizeStatus(request.status);
  const status = normalizePurchaseRequestStatus(rawStatus);
  const image =
    listing.existingImages?.[0] ||
    resolveUploadedImageUrl(
      Array.isArray(waste.images) ? waste.images[0] : waste.image || waste.imageUrl,
      waste
    );

  return {
    id: requestId,
    requestId,
    orderId:
  request.orderId ||
  request.order?._id ||
  request.order?.id ||
  request.createdOrder?._id ||
  request.createdOrder?.id ||
  "",
    wasteTitle: listing.materialName || listing.title || waste.title || waste.materialName || waste.name || "",
    wasteId:
      listing.id ||
      listing._id ||
      waste._id ||
      waste.id ||
      (typeof rawWaste === "string" ? rawWaste : ""),
    image,
    description: request.message || listing.description || waste.description || "",
    quantity,
    unit: listing.unit || waste.unit || "",
    unitPrice,
    totalAmount: unitPrice * quantity,
    currency: listing.currency || waste.currency || "EGP",
    status,
    rawStatus,
    shippingAddress: "",
    paymentStatus: "pending",
    dealStatus: getDealStatusFromRequestStatus(rawStatus),
    supplierConfirmed: rawStatus === "accepted",
    buyerConfirmed: false,
    negotiationStarted: Boolean(request.message),
    createdAt: request.createdAt || "",
    buyerName: getPartyName(buyer),
    sellerName: getPartyName(seller) || listing.sellerName || "",
    buyerEmail: buyer.email || "",
    buyerPhone: buyer.phoneNumber || "",
    source: "purchase-request",
  };
}

function normalizePurchaseRequestAction(payload, fallbackRequestId) {
  const request = payload?.request || payload || {};
  const requestId = getRequestId(request) || fallbackRequestId;
  const rawStatus = normalizeStatus(request.status);
  const status = normalizePurchaseRequestStatus(rawStatus);

  return {
    id: requestId,
    requestId,
    status,
    rawStatus,
    supplierConfirmed: rawStatus === "accepted",
    buyerConfirmed: false,
    dealStatus: getDealStatusFromRequestStatus(rawStatus),
  };
}

export function normalizeRequestPageRequest(payload) {
  const order = payload?.order || payload || {};
  const waste = order.waste || payload?.waste || {};
  const shipping = payload?.shipping || order.shipping || {};
  const deal = payload?.deal || order.deal || {};
  const payment = payload?.payment || order.payment || {};
  const normalizedState = normalizeDealState({ order, deal, payment });
  const image = resolveUploadedImageUrl(
    Array.isArray(waste.images) ? waste.images[0] : waste.image || waste.imageUrl,
    waste
  );

  return {
    id: getOrderId(order),
    requestId: payload?._id || payload?.id || order.purchaseRequestId || "",
    wasteTitle: waste.title || waste.materialName || waste.name || "",
    wasteId: waste._id || waste.id || order.wasteId || "",
    image,
    description: waste.description || "",
    quantity: Number(order.quantity || payload?.quantity || waste.quantity || 0),
    unit: waste.unit || "",
    unitPrice: Number(order.unitPrice || waste.price || 0),
    totalAmount: Number(order.totalAmount || order.amount || 0),
    currency: order.currency || waste.currency || "EGP",
    status: normalizeStatus(normalizedState.orderStatus || order.status || payload?.status),
    shippingAddress: shipping.address || order.shippingAddress || "",
    paymentStatus: normalizeStatus(normalizedState.paymentStatus, "pending"),
    dealStatus: normalizeStatus(normalizedState.dealStatus, "pending"),
    supplierConfirmed: Boolean(
      payload?.supplierConfirmed ||
        order.supplierConfirmed ||
        deal.supplierConfirmed ||
        normalizedState.dealStatus === "approved" ||
        normalizedState.dealStatus === "completed"
    ),
    buyerConfirmed: Boolean(
      payload?.buyerConfirmed ||
        order.buyerConfirmed ||
        deal.buyerConfirmed ||
        normalizedState.dealStatus === "approved" ||
        normalizedState.dealStatus === "completed"
    ),
    negotiationStarted: Boolean(payload?.negotiationStarted || order.negotiationStarted || deal.status),
    createdAt: order.createdAt || payload?.createdAt || "",
    source: "api",
  };
}

export async function sendPurchaseRequest({ wasteId, quantity }) {
  const response = await apiClient.post(API_ENDPOINTS.purchaseRequests.create, {
    wasteId,
    quantity: Number(quantity),
  });
  return response.data?.data || response.data;
}

export async function viewPurchaseRequestByWaste(wasteId) {
  const response = await apiClient.get(API_ENDPOINTS.purchaseRequests.viewByWaste(wasteId));
  return response.data?.data || response.data;
}
export async function getMyPurchaseRequests() {
  const response = await apiClient.get(API_ENDPOINTS.purchaseRequests.myRequests);

  const requests = extractArray(response.data?.data || response.data)
    .map((request) => normalizePurchaseRequest(request))
    .filter((request) => request.id);

  return attachListingDataToRequests(requests);
}

export async function getMyAcceptedPurchaseRequests() {
  const response = await apiClient.get(API_ENDPOINTS.purchaseRequests.myAcceptedRequests);
  return extractArray(response.data?.data || response.data)
    .map((request) => normalizePurchaseRequest(request))
    .filter((request) => request.id);
}

export async function cancelPurchaseRequest(requestId) {
  const response = await apiClient.patch(API_ENDPOINTS.purchaseRequests.cancel(requestId));
  return normalizePurchaseRequestAction(response.data?.data || response.data, requestId);
}

export async function getPurchaseRequestStatus(requestId) {
  const response = await apiClient.get(API_ENDPOINTS.purchaseRequests.status(requestId));
  const request = normalizePurchaseRequest(response.data?.data || response.data);
  const [requestWithListing] = await attachListingDataToRequests([request]);
  return requestWithListing || request;
}

export async function getSupplierPurchaseRequests() {
  const listings = await getMyListings();
  const requestGroups = await Promise.all(
    listings
      .filter((listing) => listing.id)
      .map(async (listing) => {
        try {
          const response = await viewPurchaseRequestByWaste(listing.id);
          return extractArray(response)
            .map((request) => normalizePurchaseRequest(request, listing))
            .filter((request) => request.id);
        } catch {
          return [];
        }
      })
  );

  return requestGroups.flat().sort((first, second) => {
    const firstDate = new Date(first.createdAt || 0).getTime();
    const secondDate = new Date(second.createdAt || 0).getTime();
    return secondDate - firstDate;
  });
}

export async function getRequestPageRequests({ isBuyer }) {
  const data = isBuyer ? await getMyPurchaseRequests() : await getSupplierPurchaseRequests();

  return data.sort((first, second) => {
    const firstDate = new Date(first.createdAt || 0).getTime();
    const secondDate = new Date(second.createdAt || 0).getTime();
    return secondDate - firstDate;
  });
}

export async function deleteRequestPageRequest(requestId, { isBuyer }) {
  if (isBuyer) {
    return cancelPurchaseRequest(requestId);
  }

  throw new Error("Suppliers can accept or decline requests only.");
}

export async function updateRequestPageFlow(requestId, action) {
  if (action === "supplierConfirm") {
    const response = await apiClient.patch(API_ENDPOINTS.purchaseRequests.accept(requestId));
    return normalizePurchaseRequestAction(response.data?.data || response.data, requestId);
  }

  if (action === "declineRequest") {
    const response = await apiClient.patch(API_ENDPOINTS.purchaseRequests.decline(requestId));
    return normalizePurchaseRequestAction(response.data?.data || response.data, requestId);
  }

  throw new Error("This request action is currently unavailable.");
}
