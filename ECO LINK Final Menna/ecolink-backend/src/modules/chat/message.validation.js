import mongoose from 'mongoose';

export const validateMongoId = (id, fieldName) => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return `${fieldName} must be a valid ObjectId`;
  }

  return null;
};

export const validateMessagePayload = ({ senderId, receiverId, message } = {}) => {
  const senderError = validateMongoId(senderId, 'senderId');
  if (senderError) return senderError;

  const receiverError = validateMongoId(receiverId, 'receiverId');
  if (receiverError) return receiverError;

  if (!message || typeof message !== 'string' || !message.trim()) {
    return 'message is required';
  }

  if (message.trim().length > 2000) {
    return 'message is too long (max 2000 chars)';
  }

  return null;
};
//C:\Users\Menna kamal\Downloads\Telegram Desktop\ECO LINK (3)\ECO LINK\ecolink-backend\src\modules\chat\message.validation.js