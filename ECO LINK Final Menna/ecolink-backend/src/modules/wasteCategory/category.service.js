import mongoose from 'mongoose';
import { Waste } from '../../DB/models/waste.model.js';
import { WasteCategory } from '../../DB/models/wasteCategory.model.js';

export const addCategory = async (payload, user) => {
  const name = String(payload?.name ?? '').trim();
  const description = String(payload?.description ?? '').trim();

  if (!name || !description) {
    throw new Error('Name and description are required', { cause: 400 });
  }

  const duplicate = await WasteCategory.findOne({
    name: { $regex: new RegExp(`^${escapeRegex(name)}$`, 'i') },
  });
  if (duplicate) {
    throw new Error('Category name already exists', { cause: 409 });
  }

  const category = await WasteCategory.create({
    name,
    description,
    createdBy: user?._id,
  });
  return category;
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const removeCategory = async (categoryId) => {
  const id = String(categoryId ?? '').trim();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid category id', { cause: 400 });
  }

  const category = await WasteCategory.findById(id);
  if (!category) {
    throw new Error('Category not found', { cause: 404 });
  }

  const inUse = await Waste.exists({ category: id });
  if (inUse) {
    throw new Error('Cannot delete category while waste listings still reference it', { cause: 400 });
  }

  await category.deleteOne();
  return { deleted: true, id };
};

export const getCategoryById = async (categoryId) => {
  const category = await WasteCategory.findById(categoryId);
  if (!category) {
    throw new Error('Category not found', { cause: 404 });
  }
  return { category };
};

export const updateCategory = async (categoryId, payload) => {
  const id = String(categoryId ?? '').trim();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error('Invalid category id', { cause: 400 });
  }
  const category = await WasteCategory.findById(id);
  if (!category) {
    throw new Error('Category not found', { cause: 404 });
  }
  const name = payload?.name !== undefined ? String(payload.name).trim() : undefined;
  const description =
    payload?.description !== undefined ? String(payload.description).trim() : undefined;

  if (name !== undefined) {
    if (!name) {
      throw new Error('Name cannot be empty', { cause: 400 });
    }
    const duplicate = await WasteCategory.findOne({
      _id: { $ne: id },
      name: { $regex: new RegExp(`^${escapeRegex(name)}$`, 'i') },
    });
    if (duplicate) {
      throw new Error('Category name already exists', { cause: 409 });
    }
    category.name = name;
  }
  if (description !== undefined) {
    if (!description) {
      throw new Error('Description cannot be empty', { cause: 400 });
    }
    category.description = description;
  }
  if (name === undefined && description === undefined) {
    throw new Error('At least one of name or description is required', { cause: 400 });
  }

  await category.save();
  return category;
};
export const getCategories = async () => {
  const categories = await WasteCategory.find()
  .sort({ createdAt: -1 });
  return categories;
};