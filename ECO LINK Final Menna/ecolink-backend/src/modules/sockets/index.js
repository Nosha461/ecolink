// import { Server } from 'socket.io';
// import { verifyToken } from '../../utils/token/index.js';
// import { User } from '../../DB/models/user.model.js';
// import { attachChatSocket } from './chat.socket.js';
// import { deliverUnreadNotifications } from '../notification/notification.service.js';

// let ioInstance;

// export const initSocket = (server) => {
//   ioInstance = new Server(server, {
//   cors: {
//   origin: "*",
//   credentials: false,
// },
//   });

//   // ================= AUTH MIDDLEWARE =================
//   ioInstance.use(async (socket, next) => {
//     try {
//       const authToken =
//         socket.handshake.auth?.token ||
//         socket.handshake.headers?.authorization?.replace('Bearer ', '');

//       if (!authToken) {
//         return next(new Error('No token provided'));
//       }

//       const decoded = verifyToken(authToken);

//       const user = await User.findById(decoded.id);
//       if (!user) {
//         return next(new Error('User not found'));
//       }

//       socket.user = { id: String(user._id) };

//       next();
//     } catch (error) {
//       next(new Error('Socket authentication failed'));
//     }
//   });

//   // ================= CONNECTION =================
//   ioInstance.on('connection', async (socket) => {
//     try {
//       const userId = socket.user.id;

//       // user online
//       await User.findByIdAndUpdate(userId, {
//         isOnline: true
//       });

//       console.log(`User connected: ${userId}`);

//       // send unread notifications
//       await deliverUnreadNotifications(userId);

//       // user disconnect
//       socket.on('disconnect', async () => {
//         try {
//           await User.findByIdAndUpdate(userId, {
//             isOnline: false
//           });

//           console.log(`User disconnected: ${userId}`);
//         } catch (err) {
//           console.error('Disconnect error:', err);
//         }
//       });

//     } catch (err) {
//       console.error('Socket connection error:', err);
//     }
//   });

//   // ================= CHAT SOCKET =================
//   attachChatSocket(ioInstance);

//   return ioInstance;
// };

// // getter
// export const getIo = () => ioInstance;


import { Server } from 'socket.io';
import { verifyToken } from '../../utils/token/index.js';
import { User } from '../../DB/models/user.model.js';
import { attachChatSocket } from './chat.socket.js';

let ioInstance;

export const initSocket = (server) => {
  ioInstance = new Server(server, {
    cors: {
      origin: [
        'http://127.0.0.1:5500',
        'http://localhost:5500',
        'http://localhost:5173',
        'http://localhost:3000',
      ],
      credentials: true,
    },
  });

  // Auth middleware for socket
  ioInstance.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('No token provided'));
      }

      const decoded = verifyToken(token);

      const user = await User.findById(decoded.id).select('_id');
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = { id: String(user._id) };
      next();
    } catch (err) {
      console.error('Socket auth error:', err.message);
      next(new Error('Authentication failed'));
    }
  });

  // Attach chat functionality (this will handle the connection event internally)
  attachChatSocket(ioInstance);
 ioInstance.on('connection', (socket) => {
    const userId = socket.user.id;

    // 👇 أهم سطر في المشروع
    socket.join(userId);

    console.log(`User joined socket room: ${userId}`);
  });

  console.log('Socket.IO server initialized');
  return ioInstance;
};

export const getIo = () => ioInstance;

//C:\Users\Menna kamal\Downloads\Telegram Desktop\ECO LINK (3)\ECO LINK\ecolink-backend\src\modules\sockets\index.js