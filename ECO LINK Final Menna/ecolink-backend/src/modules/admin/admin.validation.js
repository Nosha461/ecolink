import mongoose from 'mongoose';

const validateObjectId = (id, label = 'id') => {
  if (!id || !mongoose.Types.ObjectId.isValid(String(id).trim())) {
    return `Invalid ${label}`;
  }
  return null;
};

export const validateUserIdParam = (params) => {
  return validateObjectId(params?.userId, 'user id');
};

export const validateListingIdParam = (params) => {
  return validateObjectId(params?.listingId, 'listing id');
};

export const validateCompletedDealsQuery = (query) => {
  return validatePaginationQuery(query);
};