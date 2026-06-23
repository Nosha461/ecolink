import * as notificationService from './notification.service.js';

export const getMyNotifications = async (req, res, next) => {
  try {
    const notification = await notificationService.getUserNotifications(req.user._id);
    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
};

export const markNotificationAsRead = async (req, res, next) => {
  try {
    const notification = await notificationService.markAsRead(req.params.id, req.user._id);
    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
};


export const getUnreadCount = async (req, res, next) => {
  try {
    const count = await notificationService.getUnreadCount(req.user._id);

    res.status(200).json({
      success: true,
      unread: count
    });

  } catch (error) {
    next(error);
  }
};

//C:\Users\Menna kamal\Downloads\Telegram Desktop\ECO LINK (3)\ECO LINK\ecolink-backend\src\modules\notification\notification.controller.js
