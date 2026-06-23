import mongoose from 'mongoose';
import { Waste } from '../../DB/models/waste.model.js';
import { WasteCategory } from '../../DB/models/wasteCategory.model.js';
import { ensureFactoryForUser } from '../factories/factories.service.js';
import { normalizeWasteImages } from './waste.validation.js';

export const addWaste = async (user, payload) => {
  const factory = await ensureFactoryForUser(user);
  if(user.role === "buyer") throw new Error('You have to be a seller to add waste', { cause: 403 });

  const categoryId = String(payload.categoryId ?? '').trim();
  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    throw new Error('Invalid categoryId', { cause: 400 });
  }

  const category = await WasteCategory.findById(categoryId);
  if (!category) {
    throw new Error('Waste category not found', { cause: 404 });
  }

  const images = normalizeWasteImages(payload);
  const title = String(payload.title ?? '').trim();
  const description = String(payload.description ?? '').trim();
  const unit = String(payload.unit ?? '').trim();
  const currency = String(payload.currency ?? '').trim();
  const quantity = Number(payload.quantity);
  const price = Number(payload.price);
  const location = String(payload.location ?? '').trim()

  const waste = await Waste.create({
    factory: factory._id,
    category: category._id,
    title,
    description,
    quantity,
    unit,
    price,
    currency,
    images,
    location,
    status:
      payload.status &&
      ['draft', 'available', 'reserved', 'sold', 'out_of_stock', 'archived'].includes(payload.status)
      ? payload.status
      : 'available',
  });

  return waste;
};

export const listWaste = async (filters = {}) => {
  const query = {};
  if (filters.factoryId) query.factory = filters.factoryId;
  if (filters.categoryId) query.category = filters.categoryId;
  if (filters.status) query.status = filters.status;

  return await Waste.find(query).populate('factory').populate('category').sort({ createdAt: -1 });
};

export const getWasteById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(String(id ?? '').trim())) {
    throw new Error('Invalid waste id', { cause: 400 });
  }
  const waste = await Waste.findById(id).populate('factory').populate('category');
  if (!waste) throw new Error('Waste not found', { cause: 404 });
  return waste;
};

export const updateWaste = async (user, wasteId, updates) => {
  const id = String(wasteId ?? '').trim();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid waste id', { cause: 400 });
  }

  const factory = await ensureFactoryForUser(user);
  const waste = await Waste.findById(id);
  if (!waste) throw new Error('Waste not found', { cause: 404 });
  if (String(waste.factory) !== String(factory._id)) throw new Error('Forbidden', { cause: 403 });

  if (updates.categoryId !== undefined) {
    const cid = String(updates.categoryId ?? '').trim();
    if (!mongoose.Types.ObjectId.isValid(cid)) {
      throw new Error('Invalid categoryId', { cause: 400 });
    }
    const category = await WasteCategory.findById(cid);
    if (!category) throw new Error('Waste category not found', { cause: 404 });
    waste.category = category._id;
  }

  if (updates.title !== undefined) waste.title = String(updates.title).trim();
  if (updates.description !== undefined) waste.description = String(updates.description).trim();
  if (updates.quantity !== undefined) waste.quantity = Number(updates.quantity);
  if (updates.unit !== undefined) waste.unit = String(updates.unit).trim();
  if (updates.price !== undefined) waste.price = Number(updates.price);
  if (updates.currency !== undefined) waste.currency = String(updates.currency).trim();
  if (updates.status !== undefined) waste.status = updates.status;

  if (updates.picture !== undefined || updates.images !== undefined) {
    waste.images = normalizeWasteImages(updates);
  }

  await waste.save();
  return await Waste.findById(waste._id).populate('factory').populate('category');
};

export const deleteWaste = async (user, wasteId) => {
  const id = String(wasteId ?? '').trim();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid waste id', { cause: 400 });
  }

  const factory = await ensureFactoryForUser(user);
  const waste = await Waste.findById(id);
  if (!waste) throw new Error('Waste not found', { cause: 404 });
  if (String(waste.factory) !== String(factory._id)) throw new Error('Forbidden', { cause: 403 });

  await waste.deleteOne();
  return { success: true };
};

export const searchWaste = async (search, filters = {}) => {
  console.log("SEARCH:", search);
  console.log("FILTERS:", filters);

  const query = {};

  // ================= TEXT SEARCH =================
  if (search) {
    const category = await WasteCategory.findOne({
      name: { $regex: search, $options: "i" }
    });

    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      ...(category ? [{ category: category._id }] : [])
    ];
  }

  // ================= PRICE FILTER =================
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    query.price = {};

    if (filters.minPrice !== undefined) {
      query.price.$gte = Number(filters.minPrice);
    }

    if (filters.maxPrice !== undefined) {
      query.price.$lte = Number(filters.maxPrice);
    }
  }

  return Waste.find(query)
    .populate("category")
    .populate("factory")
    .sort({ createdAt: -1 });
};

