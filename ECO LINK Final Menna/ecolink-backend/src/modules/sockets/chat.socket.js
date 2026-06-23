// // import { User } from '../../DB/models/user.model.js';
// // import * as messageService from '../chat/message.service.js';
// // import { validateMessagePayload, validateMongoId } from '../chat/message.validation.js';
// // import {
// //   registerOnlineUser,
// //   unregisterOnlineUser,
// //   getOnlineUserIds,
// //   getSocketIdByUserId,
// // } from './socket.registry.js';
// // import { deliverUnreadNotifications, createNotification } from '../notification/notification.service.js';

// // const emitOnlineUsers = (io) => {
// //   io.emit('onlineUsers', getOnlineUserIds());
// // };

// // const setOnline = async (userId, socketId) => {
// //   registerOnlineUser(userId, socketId);
// //   await User.findByIdAndUpdate(userId, { isOnline: true });
// // };

// // const setOffline = async (userId, socketId) => {
// //   const removed = unregisterOnlineUser(userId, socketId);
// //   if (removed) {
// //     await User.findByIdAndUpdate(userId, { isOnline: false });
// //   }
// // };

// // const pushPendingMessages = async (io, userId) => {
// //   try {
// //     const pendingMessages = await messageService.getUndeliveredMessages(userId);
// //     const receiverSocketId = getSocketIdByUserId(userId);

// //     if (!receiverSocketId || pendingMessages.length === 0) return;

// //     for (const messageDoc of pendingMessages) {
// //       io.to(receiverSocketId).emit('receiveMessage', messageDoc);
// //       await messageService.markMessageDelivered(messageDoc._id);
// //     }
// //   } catch (error) {
// //     console.error('Error pushing pending messages:', error);
// //   }
// // };

// // export const attachChatSocket = (io) => {
// //   io.on('connection', async (socket) => {
// //     const userId = String(socket.user.id);

// //     try {
// //       await setOnline(userId, socket.id);
// //       emitOnlineUsers(io);
// //       await pushPendingMessages(io, userId);

// //       const pending = await deliverUnreadNotifications(userId);
// //       if (pending > 0) {
// //         console.log(`${pending} notifications delivered`);
// //       }

// //       console.log(`User ${userId} connected via chat socket`);
// //     } catch (error) {
// //       console.error(`Error setting up user ${userId}:`, error);
// //     }

// //     // ================= SEND MESSAGE =================
// //     socket.on('sendMessage', async (payload = {}) => {
// //       try {
// //         const senderId = userId;
// //         const { receiverId, message } = payload;

// //         // validation بسيطة
// //         if (!receiverId || !message) {
// //           socket.emit("messageError", { message: "receiverId & message required" });
// //           return;
// //         }

// //         // 1. create message in DB
// //         const createdMessage = await messageService.createMessage({
// //           senderId,
// //           receiverId,
// //           message,
// //         });

// //         // نخلي شكلها موحد
// //         createdMessage.status = "sent";

// //         // 2. ابعت للـ sender (عشان يشوفها عنده فورًا)
// //         socket.emit('receiveMessage', createdMessage);

// //         // 3. ابعت للـ receiver لو أونلاين
// //         const receiverSocketId = getSocketIdByUserId(receiverId);

// //         if (receiverSocketId) {
// //           io.to(receiverSocketId).emit('receiveMessage', createdMessage);
// //         } else {
// //           // لو أوفلاين → notification
// //           await createNotification({
// //             userId: receiverId,
// //             type: 'message',
// //             title: 'New message',
// //             body: 'You have a new message',
// //             relatedId: createdMessage._id,
// //           });
// //         }
// //       } catch (error) {
// //         console.error('Send message error:', error);
// //         socket.emit('messageError', { message: error.message || 'Failed to send message' });
// //       }
// //     });

// //     // ================= CONVERSATION SEEN =================
// //     socket.on('conversationSeen', async ({ otherUserId } = {}) => {
// //       try {
// //         const idError = validateMongoId(otherUserId, 'otherUserId');
// //         if (idError) {
// //           socket.emit('messageError', { message: idError });
// //           return;
// //         }

// //         await messageService.markConversationAsSeen({
// //           viewerId: userId,
// //           otherUserId,
// //         });
// //       } catch (error) {
// //         console.error('Conversation seen error:', error);
// //         socket.emit('messageError', {
// //           message: error.message || 'Failed to mark as seen',
// //         });
// //       }
// //     });

// //     // ================= DISCONNECT =================
// //     socket.on('disconnect', async () => {
// //       try {
// //         await setOffline(userId, socket.id);
// //         emitOnlineUsers(io);
// //         console.log(`User ${userId} disconnected`);
// //       } catch (error) {
// //         console.error(`Error disconnecting user ${userId}:`, error);
// //       }
// //     });
// //   });
// // };

// // socket.on("deleteMessage", async ({ messageId }) => {
// //   try {
// //     const userId = socket.user.id;

// //     const message = await messageService.getMessageById(messageId);
// //     if (!message) return;

// //     // مسموح بس لصاحب الرسالة
// //     if (String(message.senderId) !== String(userId)) return;

// //     await messageService.deleteMessage(messageId);

// //     const receiverSocketId = getSocketIdByUserId(message.receiverId);

// //     // 🔥 ابعتي للطرفين
// //     socket.emit("messageDeleted", { messageId });

// //     if (receiverSocketId) {
// //       io.to(receiverSocketId).emit("messageDeleted", { messageId });
// //     }

// //   } catch (err) {
// //     console.error(err);
// //   }
// // });

// // socket.on("deleteMessage", async ({ messageId }) => {
// //   try {
// //     const userId = socket.user.id;

// //     const message = await messageService.getMessageById(messageId);
// //     if (!message) return;

// //     // مسموح بس لصاحب الرسالة
// //     if (String(message.senderId) !== String(userId)) return;

// //     await messageService.deleteMessage(messageId);

// //     const receiverSocketId = getSocketIdByUserId(message.receiverId);

// //     // 🔥 ابعتي للطرفين
// //     socket.emit("messageDeleted", { messageId });

// //     if (receiverSocketId) {
// //       io.to(receiverSocketId).emit("messageDeleted", { messageId });
// //     }

// //   } catch (err) {
// //     console.error(err);
// //   }
// // });


// //     // ================= deleteMessage =================

// //     socket.on("deleteMessage", async ({ messageId }) => {
// //   try {
// //     const userId = socket.user.id;

// //     const message = await messageService.getMessageById(messageId);
// //     if (!message) return;

// //     // مسموح بس لصاحب الرسالة
// //     if (String(message.senderId) !== String(userId)) return;

// //     await messageService.deleteMessage(messageId);

// //     const receiverSocketId = getSocketIdByUserId(message.receiverId);

// //     // 🔥 ابعتي للطرفين
// //     socket.emit("messageDeleted", { messageId });

// //     if (receiverSocketId) {
// //       io.to(receiverSocketId).emit("messageDeleted", { messageId });
// //     }

// //   } catch (err) {
// //     console.error(err);
// //   }
// // });



// import { User } from '../../DB/models/user.model.js';
// import * as messageService from '../chat/message.service.js';
// import { validateMongoId } from '../chat/message.validation.js';
// import {
//   registerOnlineUser,
//   unregisterOnlineUser,
//   getOnlineUserIds,
//   getSocketIdByUserId,
//   setOpenChat,
//   clearOpenChat,
//   isChattingWith,
// } from './socket.registry.js';

// import {
//   deliverUnreadNotifications,
//   createNotification
// } from '../notification/notification.service.js';

// const emitOnlineUsers = (io) => {
//   io.emit('onlineUsers', getOnlineUserIds());
// };

// const setOnline = async (userId, socketId) => {
//   registerOnlineUser(userId, socketId);
//   await User.findByIdAndUpdate(userId, { isOnline: true });
// };

// const setOffline = async (userId, socketId) => {
//   const removed = unregisterOnlineUser(userId, socketId);
//   if (removed) {
//     await User.findByIdAndUpdate(userId, { isOnline: false });
//   }
// };

// const pushPendingMessages = async (io, userId) => {
//   try {
//     const messages = await messageService.getUndeliveredMessages(userId);
//     const socketId = getSocketIdByUserId(userId);

//     if (!socketId || !messages.length) return;

//     for (const msg of messages) {
//       io.to(socketId).emit('receiveMessage', msg);
//       await messageService.markMessageDelivered(msg._id);
//     }
//   } catch (err) {
//     console.error('pushPendingMessages error:', err);
//   }
// };

// export const attachChatSocket = (io) => {
//   io.on('connection', async (socket) => {
// const userId = String(socket.user.id).trim();
//     console.log("SOCKET USER:", socket.user);
// console.log("USER ID:", userId);

//     try {
//       await setOnline(userId, socket.id);
//       emitOnlineUsers(io);
//       socket.emit("onlineUsersSync", getOnlineUserIds());
//       await pushPendingMessages(io, userId);

//       await deliverUnreadNotifications(userId);

//       console.log(`User ${userId} connected`);
//     } catch (err) {
//       console.error(err);
//     }

//     // ================= SEND MESSAGE =================
// socket.on('sendMessage', async ({ receiverId, message }) => {
//   try {
//     const senderId = String(userId).trim();
//     receiverId = String(receiverId).trim();
//     message = String(message).trim();

//     console.log("senderId:", senderId);
//     console.log("receiverId:", receiverId);

//     const createdMessage = await messageService.sendMessage(
//       senderId,
//       receiverId,
//       message
//     );

//     // 🔥 check chat request status (لو عندك نظام request)
//     if (createdMessage.chatStatus === 'pending') {
//       socket.emit('chatRequestSent', createdMessage);

//       const receiverSocketId = getSocketIdByUserId(receiverId);

//       if (receiverSocketId) {
//         io.to(receiverSocketId).emit('newChatRequest', createdMessage);
//       }

//       return; // مهم جداً
//     }

//     const receiverSocketId = getSocketIdByUserId(receiverId);

//     // 👀 seen
//     if (receiverSocketId && isChattingWith(receiverId, senderId)) {
//       await messageService.markMessageAsSeen(createdMessage._id);
//       createdMessage.status = 'seen';

//       socket.emit('receiveMessage', createdMessage);
//       io.to(receiverSocketId).emit('receiveMessage', createdMessage);
//       socket.emit('messagesSeen', { by: receiverId });

//     } else if (receiverSocketId) {
//       // delivered
//       await messageService.markMessageDelivered(createdMessage._id);
//       createdMessage.status = 'delivered';

//       socket.emit('receiveMessage', createdMessage);
//       io.to(receiverSocketId).emit('receiveMessage', createdMessage);

//     } else {
//       // offline
//       socket.emit('receiveMessage', createdMessage);

//       await createNotification({
//         userId: receiverId,
//         type: 'message',
//         title: 'New message',
//         body: 'You have a new message',
//         relatedId: createdMessage._id,
//       });
//     }

//   } catch (err) {
//     console.error("SEND MESSAGE ERROR:", err);
//   }
// });

// // ================= ACCEPT CHAT REQUEST =================
// socket.on('acceptChatRequest', async ({ messageId }) => {
//   try {
//     const request = await messageService.getMessageById(messageId);

//     if (!request) return;

//     request.chatStatus = 'accepted';
//     await request.save();

//     const senderSocketId = getSocketIdByUserId(request.senderId);

//     if (senderSocketId) {
//       io.to(senderSocketId).emit('chatRequestAccepted', request);
//     }

//   } catch (err) {
//     console.error("ACCEPT CHAT ERROR:", err);
//   }
// });

// //============================================
// socket.on('sendChatRequest', async ({ receiverId }) => {
//   try {
//     const receiverSocketId = getSocketIdByUserId(String(receiverId).trim());

//     if (receiverSocketId) {
//       io.to(receiverSocketId).emit('newChatRequest', {
//         _id: new Date().getTime().toString(),
//         senderId: userId,
//         receiverId,
//       });
//     }

//   } catch (err) {
//     console.error("SEND CHAT REQUEST ERROR:", err);
//   }
// });

// //=================================================
// // ================= REJECT CHAT REQUEST =================
// socket.on('rejectChatRequest', ({ senderId }) => {
//   const senderSocketId = getSocketIdByUserId(String(senderId).trim());

//   if (senderSocketId) {
//     io.to(senderSocketId).emit('chatRequestRejected');
//   }
// });
//     // ================= DELETE MESSAGE =================
//     socket.on('deleteMessage', async ({ messageId }) => {
//       try {
//         const message = await messageService.getMessageById(messageId);
//         if (!message) return;

//         if (String(message.senderId) !== userId) return;

//         await messageService.deleteMessage(messageId, userId);

//         const receiverSocketId = getSocketIdByUserId(message.receiverId);

//         socket.emit('messageDeleted', { messageId });

//         if (receiverSocketId) {
//           io.to(receiverSocketId).emit('messageDeleted', { messageId });
//         }

//       } catch (err) {
//         console.error(err);
//       }
//     });

//     // ================= TYPING =================
//     socket.on('typing', ({ to }) => {
//       const receiverSocketId = getSocketIdByUserId(to);
//       if (receiverSocketId) {
//         io.to(receiverSocketId).emit('typing', { from: userId });
//       }
//     });

//     // ================= SEEN =================
//     // socket.on('openChat', async ({ otherUserId }) => {
//     //   try {
//     //     const error = validateMongoId(otherUserId, 'otherUserId');
//     //     if (error) return;

//     //     await messageService.markConversationAsSeen({
//     //       viewerId: userId,
//     //       otherUserId,
//     //     });

//     //     const senderSocketId = getSocketIdByUserId(otherUserId);

//     //     if (senderSocketId) {
//     //       io.to(senderSocketId).emit('messagesSeen', {
//     //         by: userId,
//     //       });
//     //     }

//     //   } catch (err) {
//     //     console.error(err);
//     //   }
//     // });
//     // ================= OPEN CHAT =================
// socket.on('openChat', async ({ otherUserId }) => {

//     console.log(`${userId} opened chat with ${otherUserId}`);
//   console.log('isChattingWith after set:', isChattingWith(userId, otherUserId));
//   try {
//     const error = validateMongoId(otherUserId, 'otherUserId');
//     if (error) return;

//     // ✅ otherUserId
//     setOpenChat(userId, otherUserId);

//     await messageService.markConversationAsSeen({
//       viewerId: userId,
//       otherUserId,
//     });

//     const senderSocketId = getSocketIdByUserId(otherUserId);
//     if (senderSocketId) {
//       io.to(senderSocketId).emit('messagesSeen', { by: userId });
//     }

//   } catch (err) {
//     console.error(err);
//   }
// });

//     // ================= DISCONNECT =================
// socket.on('disconnect', async () => {
//   try {
//     await setOffline(userId, socket.id);
//     clearOpenChat(userId); // ✅ امسحي الـ open chat لما يخرج
//     emitOnlineUsers(io);
//     console.log(`User ${userId} disconnected`);
//   } catch (err) {
//     console.error(err);
//   }
// });
//   });
// };

import { User } from '../../DB/models/user.model.js';
import * as messageService from '../chat/message.service.js';
import { validateMongoId } from '../chat/message.validation.js';
import {
  registerOnlineUser,
  unregisterOnlineUser,
  getOnlineUserIds,
  getSocketIdByUserId,
  setOpenChat,
  clearOpenChat,
} from './socket.registry.js';

import {
  deliverUnreadNotifications,
  createNotification
} from '../notification/notification.service.js';

const emitOnlineUsers = (io) => io.emit('onlineUsers', getOnlineUserIds());

const setOnline = async (userId, socketId) => {
  registerOnlineUser(userId, socketId);
  await User.findByIdAndUpdate(userId, { isOnline: true });
};

const setOffline = async (userId, socketId) => {
  const removed = unregisterOnlineUser(userId, socketId);

  if (removed) {
    await User.findByIdAndUpdate(userId, { isOnline: false });
  }
};

const pushPendingMessages = async (io, userId) => {
  try {
    const messages = await messageService.getUndeliveredMessages(userId);

    const socketId = getSocketIdByUserId(userId);

    if (!socketId || !messages.length) return;

    for (const msg of messages) {
      io.to(socketId).emit('receiveMessage', msg);
      await messageService.markMessageDelivered(msg._id);
    }

  } catch (err) {
    console.error('pushPendingMessages error:', err);
  }
};

export const attachChatSocket = (io) => {

  io.on('connection', async (socket) => {

    const userId = String(socket.user.id).trim();

    try {
      await setOnline(userId, socket.id);

      emitOnlineUsers(io);
      socket.emit('onlineUsersSync', getOnlineUserIds());

      await pushPendingMessages(io, userId);
      await deliverUnreadNotifications(userId);

      console.log(`User ${userId} connected`);

    } catch (err) {
      console.error(err);
    }

    // ================= SEND CHAT REQUEST =================
    socket.on('sendChatRequest', async ({ receiverId }) => {

      try {

        receiverId = String(receiverId).trim();

        const convo = await messageService.getOrCreateConversation(
          userId,
          receiverId
        );

        if (convo.status === 'accepted') {
          socket.emit('chatAlreadyAccepted', { receiverId });
          return;
        }

        if (convo.status === 'rejected') {
          socket.emit('chatRequestRejected');
          return;
        }

        if (convo.status === 'pending') {
          socket.emit('chatRequestPending');
        }

        const receiverSocketId = getSocketIdByUserId(receiverId);

        if (receiverSocketId) {
          io.to(receiverSocketId).emit('newChatRequest', {
            convoId: convo._id,
            senderId: userId,
            receiverId,
          });
        }

        socket.emit('chatRequestSent', {
          convoId: convo._id,
        });

      } catch (err) {
        console.error('SEND CHAT REQUEST ERROR:', err);
      }
    });

    // ================= ACCEPT REQUEST =================
    socket.on('acceptChatRequest', async ({ convoId, senderId }) => {

      try {

        await messageService.acceptConversation(convoId);

        const senderSocketId = getSocketIdByUserId(
          String(senderId).trim()
        );

        if (senderSocketId) {
          io.to(senderSocketId).emit('chatRequestAccepted', {
            convoId,
            senderId: userId,
          });
        }

        socket.emit('chatRequestAccepted', {
          convoId,
          receiverId: senderId,
        });

      } catch (err) {
        console.error('ACCEPT CHAT ERROR:', err);
      }
    });




    // ================= SEND MESSAGE (FIXED - ONLY ONE HANDLER) =================
    socket.on("sendMessage", async ({ receiverId, message }) => {

      try {

        const senderId = userId;

        receiverId = String(receiverId).trim();
        message = String(message || "").trim();

        if (!message) return;

        const result = await messageService.sendMessage(
          senderId,
          receiverId,
          message
        );

        const receiverSocketId = getSocketIdByUserId(receiverId);

        // sender sees instantly
        socket.emit("receiveMessage", result);

        // receiver sees instantly
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("receiveMessage", result);
        }

      } catch (err) {
        console.error("SEND MESSAGE ERROR:", err);
      }

    });

    // ================= DELETE MESSAGE =================
    socket.on('deleteMessage', async ({ messageId }) => {

      try {

        const message = await messageService.getMessageById(messageId);

        if (!message) return;

        if (String(message.senderId) !== userId) return;

        await messageService.deleteMessage(messageId, userId);

        const receiverSocketId = getSocketIdByUserId(
          String(message.receiverId)
        );

        socket.emit('messageDeleted', { messageId });

        if (receiverSocketId) {
          io.to(receiverSocketId).emit('messageDeleted', { messageId });
        }

      } catch (err) {
        console.error('DELETE MESSAGE ERROR:', err);
      }
    });

    // ================= TYPING =================
    socket.on('typing', ({ to }) => {

      const receiverSocketId = getSocketIdByUserId(String(to));

      if (receiverSocketId) {
        io.to(receiverSocketId).emit('typing', { from: userId });
      }

    });

    socket.on('stopTyping', ({ to }) => {

      const receiverSocketId = getSocketIdByUserId(String(to));

      if (receiverSocketId) {
        io.to(receiverSocketId).emit('stopTyping', { from: userId });
      }

    });

    // ================= OPEN CHAT ================
    socket.on('openChat', async ({ otherUserId }) => {

      try {

        const error = validateMongoId(otherUserId, 'otherUserId');
        if (error) return;

        setOpenChat(userId, otherUserId);

        await messageService.markConversationAsSeen({
          viewerId: userId,
          otherUserId,
        });

        const senderSocketId = getSocketIdByUserId(otherUserId);

        if (senderSocketId) {
          io.to(senderSocketId).emit('messagesSeen', { by: userId });
        }

      } catch (err) {
        console.error('OPEN CHAT ERROR:', err);
      }

    });

    

    // ================= DISCONNECT =================
    socket.on('disconnect', async () => {

      try {

        await setOffline(userId, socket.id);
        clearOpenChat(userId);
        emitOnlineUsers(io);

        console.log(`User ${userId} disconnected`);

      } catch (err) {
        console.error(err);
      }

    });

  });

};