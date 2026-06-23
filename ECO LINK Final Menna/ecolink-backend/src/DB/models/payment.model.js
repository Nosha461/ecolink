import mongoose from 'mongoose';

const { Schema } = mongoose;

const PAYMENT_STATUS = ['pending', 'paid', 'failed', 'refunded'];
const PAYMENT_METHOD = ['cash', 'card', 'bank_transfer', 'wallet'];

const PaymentSchema = new Schema(
  {
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD', trim: true },
    method: { type: String, enum: PAYMENT_METHOD, default: 'cash' },
    status: { type: String, enum: PAYMENT_STATUS, default: 'pending' },
    transactionId: { type: String, trim: true },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

export const Payment = mongoose.model('Payment', PaymentSchema);
export { PAYMENT_STATUS, PAYMENT_METHOD };
