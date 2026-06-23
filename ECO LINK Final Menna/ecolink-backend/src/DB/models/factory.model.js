import mongoose from 'mongoose';

const { Schema } = mongoose;

const FactorySchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    country: { type: String, trim: true },
    description: { type: String, trim: true },
    logoUrl: { type: String, trim: true },
  },
  { timestamps: true }
);

export const Factory = mongoose.model('Factory', FactorySchema);
//C:\Users\Menna kamal\Downloads\Telegram Desktop\ECO LINK full-2\ECO LINK full\ECO LINK\ecolink-backend\src\DB\models\factory.model.js