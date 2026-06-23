import { sendEmail } from '../../utils/email/index.js';
import { Message } from '../../DB/models/message.model.js';
import { Conversation } from '../../DB/models/conversation.model.js';
import { User } from '../../DB/models/user.model.js';
import mongoose from 'mongoose';

const isValidId = (id) => {
  if (!id) return false;
  return mongoose.Types.ObjectId.isValid(String(id).trim());
};

// ================= GET OR CREATE CONVERSATION =================
export const getOrCreateConversation = async (userA, userB) => {
  let convo = await Conversation.findOne({
    participants: { $all: [userA, userB] },
  });

  // ✅ لو موجود رجعه
  if (convo) {
    return convo;
  }

  // ✅ لو مش موجود اعمل جديد
  convo = await Conversation.create({
    participants: [userA, userB],
    status: "pending",
    requestedBy: userA,
  });

  const receiver = await User.findById(userB);

if (receiver?.email) {
  await sendEmail({
    to: receiver.email,
    subject: 'New Chat Request - ECO LINK',
    html: `
      <h2>New Chat Request</h2>
      <p>You received a new chat request.</p>
      <p>Login to ECO LINK to review it.</p>
    `,
  });
}

  return convo;
};

// ================= GET CONVERSATION STATUS =================
export const getConversationStatus = async (userA, userB) => {
  const convo = await Conversation.findOne({
    participants: { $all: [userA, userB] },
  });

  if (!convo) return { status: null };

return {
  status: convo.status,
  requestedBy: String(convo.requestedBy),
  convoId: String(convo._id), 
};
};

// ================= ACCEPT CONVERSATION =================
export const acceptConversation = async (convoId) => {
  return Conversation.findByIdAndUpdate(
    convoId,
    { status: 'accepted' },
    { new: true }
  );
};

// ================= REJECT CONVERSATION =================
export const rejectConversation = async (convoId) => {
  return Conversation.findByIdAndUpdate(
    convoId,
    { status: 'rejected' },
    { new: true }
  );
};

// ================= SEND MESSAGE =================
export const sendMessage = async (senderId, receiverId, message) => {

  if (!isValidId(senderId) || !isValidId(receiverId))
    throw new Error('Invalid user id');

  if (!message || typeof message !== 'string' || !message.trim())
    throw new Error('Message cannot be empty');

  const [sender, receiver] = await Promise.all([
    User.findById(senderId),
    User.findById(receiverId),
  ]);

  if (!sender) throw new Error('Sender does not exist');
  if (!receiver) throw new Error('Receiver not found');
if (
  sender.blockedUsers?.some(
    id => String(id) === String(receiverId)
  ) ||
  receiver.blockedUsers?.some(
    id => String(id) === String(senderId)
  )
) {
  throw new Error('You cannot send messages to this user');
}

  const convo = await Conversation.findOne({
    participants: { $all: [senderId, receiverId] },
  });

  if (!convo || convo.status === 'pending')
    return { chatStatus: 'pending' };

  if (convo.status === 'rejected')
    return { chatStatus: 'rejected' };

  const newMessage = await Message.create({
    senderId,
    receiverId,
    message: message.trim(),
    status: 'sent',
  });

  if (receiver?.email) {
  await sendEmail({
    to: receiver.email,
    subject: 'New Message - ECO LINK',
    html: `
      <h2>New Message</h2>
      <p>You have received a new unread message.</p>
      <p>${message}</p>
    `,
  });
}
return newMessage;
};

// ================= GET CONVERSATION =================
export const getConversation = async (currentUserId, otherUserId) => {
  if (!isValidId(currentUserId) || !isValidId(otherUserId))
    throw new Error('Invalid user id');

  return Message.find({
    $or: [
      { senderId: currentUserId, receiverId: otherUserId },
      { senderId: otherUserId, receiverId: currentUserId },
    ],
  }).sort({ createdAt: 1 });
};

// ================= MARK CONVERSATION AS SEEN =================
export const markConversationAsSeen = async ({ viewerId, otherUserId }) => {
  if (!isValidId(viewerId) || !isValidId(otherUserId))
    throw new Error('Invalid user id');

  return Message.updateMany(
    {
      senderId: otherUserId,
      receiverId: viewerId,
      status: { $in: ['sent', 'delivered'] },
    },
    { $set: { status: 'seen' } }
  );
};

// ================= GET CHAT USERS =================
export const getChatUsers = async (currentUserId, onlineUserIds = []) => {
  if (!isValidId(currentUserId))
    throw new Error('Invalid user id');

  const users = await User.find(
    { _id: { $ne: currentUserId } },
    'firstName lastName email profilePicture'
  ).sort({ firstName: 1 });

  const onlineSet = new Set((onlineUserIds || []).map(id => String(id)));

  return users.map(user => ({
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    profilePicture: user.profilePicture,
    isOnline: onlineSet.has(String(user._id)),
  }));
};

// ================= GET CHAT LIST =================
export const getChatList = async (userId) => {
  if (!isValidId(userId)) throw new Error('Invalid user id');

  const objectId = new mongoose.Types.ObjectId(userId);

  const chats = await Message.aggregate([
    { $match: { $or: [{ senderId: objectId }, { receiverId: objectId }] } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: {
          $cond: [{ $eq: ['$senderId', objectId] }, '$receiverId', '$senderId'],
        },
        lastMessage: { $first: '$message' },
        lastMessageTime: { $first: '$createdAt' },
        unreadCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$receiverId', objectId] },
                  { $in: ['$status', ['sent', 'delivered']] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
    { $sort: { lastMessageTime: -1 } },
  ]);

  return chats.map(chat => ({
    userId: chat._id,
    lastMessage: chat.lastMessage,
    lastMessageTime: chat.lastMessageTime,
    unreadCount: chat.unreadCount,
  }));
};

// ================= GET MESSAGE BY ID =================
export const getMessageById = async (id) => {
  if (!isValidId(id)) throw new Error('Invalid message id');
  return Message.findById(id);
};

// ================= DELETE MESSAGE =================
export const deleteMessage = async (messageId, userId) => {
  if (!isValidId(messageId) || !isValidId(userId))
    throw new Error('Invalid user id');

  const message = await Message.findOneAndDelete({
    _id: messageId,
    senderId: userId,
  });

  if (!message) throw new Error('Message not found or not authorized');
  return message;
};

// ================= MARK DELIVERED =================
export const markMessageDelivered = async (messageId) => {
  if (!isValidId(messageId)) throw new Error('Invalid message id');

  return Message.findByIdAndUpdate(
    { _id: messageId, status: 'sent' },
    { status: 'delivered' },
    { new: true }
  );
};

// ================= MARK SINGLE MESSAGE AS SEEN =================
export const markMessageAsSeen = async (messageId) => {
  if (!isValidId(messageId)) throw new Error('Invalid message id');

  return Message.findByIdAndUpdate(
    messageId,
    { status: 'seen' },
    { new: true }
  );
};

// ================= GET UNDELIVERED MESSAGES =================
export const getUndeliveredMessages = async (userId) => {
  if (!isValidId(userId)) throw new Error('Invalid user id');

  return Message.find({ receiverId: userId, status: 'sent' }).sort({
    createdAt: 1,
  });
};

//================= BLOCK USER =================
export const blockUser = async (userId, targetUserId) => {
  if (!isValidId(userId) || !isValidId(targetUserId)) {
    throw new Error('Invalid user id');
  }

  await User.findByIdAndUpdate(
    userId,
    {
      $addToSet: {
        blockedUsers: targetUserId,
      },
    },
    { new: true }
  );

  return {
    success: true,
    message: 'User blocked successfully',
  };
};


