import { asyncHandler } from '../../utils/error/index.js';
import * as paymentService from './payment.service.js';

export const charge = asyncHandler(async (req, res) => {
  const { orderId, cardNumber } = req.body;
  const result = await paymentService.makePayment(req.user, orderId, cardNumber);

  if (!result.success) {
    return res.status(402).json({
      success: false,
      message: 'Payment declined',
      transactionId: result.transactionId,
      payment: result.payment,
    });
  }

  res.status(200).json({
    success: true,
    message: 'Payment successful',
    transactionId: result.transactionId,
    payment: result.payment,
    commission: result.commission,
    deal: result.deal,
  });
});

export const notifySeller = asyncHandler(async (req, res) => {
  const notification = await paymentService.sendPaymentNotificationToSeller(
    req.user,
    req.params.orderId
  );
  res.status(200).json({
    success: true,
    message: 'Seller notified about successful payment',
    data: notification,
  });
});
