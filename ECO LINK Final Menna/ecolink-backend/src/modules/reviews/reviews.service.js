import mongoose from 'mongoose';
import { Review } from '../../DB/models/review.model.js';
import { Order } from '../../DB/models/order.model.js';
import { Payment } from '../../DB/models/payment.model.js';
import { Deal } from '../../DB/models/deal.model.js';
import { Waste } from '../../DB/models/waste.model.js';
import { ensureFactoryForUser } from '../factories/factories.service.js';
import { createNotification } from '../notification/notification.service.js';

const assertBuyer = (user) => {
  if (user.currentRole !== 'buyer') {
    throw new Error('Only buyers can review waste', { cause: 403 });
  }
};

const assertBuyerPaidForWaste = async (buyerFactoryId, wasteId) => {
  const orders = await Order.find({ buyer: buyerFactoryId, waste: wasteId }).sort({
    createdAt: -1,
  });

  if (!orders.length) {
    throw new Error(
      'No order found for this waste. Place an order first, then complete payment.',
      { cause: 403 }
    );
  }

  for (const order of orders) {
    const payment = await Payment.findOne({ order: order._id, status: 'paid' });
    if (payment) return order;

    const deal = await Deal.findOne({ order: order._id, status: 'completed' });
    if (deal) return order;
  }

  throw new Error(
    'Payment not completed for this waste. Pay for your order before leaving a review.',
    { cause: 403 }
  );
};

export const notifySellerOnReview = async (wasteId, buyerUser) => {
  const waste = await Waste.findById(wasteId).populate({
    path: 'factory',
    populate: { path: 'user', select: '_id firstName lastName' },
  });

  if (!waste) throw new Error('Waste not found', { cause: 404 });

  const sellerUserId = waste?.factory?.user?._id;
  if (!sellerUserId || !buyerUser) {
    throw new Error('Waste or seller data incomplete for review notification', { cause: 400 });
  }

  const buyerName = `${buyerUser.firstName} ${buyerUser.lastName}`.trim();
  const wasteName = waste.title;

  return createNotification({
    userId: sellerUserId,
    type: 'message',
    title: 'New review',
    body: `${buyerName} made a rate on ${wasteName}.`,
    relatedId: waste._id,
  });
};

export const sendReviewNotificationToSeller = async (user, wasteId) => {
  assertBuyer(user);

  const wasteIdStr = String(wasteId ?? '').trim();
  if (!mongoose.Types.ObjectId.isValid(wasteIdStr)) {
    throw new Error('Invalid waste id', { cause: 400 });
  }

  const buyer = await ensureFactoryForUser(user);
  await assertBuyerPaidForWaste(buyer._id, wasteIdStr);

  return notifySellerOnReview(wasteIdStr, user);
};

export const createReview = async (user, { wasteId, rating, comment }) => {
  assertBuyer(user);

  const wasteIdStr = String(wasteId ?? '').trim();
  if (!mongoose.Types.ObjectId.isValid(wasteIdStr)) {
    throw new Error('Invalid waste id', { cause: 400 });
  }

  const buyer = await ensureFactoryForUser(user);
  await assertBuyerPaidForWaste(buyer._id, wasteIdStr);

  const waste = await Waste.findById(wasteIdStr);
  if (!waste) throw new Error('Waste not found', { cause: 404 });
  if (!waste.factory) throw new Error('Waste has no seller', { cause: 400 });

  const existing = await Review.findOne({ waste: wasteIdStr, createdBy: buyer._id });
  if (existing) {
    throw new Error('You have already reviewed this waste', { cause: 409 });
  }

  const review = await Review.create({
    waste: waste._id,
    factory: waste.factory,
    createdBy: buyer._id,
    rating: Number(rating),
    comment,
  });

  try {
    await sendReviewNotificationToSeller(user, waste._id);
  } catch (err) {
    console.error('Failed to notify seller about review:', err.message);
  }

  return review;
};

export const listReviews = async ({ reviewId, wasteId, factoryId } = {}) => {
  const query = {};
  if (reviewId) query._id = reviewId;
  if (wasteId) query.waste = wasteId;
  if (factoryId) query.factory = factoryId;

  return await Review.find(query)
    .populate('waste', 'title')
    .populate('factory')
    .populate('createdBy')
    .sort({ createdAt: -1 });
};

export const deleteReview = async (user, reviewId) => {
  assertBuyer(user);
  const buyer = await ensureFactoryForUser(user);
  const review = await Review.findById(reviewId);
  if (!review) throw new Error('Review not found', { cause: 404 });
  if (String(review.createdBy) !== String(buyer._id)) {
    throw new Error('Forbidden', { cause: 403 });
  }

  await review.deleteOne();
  return { success: true };
};

export const updateReview = async (user, reviewId, { rating, comment }) => {
  assertBuyer(user);
  const buyer = await ensureFactoryForUser(user);
  const review = await Review.findById(reviewId);
  if (!review) throw new Error('Review not found', { cause: 404 });
  if (String(review.createdBy) !== String(buyer._id)) {
    throw new Error('Forbidden', { cause: 403 });
  }

  if (rating !== undefined) review.rating = Number(rating);
  if (comment !== undefined) review.comment = String(comment).trim();

  await review.save();
  return review;
};
