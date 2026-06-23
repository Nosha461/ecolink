import apiClient from "./apiClient";
import { API_ENDPOINTS } from "./apiConfig";

/**
 * Fetches general admin dashboard statistics.
 * GET /api/admin/stats
 */
export async function getDashboardStats() {
  const response = await apiClient.get(API_ENDPOINTS.admin.stats);
  return response.data?.data || response.data;
}

/**
 * Fetches a list of system users.
 * GET /api/admin/list-users
 */
export async function listUsers({ page = 1, limit = 10, isBlocked } = {}) {
  const params = { page, limit };
  if (isBlocked !== undefined) {
    params.isBlocked = String(isBlocked);
  }
  const response = await apiClient.get(API_ENDPOINTS.admin.users, { params });
  return response.data;
}

/**
 * Blocks a user by their ID.
 * PATCH /api/admin/users/:userId/block
 */
export async function blockUser(userId) {
  const response = await apiClient.patch(API_ENDPOINTS.admin.blockUser(userId));
  return response.data;
}

/**
 * Unblocks/unlocks a user by their ID.
 * PATCH /api/admin/users/:userId/unblock
 */
export async function unblockUser(userId) {
  const response = await apiClient.patch(API_ENDPOINTS.admin.unblockUser(userId));
  return response.data;
}

/**
 * Performs a soft delete on a user by their ID.
 * DELETE /api/admin/users/:userId/delete
 */
export async function deleteUser(userId) {
  const response = await apiClient.delete(API_ENDPOINTS.admin.deleteUser(userId));
  return response.data;
}

/**
 * Fetches all platform listings.
 * GET /api/admin/listings
 */
export async function listListings({ page = 1, limit = 20 } = {}) {
  const response = await apiClient.get(API_ENDPOINTS.admin.listings, { params: { page, limit } });
  return response.data;
}

/**
 * Removes/deletes a specific listing.
 * DELETE /api/admin/listings/:listingId/delete
 */
export async function deleteListing(listingId) {
  const response = await apiClient.delete(API_ENDPOINTS.admin.deleteListing(listingId));
  return response.data;
}

/**
 * Lists platform commissions and totals.
 * GET /api/admin/list-commissions
 */
export async function listCommissions({ page = 1, limit = 20 } = {}) {
  const response = await apiClient.get(API_ENDPOINTS.admin.commissions, { params: { page, limit } });
  return response.data;
}

/**
 * Lists platform completed deals.
 * GET /api/admin/list-completed-deals
 */
export async function listCompletedDeals({ page = 1, limit = 20 } = {}) {
  const response = await apiClient.get(API_ENDPOINTS.admin.completedDeals, { params: { page, limit } });
  return response.data;
}

/**
 * Lists all processed payments.
 * GET /api/admin/list-payments
 */
export async function listPayments({ page = 1, limit = 20 } = {}) {
  const response = await apiClient.get(API_ENDPOINTS.admin.payments, { params: { page, limit } });
  return response.data;
}
