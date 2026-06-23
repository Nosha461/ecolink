import mongoose from 'mongoose';

const { Schema } = mongoose;

const WasteCategorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const WasteCategory = mongoose.model('WasteCategory', WasteCategorySchema);
