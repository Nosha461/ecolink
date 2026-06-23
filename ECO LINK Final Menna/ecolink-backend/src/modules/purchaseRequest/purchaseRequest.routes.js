import express from 'express';
import { isAuthenticated, allowTo } from '../../middleware/auth.middleware.js';
import { validateRequest } from '../../middleware/validation.middleware.js';
import * as purchaseRequestController from './purchaseRequest.controller.js';
import {
  validateCreatePurchaseRequest,
  validateRequestIdParamFromReq,
  validateWasteIdParamFromReq,
} from './purchaseRequest.validation.js';

const router = express.Router();

// Buyer creates a purchase request to supplier of a waste listing
router.post(
  '/send-request',
  isAuthenticated,
  allowTo('buyer'),
  validateRequest(validateCreatePurchaseRequest),
  purchaseRequestController.create
);

// Supplier views requests for a specific waste listing
router.get(
  '/view-request/:wasteId',
  isAuthenticated,
  allowTo('seller'),
  validateRequest(validateWasteIdParamFromReq),
  purchaseRequestController.getWasteRequests
);

// Supplier accepts a specific request (auto-declines other pending)
router.patch(
  '/accept-request/:id',
  isAuthenticated,
  allowTo('seller'),
  validateRequest(validateRequestIdParamFromReq),
  purchaseRequestController.accept
);

// Supplier declines a specific request
router.patch(
  '/decline-request/:id',
  isAuthenticated,
  allowTo('seller'),
  validateRequest(validateRequestIdParamFromReq),
  purchaseRequestController.decline
);

// ================= BUYER ROUTES =================
// Get all my purchase requests
router.get(
  '/my-requests',
  isAuthenticated,
  allowTo('buyer'),
  purchaseRequestController.getMyRequests
);

// Get my accepted requests (that can be converted to orders)
router.get(
  '/my-accepted-requests',
  isAuthenticated,
  allowTo('buyer'),
  purchaseRequestController.getMyAcceptedRequests
);

// Get specific request status (for both buyer & supplier)
router.get(
  '/request-status/:id',
  isAuthenticated,
  validateRequest(validateRequestIdParamFromReq),
  purchaseRequestController.getRequestStatus
);

// Cancel pending request
router.patch(
  '/cancel-request/:id',
  isAuthenticated,
  allowTo('buyer'),
  validateRequest(validateRequestIdParamFromReq),
  purchaseRequestController.cancelRequest
);


export default router;

//C:\Users\Menna kamal\Downloads\Telegram Desktop\ECO LINK full-2\ECO LINK full\ECO LINK\ecolink-backend\src\modules\purchaseRequest\purchaseRequest.routes.js