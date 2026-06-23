import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Ledger row: successful take after Paymob settlement.
 * Payout to seller bank/wallet should debit these rows (separate payout module / cron).
 */
const SellerBalanceSchema = new Schema(
  {
    seller: { type: Schema.Types.ObjectId, ref: 'Factory', required: true, index: true },
    payment: { type: Schema.Types.ObjectId, ref: 'Payment', required: true, unique: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, trim: true, uppercase: true },
    /** Extend when you add payouts: e.g. scheduled | paid | reversed */
    payoutStatus: {
      type: String,
      enum: ['pending_payout', 'paid_out'],
      default: 'pending_payout',
    },
  },
  { timestamps: true }
);

export const SellerBalance = mongoose.model('SellerBalance', SellerBalanceSchema);
