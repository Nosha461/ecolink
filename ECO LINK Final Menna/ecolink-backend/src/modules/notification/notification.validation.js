import mongoose from 'mongoose';

export const NOTIFICATION_TYPES = ['message', 'order', 'payment','request', 'delete_item'];

export const validateNotificationInput = ({ userId, type, title, body } = {}) => {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return 'userId must be a valid ObjectId';
  }

  if (!type || !NOTIFICATION_TYPES.includes(type)) {
    return `type must be one of: ${NOTIFICATION_TYPES.join(', ')}`;
  }

  if (!title || typeof title !== 'string' || !title.trim()) {
    return 'title is required';
  }

  if (!body || typeof body !== 'string' || !body.trim()) {
    return 'body is required';
  }

  return null;
};
//C:\Users\Menna kamal\Downloads\Telegram Desktop\ECO LINK (3)\ECO LINK\ecolink-backend\src\modules\notification\notification.validation.js
