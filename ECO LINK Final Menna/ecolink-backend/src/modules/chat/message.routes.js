import express from 'express';
import { isAuthenticated } from '../../middleware/auth.middleware.js';
import * as messageController from './message.controller.js';
import { blockUserController } from './message.controller.js';
const router = express.Router();

router.use(isAuthenticated);

router.get('/users', messageController.getChatUsers);
router.get('/conversation/:userId', messageController.getConversation);
router.patch('/conversation/:userId/seen', messageController.markConversationAsSeen);
router.get('/chat-list', messageController.getChatList);
router.post('/send', messageController.sendMessage);
router.post('/block/:userId',isAuthenticated, blockUserController);
router.get('/conversation-status/:userId', messageController.getConversationStatus);

export default router;


//C:\Users\Menna kamal\Downloads\Telegram Desktop\ECO LINK (3)\ECO LINK\ecolink-backend\src\modules\chat\message.routes.js
