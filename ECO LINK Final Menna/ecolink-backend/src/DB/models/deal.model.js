import mongoose from 'mongoose';

const { Schema } = mongoose;

const DEAL_STATUS = ['completed', 'non_completed'];

/**
 * One deal row per order. Successful payment marks it completed; all others stay non_completed.
 */
const DealSchema = new Schema(
  {
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true, unique: true, index: true },
    status: { type: String, enum: DEAL_STATUS, default: 'non_completed', index: true },
    payment: { type: Schema.Types.ObjectId, ref: 'Payment' },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

export const Deal = mongoose.model('Deal', DealSchema);
export { DEAL_STATUS };
