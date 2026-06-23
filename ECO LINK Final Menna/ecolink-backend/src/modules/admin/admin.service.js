import mongoose from 'mongoose';
import { User } from '../../DB/models/user.model.js';
import { Waste } from '../../DB/models/waste.model.js';
import { Order } from '../../DB/models/order.model.js';
import { Commission } from '../../DB/models/commission.model.js';
import { Deal } from '../../DB/models/deal.model.js';
import { Payment } from '../../DB/models/payment.model.js';
import * as categoryService from '../wasteCategory/category.service.js';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function parsePagination(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || DEFAULT_PAGE);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit, 10) || DEFAULT_LIMIT));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function formatAdminUser(user) {
  return {
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    roles: user.roles,
    activeRole: user.activeRole,
    currentRole: user.currentRole,
    isVerified: user.isVerified,
    isAdmin: user.isAdmin,
    isBlocked: user.isBlocked,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export const getDashboardStats = async () => {
  const [totalUsers, totalListings, completedDeals] = await Promise.all([
    User.countDocuments({ deletedAt: null }),
    Waste.countDocuments({ status: { $ne: 'archived' } }),
    Deal.countDocuments({ status: 'completed' }),
  ]);

  return { totalUsers, totalListings, completedDeals };
};

export const listUsers = async (query = {}) => {
  const { page, limit, skip } = parsePagination(query);
  const filter = { deletedAt: null };

  if (query.search) {
    const term = String(query.search).trim();
    const regex = new RegExp(term, 'i');
    filter.$or = [
      { firstName: regex },
      { lastName: regex },
      { email: regex },
      { phoneNumber: regex },
    ];
  }
  if (query.isBlocked === 'true') filter.isBlocked = true;
  if (query.isBlocked === 'false') filter.isBlocked = false;

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  return {
    users: users.map(formatAdminUser),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  };
};

export const blockUser = async (adminId, userId) => {
  const id = String(userId ?? '').trim();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid user id', { cause: 400 });
  }
  if (String(adminId) === id) {
    throw new Error('You cannot block your own account', { cause: 400 });
  }

  const user = await User.findOne({ _id: id, deletedAt: null });
  if (!user) throw new Error('User not found', { cause: 404 });
  if (user.isAdmin) throw new Error('Cannot block an admin account', { cause: 403 });

  user.isBlocked = true;
  await user.save();
  return formatAdminUser(user);
};

export const unblockUser = async (adminId, userId) => {
  const id = String(userId ?? '').trim();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid user id', { cause: 400 });
  }

  const user = await User.findOne({ _id: id, deletedAt: null });
  if (!user) throw new Error('User not found', { cause: 404 });

  user.isBlocked = false;
  await user.save();
  return formatAdminUser(user);
};

export const deleteUser = async (adminId, userId) => {
  const id = String(userId ?? '').trim();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid user id', { cause: 400 });
  }
  if (String(adminId) === id) {
    throw new Error('You cannot delete your own account', { cause: 400 });
  }

  const user = await User.findOne({ _id: id, deletedAt: null });
  if (!user) throw new Error('User not found', { cause: 404 });
  if (user.isAdmin) throw new Error('Cannot delete an admin account', { cause: 403 });

  user.deletedAt = new Date();
  user.isBlocked = true;
  await user.save();
  return { id: user._id, deletedAt: user.deletedAt };
};

export const listListings = async (query = {}) => {
  const { page, limit, skip } = parsePagination(query);
  const filter = {};

  if (query.status) filter.status = query.status;
  if (query.search) {
    const term = String(query.search).trim();
    filter.title = new RegExp(term, 'i');
  }

  const [listings, total] = await Promise.all([
    Waste.find(filter)
      .populate({ path: 'factory', populate: { path: 'user', select: 'firstName lastName email' } })
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Waste.countDocuments(filter),
  ]);

  return {
    listings,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  };
};

export const removeListing = async (listingId) => {
  const id = String(listingId ?? '').trim();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid listing id', { cause: 400 });
  }

  const listing = await Waste.findById(id);
  if (!listing) throw new Error('Listing not found', { cause: 404 });

  listing.status = 'archived';
  await listing.save();

  return listing;
};

export const listPayments = async (query = {}) => {
  const { page, limit, skip } = parsePagination(query);
  const filter = {};

  if (query.status) filter.status = query.status;

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .populate({
        path: 'order',
        populate: [
          { path: 'buyer', select: 'name' },
          { path: 'seller', select: 'name' },
          { path: 'waste', select: 'title' },
        ],
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Payment.countDocuments(filter),
  ]);

  return {
    payments,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  };
};

export const getPlatformCommissions = async (query = {}) => {
  const { page, limit, skip } = parsePagination(query);
  const match = {};
  if (query.from || query.to) {
    match.createdAt = {};
    if (query.from) match.createdAt.$gte = new Date(query.from);
    if (query.to) match.createdAt.$lte = new Date(query.to);
  }

  const [summary] = await Commission.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalCommissions: { $sum: 1 },
        totalCommissionAmount: { $sum: '$amount' },
        totalPaymentVolume: { $sum: '$paymentAmount' },
      },
    },
  ]);

  const byCurrency = await Commission.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$currency',
        count: { $sum: 1 },
        totalPaymentVolume: { $sum: '$paymentAmount' },
        totalCommissionAmount: { $sum: '$amount' },
      },
    },
    { $sort: { totalCommissionAmount: -1 } },
  ]);

  const [commissions, total] = await Promise.all([
    Commission.find(match)
      .populate('order', 'totalAmount currency status')
      .populate('payment', 'status transactionId amount')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Commission.countDocuments(match),
  ]);

  return {
    totalCommissions: summary?.totalCommissions ?? 0,
    totalCommissionAmount: summary?.totalCommissionAmount ?? 0,
    totalPaymentVolume: summary?.totalPaymentVolume ?? 0,
    byCurrency,
    commissions,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  };
};

export const addCategory = async (payload, adminId) => {
  return categoryService.addCategory(payload, { _id: adminId });
};

export const listCompletedDeals = async (query = {}) => {
  const { page, limit, skip } = parsePagination(query);
  const filter = { status: 'completed' };
  const [deals, total] = await Promise.all([
    Deal.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Deal.countDocuments(filter),
  ]);
  return { deals, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } };
};
