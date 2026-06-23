import mongoose from 'mongoose';

const { Schema } = mongoose;

/** Platform commission (10%) recorded only when a payment succeeds. */
const CommissionSchema = new Schema(
  {
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true, unique: true, index: true },
    payment: { type: Schema.Types.ObjectId, ref: 'Payment', required: true, unique: true, index: true },
    paymentAmount: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },
    rate: { type: Number, required: true, default: 0.1 },
    currency: { type: String, required: true, trim: true, uppercase: true },
  },
  { timestamps: true }
);

export const Commission = mongoose.model('Commission', CommissionSchema);
