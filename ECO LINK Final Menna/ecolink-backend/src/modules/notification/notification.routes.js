import express from 'express';
import { isAuthenticated } from '../../middleware/auth.middleware.js';
import * as notificationController from './notification.controller.js';

const router = express.Router();

router.use(isAuthenticated);
router.get('/', notificationController.getMyNotifications);
router.patch('/:id/read', notificationController.markNotificationAsRead);
router.get('/unread-count', notificationController.getUnreadCount);
export default router;

//C:\Users\Menna kamal\Downloads\Telegram Desktop\ECO LINK (3)\ECO LINK\ecolink-backend\src\modules\notification\notification.routes.js
