import mongoose from 'mongoose';

const { Schema } = mongoose;

export const PURCHASE_REQUEST_STATUS = ['pending', 'accepted', 'declined', 'cancelled'];

const PurchaseRequestSchema = new Schema(
  {
    buyerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    wasteId: { type: Schema.Types.ObjectId, ref: 'Waste', required: true },
    quantity: { type: Number, required: true, min: 1 },
    offeredPrice: { type: Number, min: 0 },
    message: { type: String, trim: true },
    status: {
      type: String,
      enum: PURCHASE_REQUEST_STATUS,
      default: 'pending',
      index: true,
    },
  },
  { timestamps: true }
);

// Fast lookups for "is buyer accepted for waste?"
PurchaseRequestSchema.index({ buyerId: 1, wasteId: 1, status: 1 });

export const PurchaseRequest = mongoose.model('PurchaseRequest', PurchaseRequestSchema);

//C:\Users\Menna kamal\Downloads\Telegram Desktop\ECO LINK full-2\ECO LINK full\ECO LINK\ecolink-backend\src\DB\models\purchaseRequest.model.js