import mongoose from 'mongoose';

/** Normalize images payload to a cleaned non-empty array. */
export const normalizeWasteImages = (body) => {
  const { picture, images } = body || {};
  if (Array.isArray(images)) {
    const list = images.map((s) => String(s).trim()).filter(Boolean);
    if (list.length) return list;
  }
  if (picture != null && String(picture).trim()) {
    return [String(picture).trim()];
  }
  return [];
};

const validateCreateWaste = (body, req) => {
  const b = body || {};
  const { title, categoryId, description, quantity, unit, price, currency, location } = b;

  if (!categoryId || !String(categoryId).trim()) return 'categoryId is required';
  if (!mongoose.Types.ObjectId.isValid(String(categoryId).trim())) return 'Invalid categoryId';

  if (!title || !String(title).trim()) return 'Title is required';
  if (!description || !String(description).trim()) return 'Description is required';

  if (quantity === undefined || quantity === null || String(quantity).trim() === '')
    return 'quantity is required';
  if (Number.isNaN(Number(quantity)) || Number(quantity) < 0) return 'quantity must be a number >= 0';

  if (!unit || !String(unit).trim()) return 'unit is required';

  if (price === undefined || price === null || String(price).trim() === '') return 'price is required';
  if (Number.isNaN(Number(price)) || Number(price) < 0) return 'price must be a number >= 0';

  if (!currency || !String(currency).trim()) return 'currency is required';

  if (b.picture !== undefined || b.images !== undefined) {
    return 'Send images as uploaded files using field "images", not picture/images URL values';
  }

  if (!req?.files?.length) {
    return 'At least one image file is required in field "images"';
  }
  

  return null;
};

const validateUpdateWaste = (data, req) => {
  const id = req?.params?.id;
  if (!id || !String(id).trim()) return 'Waste id is required';
  if (!mongoose.Types.ObjectId.isValid(String(id).trim())) return 'Invalid waste id';

  const body = data || {};
  const {
    title,
    description,
    quantity,
    unit,
    price,
    currency,
    categoryId,
    picture,
    images,
    status,
  } = body;

  if (title !== undefined && (!title || !String(title).trim())) return 'title cannot be empty';
  if (description !== undefined && (!description || !String(description).trim()))
    return 'description cannot be empty';

  if (quantity !== undefined && (Number.isNaN(Number(quantity)) || Number(quantity) < 0))
    return 'quantity must be a number >= 0';
  if (price !== undefined && (Number.isNaN(Number(price)) || Number(price) < 0))
    return 'price must be a number >= 0';

  if (unit !== undefined && (!unit || !String(unit).trim())) return 'unit cannot be empty';
  if (currency !== undefined && (!currency || !String(currency).trim()))
    return 'currency cannot be empty';

  if (categoryId !== undefined) {
    if (!categoryId || !String(categoryId).trim()) return 'categoryId cannot be empty';
    if (!mongoose.Types.ObjectId.isValid(String(categoryId).trim())) return 'Invalid categoryId';
  }

  if (picture !== undefined || images !== undefined) {
    return 'Send images as uploaded files using field "images", not picture/images URL values';
  }

  if (
    status !== undefined &&
    !['draft', 'available', 'reserved', 'sold', 'out_of_stock', 'archived'].includes(status)
  )
    return 'Invalid status';

  return null;
};

const validateWasteIdParam = (_data, req) => {
  const id = req?.params?.id;
  if (!id || !String(id).trim()) return 'Waste id is required';
  if (!mongoose.Types.ObjectId.isValid(String(id).trim())) return 'Invalid waste id';
  return null;
};

export { validateCreateWaste, validateUpdateWaste, validateWasteIdParam };
