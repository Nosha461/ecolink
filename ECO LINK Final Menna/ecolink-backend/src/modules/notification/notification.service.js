import { Notification } from '../../DB/models/notification.model.js';
import { validateNotificationInput } from './notification.validation.js';
import { getSocketIdByUserId } from '../sockets/socket.registry.js';
import { getIo } from '../sockets/index.js';
import { User } from '../../DB/models/user.model.js';
import { sendEmail } from '../../utils/email/index.js';
// ================= CREATE NOTIFICATION =================
const emailTypes = ["order", "payment", "security", "otp"];
export const createNotification = async (data) => {
  const validationError = validateNotificationInput(data);
  if (validationError) {
    const error = new Error(validationError);
    error.cause = 400;
    throw error;
  }

  const notification = await Notification.create({
    userId: data.userId,
    type: data.type,
    title: data.title.trim(),
    body: data.body.trim(),
    relatedId: data.relatedId || undefined,
    isRead: false,
  });

  try {
    // ================= SOCKET (زي ما هو) =================
    const sent = await sendNotificationToUser(data.userId, notification);

    if (!sent) {
      console.log(`📴 User ${data.userId} is offline → stored only`);
    }


// ================= EMAIL ADDITION =================
const user = await User.findById(data.userId);

if (emailTypes.includes(data.type) && user?.email) {
  await sendEmail({
    to: user.email,
    subject: notification.title,
    html: `
      <h2>${notification.title}</h2>
      <p>${notification.body}</p>
      <hr/>
      <small>ECO LINK Notification</small>
    `,
  });
}



  } catch (error) {
    console.error('❌ Failed to send notification/email:', error.message);
  }

  return notification;
};

// ================= SEND REALTIME NOTIFICATION =================
export const sendNotificationToUser = async (userId, notification) => {
  const socketId = getSocketIdByUserId(userId);

  if (!socketId) return false;

  const io = getIo();
  if (!io) return false;

  io.to(socketId).emit('notification', notification);

  return true;
};

// ================= GET USER NOTIFICATIONS =================
export const getUserNotifications = async (userId) =>
  Notification.find({ userId }).sort({ createdAt: -1 });

// ================= GET UNREAD COUNT =================
export const getUnreadCount = async (userId) => {
  return Notification.countDocuments({
    userId,
    isRead: false
  });
};
// ================= MARK AS READ =================
export const markAsRead = async (notificationId, userId) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    const error = new Error('Notification not found');
    error.cause = 404;
    throw error;
  }

  return notification;
};
// ================= DELIVER UNREAD NOTIFICATIONS =================
export const deliverUnreadNotifications = async (userId) => {
  try {
    const unreadNotifications = await Notification.find({
      userId,
      isRead: false,
      isDelivered: false
    }).sort({ createdAt: 1 });

    const socketId = getSocketIdByUserId(userId);

    // لو user offline → مفيش إرسال realtime
    if (!socketId) return 0;

    for (const notification of unreadNotifications) {
      await sendNotificationToUser(userId, notification);
    }

    await Notification.updateMany(
      {
        userId,
        isRead: false,
        isDelivered: false
      },
      {
        isDelivered: true
      }
    );

    return unreadNotifications.length;

  } catch (error) {
    console.error('❌ Error delivering unread notifications:', error);
    return 0;
  }
};

//C:\Users\Menna kamal\Downloads\Telegram Desktop\ECO LINK (3)\ECO LINK\ecolink-backend\src\modules\notification\notification.service.js