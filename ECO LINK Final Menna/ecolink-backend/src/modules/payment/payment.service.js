import crypto from 'crypto';
import mongoose from 'mongoose';
import { Deal } from '../../DB/models/deal.model.js';
import { Order } from '../../DB/models/order.model.js';
import { Payment } from '../../DB/models/payment.model.js';
import { ensureFactoryForUser } from '../factories/factories.service.js';
import { Commission } from '../../DB/models/commission.model.js';
import {
  computeCommission,
  settleSuccessfulPayment,
} from '../../utils/payment/settleSuccessfulPayment.js';
import { createNotification } from '../notification/notification.service.js';

/** Test card that simulates a successful charge. Any other 16-digit card declines. */
const TEST_SUCCESS_CARD = '4111111111111111';

const assertBuyer = (user) => {
  if (user.currentRole === 'seller') {
    throw new Error('Only buyers can trigger payment notifications', { cause: 403 });
  }
};

export const notifySellerOnSuccessfulPayment = async (orderId, commission) => {
  const order = await Order.findById(orderId)
    .populate({ path: 'buyer', populate: { path: 'user', select: 'firstName lastName' } })
    .populate({ path: 'seller', populate: { path: 'user', select: '_id firstName lastName' } })
    .populate('waste', 'title currency');

  const sellerUserId = order?.seller?.user?._id;
  const buyerUser = order?.buyer?.user;
  const waste = order?.waste;
  if (!sellerUserId || !buyerUser || !waste) {
    throw new Error('Order data incomplete for seller notification', { cause: 400 });
  }

  const buyerName = `${buyerUser.firstName} ${buyerUser.lastName}`.trim();
  const wasteName = waste.title;
  const commissionAmount = commission?.amount ?? computeCommission(order.totalAmount).amount;
  const sellerAmount =
    Math.round((Number(order.totalAmount) - Number(commissionAmount)) * 100) / 100;
  const currency = order.currency || waste.currency || 'USD';

  return createNotification({
    userId: sellerUserId,
    type: 'payment',
    title: 'New sale',
    body: `Buyer ${buyerName} has bought ${wasteName} and the amount after the deduction of 10% commission is ${sellerAmount} ${currency}`,
    relatedId: order._id,
  });
};

export const sendPaymentNotificationToSeller = async (user, orderId) => {
  assertBuyer(user);

  if (!mongoose.isValidObjectId(orderId)) {
    throw new Error('Invalid order id', { cause: 400 });
  }

  const buyer = await ensureFactoryForUser(user);
  const order = await Order.findById(orderId);
  if (!order) throw new Error('Order not found', { cause: 404 });
  if (String(order.buyer) !== String(buyer._id)) {
    throw new Error('Forbidden', { cause: 403 });
  }
  if (order.status !== 'completed') {
    throw new Error('Order must be paid before notifying the seller', { cause: 400 });
  }

  const payment = await Payment.findOne({ order: order._id, status: 'paid' });
  if (!payment) {
    throw new Error('No successful payment found for this order', { cause: 400 });
  }

  const commission =
    (await Commission.findOne({ order: order._id })) ??
    computeCommission(order.totalAmount);

  return notifySellerOnSuccessfulPayment(order._id, commission);
};

export const makePayment = async (user, orderId, cardNumber) => {
  assertBuyer(user)
  if (!mongoose.isValidObjectId(orderId)) {
    throw new Error('Invalid order id', { cause: 400 });
  }

  const buyer = await ensureFactoryForUser(user);
  const order = await Order.findById(orderId);
  if (!order) throw new Error('Order not found', { cause: 404 });
  if (String(order.buyer) !== String(buyer._id)) {
    throw new Error('Forbidden', { cause: 403 });
  }

  const existingDeal = await Deal.findOne({ order: order._id });
  if (existingDeal?.status === 'completed' || order.status === 'completed') {
    throw new Error('Order already paid', { cause: 409 });
  }

  const transactionId = crypto.randomUUID();
  const success = cardNumber === TEST_SUCCESS_CARD;

  if (!success) {
    const payment = await Payment.create({
      order: order._id,
      amount: order.totalAmount,
      method: 'card',
      transactionId,
      status: 'failed',
    });

    return { success: false, transactionId, payment };
  }

  // const session = await mongoose.startSession();
  // let result;

  // try {
  //   await session.withTransaction(async () => {
  //     result = await settleSuccessfulPayment({ order, transactionId, session });
  //   });
  // } finally {
  //   await session.endSession();
  // }
  const result = await settleSuccessfulPayment({ order, transactionId });

  try {
    await sendPaymentNotificationToSeller(user, order._id);
  } catch (err) {
    console.error('Failed to notify seller after payment:', err.message);
  }

  return {
    success: true,
    transactionId,
    payment: result.payment,
    commission: result.commission,
    deal: result.deal,
  };
};
