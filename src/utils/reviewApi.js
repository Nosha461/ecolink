import apiClient from "./apiClient";
import { API_ENDPOINTS } from "./apiConfig";

function unwrapData(response) {
  return response?.data?.data || response?.data || null;
}

function extractReviewArray(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  return (
    payload?.reviews ||
    payload?.items ||
    payload?.results ||
    payload?.data?.reviews ||
    payload?.data?.items ||
    payload?.data?.results ||
    []
  );
}

export async function getReviews(filters = {}) {
  const normalizedFilters =
    typeof filters === "string" ? { reviewId: filters } : filters || {};
  const response = await apiClient.get(API_ENDPOINTS.reviews.root, {
    params: {
      ...(normalizedFilters.reviewId ? { reviewId: normalizedFilters.reviewId } : {}),
      ...(normalizedFilters.wasteId ? { wasteId: normalizedFilters.wasteId } : {}),
      ...(normalizedFilters.factoryId ? { factoryId: normalizedFilters.factoryId } : {}),
    },
  });
  return extractReviewArray(response.data);
}

export async function createReview(payload) {
  const documentedPayload = {
    rating: payload.rating,
    comment: payload.comment,
  };

  if (payload.wasteId) {
    documentedPayload.wasteId = payload.wasteId;
  } else if (payload.factoryId) {
    documentedPayload.factoryId = payload.factoryId;
  }

  const response = await apiClient.post(API_ENDPOINTS.reviews.create, documentedPayload);
  return unwrapData(response);
}

export async function notifySellerReview(wasteId) {
  const response = await apiClient.post(API_ENDPOINTS.reviews.notifySeller, { wasteId });
  return unwrapData(response);
}

export async function updateReview(reviewId, payload) {
  const response = await apiClient.put(API_ENDPOINTS.reviews.update(reviewId), payload);
  return unwrapData(response);
}

export async function deleteReview(reviewId) {
  const response = await apiClient.delete(API_ENDPOINTS.reviews.delete(reviewId));
  return unwrapData(response);
}
