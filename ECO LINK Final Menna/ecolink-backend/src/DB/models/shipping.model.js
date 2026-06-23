import mongoose from 'mongoose';

const { Schema } = mongoose;

const SHIPPING_STATUS = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

const ShippingSchema = new Schema(
  {
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
    address: { type: String, required: true, trim: true },
    city: { type: String, trim: true },
    country: { type: String, trim: true },
    trackingNumber: { type: String, trim: true },
    carrier: { type: String, trim: true },
    status: { type: String, enum: SHIPPING_STATUS, default: 'pending' },
    shippedAt: { type: Date },
    deliveredAt: { type: Date },
  },
  { timestamps: true }
);

export const Shipping = mongoose.model('Shipping', ShippingSchema);
export { SHIPPING_STATUS };
