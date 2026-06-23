import mongoose from 'mongoose';

const { Schema } = mongoose;

const WASTE_STATUS = ['draft', 'available', 'reserved', 'sold', 'out_of_stock', 'archived'];

const WasteSchema = new Schema(
  {
    factory: { type: Schema.Types.ObjectId, ref: 'Factory', required: true },
    category: { type: Schema.Types.ObjectId, ref: 'WasteCategory', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, default: 'kg', trim: true },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD', trim: true },
    images: [{ type: String, trim: true }],
    status: { type: String, enum: WASTE_STATUS, default: 'available' },
    location: { type: String, default: 'Cairo'}

    
  },
  { timestamps: true }
);

// Search and filter indexes
WasteSchema.index({ title: 'text', description: 'text' });
WasteSchema.index({ category: 1 });
WasteSchema.index({ price: 1 });
WasteSchema.index({ createdAt: -1 });

export const Waste = mongoose.model('Waste', WasteSchema);
export { WASTE_STATUS };
//C:\Users\Menna kamal\Downloads\Telegram Desktop\ECO LINK full-2\ECO LINK full\ECO LINK\ecolink-backend\src\DB\models\waste.model.js