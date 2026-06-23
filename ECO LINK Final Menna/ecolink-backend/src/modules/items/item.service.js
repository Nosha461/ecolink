import mongoose from 'mongoose';
import { Item } from '../../DB/models/item.model.js';
import { WasteCategory } from '../../DB/models/wasteCategory.model.js';

const buildSort = (sort) => {
  if (sort === 'price_asc') return { price: 1 };
  if (sort === 'price_desc') return { price: -1 };
  return { createdAt: -1 };
};

const parsePagination = ({ page = 1, limit = 10 } = {}) => {
  const parsedPage = Math.max(1, Number(page) || 1);
  const parsedLimit = Math.min(100, Math.max(1, Number(limit) || 10));
  return { page: parsedPage, limit: parsedLimit };
};

const resolveCategoryFilter = async (category) => {
  if (!category) return null;

  if (mongoose.Types.ObjectId.isValid(category)) {
    return category;
  }

  const categoryDoc = await WasteCategory.findOne({
    name: { $regex: new RegExp(`^${category}$`, 'i') },
  }).select('_id');

  return categoryDoc?._id || null;
};

export const searchItems = async (query = {}) => {
  const { q, category, minPrice, maxPrice, sort } = query;
  const { page, limit } = parsePagination(query);

  const filters = {};
  const andConditions = [];

  if (q?.trim()) {
    andConditions.push({
      $or: [
        { title: { $regex: q.trim(), $options: 'i' } },
        { description: { $regex: q.trim(), $options: 'i' } },
      ],
    });
  }

  if (category) {
    const categoryId = await resolveCategoryFilter(category);
    if (categoryId) {
      filters.category = categoryId;
    } else {
      return { results: [], total: 0, page, pages: 0 };
    }
  }

  const hasMin = minPrice !== undefined && minPrice !== '';
  const hasMax = maxPrice !== undefined && maxPrice !== '';
  if (hasMin || hasMax) {
    filters.price = {};
    if (hasMin) filters.price.$gte = Number(minPrice);
    if (hasMax) filters.price.$lte = Number(maxPrice);
  }

  if (andConditions.length) {
    filters.$and = andConditions;
  }

  const skip = (page - 1) * limit;
  const sortObj = buildSort(sort);

  const [results, total] = await Promise.all([
    Item.find(filters)
      .select('title description price category createdAt status')
      .populate('category', 'name')
      .sort(sortObj)
      .skip(skip)
      .limit(limit),
    Item.countDocuments(filters),
  ]);

  return {
    results,
    total,
    page,
    pages: Math.ceil(total / limit),
  };
};

export const autocompleteItems = async (q) => {
  const keyword = (q || '').trim();
  if (!keyword) return [];

  const items = await Item.find({
    title: { $regex: keyword, $options: 'i' },
  })
    .select('title')
    .sort({ createdAt: -1 })
    .limit(5);

  return items.map((item) => item.title);
};
