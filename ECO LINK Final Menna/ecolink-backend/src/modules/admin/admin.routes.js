import express from 'express';
import { isAuthenticated } from '../../middleware/auth.middleware.js';
import { requireAdmin } from '../../middleware/requireAdmin.middleware.js';
import { validateRequest } from '../../middleware/validation.middleware.js';
import * as adminController from './admin.controller.js';
import { validateUserIdParam, validateListingIdParam } from './admin.validation.js';
import { validateAddCategory } from '../wasteCategory/category.validation.js';

const router = express.Router();

router.use(isAuthenticated, requireAdmin);

// Dashboard statistics
router.get('/stats', adminController.getStats);

// User management
router.get('/list-users', adminController.getUsers);
router.patch('/users/:userId/block',validateRequest((_, req) => validateUserIdParam(req.params)),adminController.blockUser);
router.patch('/users/:userId/unblock',validateRequest((_, req) => validateUserIdParam(req.params)),adminController.unblockUser);
router.delete('/users/:userId/delete',validateRequest((_, req) => validateUserIdParam(req.params)),adminController.deleteUser);

// Listings management
router.get('/listings', adminController.getListings);
router.delete('/listings/:listingId/delete',validateRequest((_, req) => validateListingIdParam(req.params)),adminController.removeListing);

// Category management
router.post('/add-category', validateRequest(validateAddCategory), adminController.addCategory);

// Payment monitoring
router.get('/list-payments', adminController.getPayments);
router.get('/list-commissions', adminController.getCommissions);
router.get('/list-completed-deals', adminController.getCompletedDeals);

export default router;
