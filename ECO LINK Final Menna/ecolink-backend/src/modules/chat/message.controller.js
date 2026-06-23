import * as messageService from './message.service.js';
import { getOnlineUserIds } from '../sockets/socket.registry.js';
import { Message } from '../../DB/models/message.model.js';
import { User } from '../../DB/models/user.model.js';

// ================= GET CONVERSATION =================
export const getConversation = async (req, res, next) => {
  try {
    const messages = await Message.find({
      $or: [
        { senderId: req.user._id, receiverId: req.params.userId },
        { senderId: req.params.userId, receiverId: req.user._id },
      ],
    }).sort({ createdAt: 1 });

    return res.status(200).json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
};

// ================= MARK CONVERSATION AS SEEN =================
export const markConversationAsSeen = async (req, res, next) => {
  try {
    await messageService.markConversationAsSeen({
      viewerId: req.user._id,
      otherUserId: req.params.userId,
    });
    return res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

// ================= GET CHAT USERS =================
export const getChatUsers = async (req, res, next) => {
  try {
    const users = await messageService.getChatUsers(
      req.user._id,
      getOnlineUserIds()
    );
    return res.status(200).json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

// ================= GET CHAT LIST =================
export const getChatList = async (req, res, next) => {
  try {
    const chats = await messageService.getChatList(req.user._id);
    return res.status(200).json({ success: true, data: chats });
  } catch (err) {
    next(err);
  }
};

// ================= SEND MESSAGE =================
export const sendMessage = async (req, res, next) => {
  try {
    const { receiverId, message } = req.body;

    if (!receiverId || !message) {
      return res.status(400).json({
        success: false,
        message: "receiverId and message are required",
      });
    }

    const newMessage = await Message.create({
      senderId: req.user._id,
      receiverId,
      message: message.trim(),
      status: "sent",
    });

    return res.status(201).json({ success: true, data: newMessage });
  } catch (err) {
    next(err);
  }
};

// ================= GET CONVERSATION STATUS ✅ =================
export const getConversationStatus = async (req, res, next) => {
  try {
    const data = await messageService.getConversationStatus(
      req.user._id,
      req.params.userId
    );
    return res.status(200).json({ success: true, ...data });
  } catch (error) {
    next(error);
  }
};
//================== block user =================
export const blockUserController = async (req, res, next) => {
  try {
    const result = await messageService.blockUser(
      req.user._id,
      req.params.userId
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};