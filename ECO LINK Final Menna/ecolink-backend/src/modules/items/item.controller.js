import { asyncHandler } from '../../utils/error/index.js';
import * as itemService from './item.service.js';

export const search = asyncHandler(async (req, res) => {
  const data = await itemService.searchItems(req.query);
  res.status(200).json(data);
});

export const autocomplete = asyncHandler(async (req, res) => {
  const suggestions = await itemService.autocompleteItems(req.query.q);
  res.status(200).json({ results: suggestions });
});
