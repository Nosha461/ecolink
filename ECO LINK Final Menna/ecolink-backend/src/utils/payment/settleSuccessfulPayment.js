import { Commission } from '../../DB/models/commission.model.js';
import { Deal } from '../../DB/models/deal.model.js';
import { Order } from '../../DB/models/order.model.js';
import { Payment } from '../../DB/models/payment.model.js';
import { Waste } from '../../DB/models/waste.model.js';

export const COMMISSION_RATE = 0.1;

export function computeCommission(paymentAmount) {
  const total = Number(paymentAmount);
  const amount = Math.round(total * COMMISSION_RATE * 100) / 100;
  return { paymentAmount: total, amount, rate: COMMISSION_RATE };
}

/**
 * Persists payment + 10% commission + completed deal in one transaction.
 */
export async function settleSuccessfulPayment({ order, transactionId, session }) {
  const { paymentAmount, amount, rate } = computeCommission(order.totalAmount);

  const payment = await Payment.create(
    [
      {
        order: order._id,
        amount: paymentAmount,
        method: 'card',
        transactionId,
        status: 'paid',
      },
    ],
    { session }
  ).then((docs) => docs[0]);

  const commission = await Commission.create(
    [
      {
        order: order._id,
        payment: payment._id,
        paymentAmount,
        amount,
        rate,
        currency: order.currency || 'USD',
      },
    ],
    { session }
  ).then((docs) => docs[0]);

  const deal = await Deal.findOneAndUpdate(
    { order: order._id },
    {
      $set: {
        status: 'completed',
        payment: payment._id,
        completedAt: new Date(),
      },
      $setOnInsert: { order: order._id },
    },
    { new: true, session, upsert: true }
  );

  await Order.findByIdAndUpdate(order._id, { $set: { status: 'completed' } }, { session });

  if (order.waste) {
    await Waste.findByIdAndUpdate(
      order.waste,
      { $set: { status: 'out_of_stock' } },
      { session }
    );
  }

  return { payment, commission, deal };
}
