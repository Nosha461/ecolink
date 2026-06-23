import mongoose from 'mongoose';

const { Schema } = mongoose;

const NOTIFICATION_TYPES = ['message', 'order', 'payment', 'request','delete_item'];

const NotificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    body: { type: String, required: true, trim: true, maxlength: 500 },
    isRead: { type: Boolean, default: false },
isDelivered: { type: Boolean, default: false },
    relatedId: { type: Schema.Types.ObjectId, required: false },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, type: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
// NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });


export const Notification = mongoose.model('Notification', NotificationSchema);
export { NOTIFICATION_TYPES };
//C:\Users\Menna kamal\Downloads\Telegram Desktop\ECO LINK (3)\ECO LINK\ecolink-backend\src\DB\models\notification.model.js
