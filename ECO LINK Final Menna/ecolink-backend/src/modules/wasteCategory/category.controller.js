import { asyncHandler } from '../../utils/error/index.js';
import * as categoryService from './category.service.js';

export const create = asyncHandler(async (req, res) => {
  const category = await categoryService.addCategory(req.body, req.user);
  res.status(201).json({ success: true, data: category });
});

export const remove = asyncHandler(async (req, res) => {
  const result = await categoryService.removeCategory(req.params.id);
  res.status(200).json({ success: true, data: result });
});

export const getCategoryById = asyncHandler(async (req, res) => {
  const category = await categoryService.getCategoryById(req.params.id);
  res.status(200).json({ success: true, data: category });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.updateCategory(req.params.id, req.body);
  res.status(200).json({ success: true, data: category });
});

export const getCategories = asyncHandler(async (req, res) => {
  const categories = await categoryService.getCategories();
  res.status(200).json({ success: true, data: categories });
});