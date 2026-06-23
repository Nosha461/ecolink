import mongoose from 'mongoose';

const { Schema } = mongoose;

const ORDER_STATUS = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];

const OrderSchema = new Schema(
  {
    buyer: { type: Schema.Types.ObjectId, ref: 'Factory', required: true },
    waste: { type: Schema.Types.ObjectId, ref: 'Waste', required: true },
    seller: { type: Schema.Types.ObjectId, ref: 'Factory', required: true },
    quantity: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD', trim: true },
    status: { type: String, enum: ORDER_STATUS, default: 'pending' },
  },
  { timestamps: true }
);

export const Order = mongoose.model('Order', OrderSchema);
export { ORDER_STATUS };
//C:\Users\Menna kamal\Downloads\Telegram Desktop\ECO LINK full-2\ECO LINK full\ECO LINK\ecolink-backend\src\DB\models\order.model.js