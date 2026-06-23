import { asyncHandler } from '../../utils/error/index.js';
import * as reviewsService from './reviews.service.js';

export const create = asyncHandler(async (req, res) => {
  const review = await reviewsService.createReview(req.user, req.body);
  res.status(201).json({ success: true, data: review });
});

export const list = asyncHandler(async (req, res) => {
  const reviews = await reviewsService.listReviews({
    reviewId: req.query.reviewId,
    wasteId: req.query.wasteId,
    factoryId: req.query.factoryId,
  });
  res.status(200).json({ success: true, data: reviews });
});

export const remove = asyncHandler(async (req, res) => {
  await reviewsService.deleteReview(req.user, req.params.reviewId);
  res.status(200).json({ success: true });
});

export const update = asyncHandler(async (req, res) => {
  const review = await reviewsService.updateReview(req.user, req.params.id, { rating: req.body.rating, comment: req.body.comment });
  res.status(200).json({ success: true, data: review });
});

export const notifySeller = asyncHandler(async (req, res) => {
  const notification = await reviewsService.sendReviewNotificationToSeller(
    req.user,
    req.body.wasteId
  );
  res.status(200).json({
    success: true,
    message: 'Seller notified about review',
    data: notification,
  });
});