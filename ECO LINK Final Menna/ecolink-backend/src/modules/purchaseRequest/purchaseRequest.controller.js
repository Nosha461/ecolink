import { asyncHandler } from '../../utils/error/index.js';
import * as purchaseRequestService from './purchaseRequest.service.js';

export const create = asyncHandler(async (req, res) => {
  const request = await purchaseRequestService.createRequest(req.user, req.body);
  res.status(201).json({ success: true, data: request });
});

export const getWasteRequests = asyncHandler(async (req, res) => {
  const data = await purchaseRequestService.getWasteRequests(req.user, req.params.wasteId);
  res.status(200).json({ success: true, data });
});

export const accept = asyncHandler(async (req, res) => {
  const data = await purchaseRequestService.acceptRequest(req.user, req.params.id);
  res.status(200).json({ success: true, data });
});

export const decline = asyncHandler(async (req, res) => {
  const data = await purchaseRequestService.declineRequest(req.user, req.params.id);
  res.status(200).json({ success: true, data });
});

//C:\Users\Menna kamal\Downloads\Telegram Desktop\ECO LINK full-2\ECO LINK full\ECO LINK\ecolink-backend\src\modules\purchaseRequest\purchaseRequest.controller.js
// ================= GET MY REQUESTS (for buyer) =================
export const getMyRequests = asyncHandler(async (req, res) => {
  const data = await purchaseRequestService.getMyRequests(req.user);
  res.status(200).json({ success: true, data });
});

// ================= GET MY ACCEPTED REQUESTS (for buyer) =================
export const getMyAcceptedRequests = asyncHandler(async (req, res) => {
  const data = await purchaseRequestService.getMyAcceptedRequests(req.user);
  res.status(200).json({ success: true, data });
});

// ================= GET SPECIFIC REQUEST STATUS =================
export const getRequestStatus = asyncHandler(async (req, res) => {
  const data = await purchaseRequestService.getRequestStatus(req.user, req.params.id);
  res.status(200).json({ success: true, data });
});

// ================= CANCEL PENDING REQUEST =================
export const cancelRequest = asyncHandler(async (req, res) => {
  const data = await purchaseRequestService.cancelRequest(req.user, req.params.id);
  res.status(200).json({ success: true, data });
});