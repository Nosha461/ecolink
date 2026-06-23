import mongoose from 'mongoose';

const validateNotifySellerReview = (body) => {
  const { wasteId } = body || {};
  if (!wasteId || !String(wasteId).trim()) return 'wasteId is required';
  if (!mongoose.Types.ObjectId.isValid(String(wasteId).trim())) return 'Invalid waste id';
  return null;
};

const validateCreateReview = (body) => {
  const { wasteId, rating } = body || {};
  if (!wasteId) return 'wasteId is required';
  if (rating === undefined || Number.isNaN(Number(rating))) return 'rating is required';
  const r = Number(rating);
  if (r < 1 || r > 5) return 'rating must be between 1 and 5';
  return null;
};

const validateUpdateReview = (body) => {
  const { rating, comment } = body || {};
  if (rating === undefined && comment === undefined) return 'rating or comment is required';
  if (rating !== undefined && (Number.isNaN(Number(rating)) || Number(rating) < 1 || Number(rating) > 5)) return 'rating must be between 1 and 5';
  if (comment !== undefined && typeof comment !== 'string') return 'comment must be a string';
  return null;
};
export { validateCreateReview, validateUpdateReview, validateNotifySellerReview };

