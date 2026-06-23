import mongoose from 'mongoose';

const { Schema } = mongoose;

const ReviewSchema = new Schema(
  {
    waste: { type: Schema.Types.ObjectId, ref: 'Waste', required: true },
    factory: { type: Schema.Types.ObjectId, ref: 'Factory', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Factory', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true },
  },
  { timestamps: true }
);

ReviewSchema.index({ waste: 1, createdBy: 1 }, { unique: true });
ReviewSchema.index({ factory: 1, createdAt: -1 });
ReviewSchema.index({ waste: 1, createdAt: -1 });

export const Review = mongoose.model('Review', ReviewSchema);
