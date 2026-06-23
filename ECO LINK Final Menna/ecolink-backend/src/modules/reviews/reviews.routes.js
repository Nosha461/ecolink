import express from 'express';
import { isAuthenticated, allowTo } from '../../middleware/auth.middleware.js';
import { validateRequest } from '../../middleware/validation.middleware.js';
import * as reviewsController from './reviews.controller.js';
import {
  validateCreateReview,
  validateUpdateReview,
  validateNotifySellerReview,
} from './reviews.validation.js';

const router = express.Router();

router.get('/list-review', reviewsController.list);
router.post(
  '/notify-seller',
  isAuthenticated,
  allowTo('buyer'),
  validateRequest(validateNotifySellerReview),
  reviewsController.notifySeller
);
router.post('/add-review', isAuthenticated, allowTo('buyer'), validateRequest(validateCreateReview), reviewsController.create);
router.delete('/delete-review/:reviewId', isAuthenticated, allowTo('buyer'), reviewsController.remove);
router.put('/update-review/:id', isAuthenticated, allowTo('buyer'), validateRequest(validateUpdateReview), reviewsController.update);
export default router;

