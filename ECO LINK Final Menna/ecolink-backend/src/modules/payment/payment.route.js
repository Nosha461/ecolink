import express from 'express';
import { isAuthenticated, allowTo } from '../../middleware/auth.middleware.js';
import { validateRequest } from '../../middleware/validation.middleware.js';
import * as mockPaymentController from './payment.controller.js';
import { validateMockPayment, validateOrderIdParam } from './payment.validation.js';

const router = express.Router();

router.post(
  '/notify-seller/:orderId',
  isAuthenticated,
  allowTo('buyer'),
  validateRequest(validateOrderIdParam),
  mockPaymentController.notifySeller
);

router.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ success: false, message: 'Not found' });
  }
  next();
});

router.post(
  '/make-payment',
  isAuthenticated,
  validateRequest(validateMockPayment),
  mockPaymentController.charge
);

export default router;
