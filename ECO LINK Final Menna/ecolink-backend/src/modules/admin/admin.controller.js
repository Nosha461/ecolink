import { asyncHandler } from '../../utils/error/index.js';
import * as adminService from './admin.service.js';

export const getStats = asyncHandler(async (req, res) => {
  const stats = await adminService.getDashboardStats();
  res.status(200).json({ success: true, data: stats });
});

export const getUsers = asyncHandler(async (req, res) => {
  const result = await adminService.listUsers(req.query);
  res.status(200).json({ success: true, data: result.users, pagination: result.pagination });
});

export const blockUser = asyncHandler(async (req, res) => {
  const user = await adminService.blockUser(req.user._id, req.params.userId);
  res.status(200).json({ success: true, message: 'User blocked successfully', data: user });
});

export const unblockUser = asyncHandler(async (req, res) => {
  const user = await adminService.unblockUser(req.user._id, req.params.userId);
  res.status(200).json({ success: true, message: 'User unblocked successfully', data: user });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const result = await adminService.deleteUser(req.user._id, req.params.userId);
  res.status(200).json({ success: true, message: 'User deleted successfully', data: result });
});

export const getListings = asyncHandler(async (req, res) => {
  const result = await adminService.listListings(req.query);
  res.status(200).json({ success: true, data: result.listings, pagination: result.pagination });
});

export const removeListing = asyncHandler(async (req, res) => {
  const listing = await adminService.removeListing(req.params.listingId);
  res.status(200).json({ success: true, message: 'Listing removed successfully', data: listing });
});

export const getPayments = asyncHandler(async (req, res) => {
  const result = await adminService.listPayments(req.query);
  res.status(200).json({ success: true, data: result.payments, pagination: result.pagination });
});

export const getCommissions = asyncHandler(async (req, res) => {
  const commissions = await adminService.getPlatformCommissions(req.query);
  res.status(200).json({ success: true, data: commissions });
});

export const getCompletedDeals = asyncHandler(async (req, res) => {
  const result = await adminService.listCompletedDeals(req.query);
  res.status(200).json({ success: true, data: result.deals, pagination: result.pagination });
});

export const addCategory = asyncHandler(async (req, res) => {
  const category = await adminService.addCategory(req.body, req.user._id);
  res.status(201).json({ success: true, message: 'Category created successfully', data: category });
});