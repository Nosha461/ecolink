import { asyncHandler } from '../../utils/error/index.js';
import * as wasteService from './waste.service.js';

export const add = asyncHandler(async (req, res) => {
  if (req.files?.length) {
    req.body.images = req.files.map((file) => file.finalPath);
  }

  const waste = await wasteService.addWaste(req.user, req.body);
  res.status(201).json({ success: true, data: waste });
});

export const list = asyncHandler(async (req, res) => {
  const wastes = await wasteService.listWaste(req.query);
  res.status(200).json({ success: true, data: wastes });
});

export const getOne = asyncHandler(async (req, res) => {
  const waste = await wasteService.getWasteById(req.params.id);
  res.status(200).json({ success: true, data: waste });
});

export const update = asyncHandler(async (req, res) => {
  if (req.files?.length) {
    req.body.images = req.files.map((file) => file.finalPath);
  }

  const waste = await wasteService.updateWaste(req.user, req.params.id, req.body);
  res.status(200).json({ success: true, data: waste });
});

export const remove = asyncHandler(async (req, res) => {
  const result = await wasteService.deleteWaste(req.user, req.params.id);
  res.status(200).json({ success: true, data: result });
});

// ================= SEARCH =================
export const search = asyncHandler(async (req, res) => {
  const { search } = req.query;

  const data = await wasteService.searchWaste(search);

  res.status(200).json({
    success: true,
    data
  });
});