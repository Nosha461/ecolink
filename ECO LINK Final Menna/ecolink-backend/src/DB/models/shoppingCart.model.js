import mongoose from 'mongoose';

const { Schema } = mongoose;

const ShoppingCartSchema = new Schema(
  {
    buyer: { type: Schema.Types.ObjectId, ref: 'Factory', required: true, unique: true },
  },
  { timestamps: true }
);

export const ShoppingCart = mongoose.model('ShoppingCart', ShoppingCartSchema);
