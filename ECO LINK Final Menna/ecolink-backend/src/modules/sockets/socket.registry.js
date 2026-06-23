const onlineUsers = new Map(); // userId -> socketId

export const isUserOnline = (userId) => {
  return onlineUsers.has(String(userId));
};

export const registerOnlineUser = (userId, socketId) => {
  onlineUsers.set(String(userId), socketId);
};

export const unregisterOnlineUser = (userId, socketId) => {
  const existingSocketId = onlineUsers.get(String(userId));
  if (existingSocketId === socketId) {
    onlineUsers.delete(String(userId));
    return true;
  }
  return false;
};

export const getSocketIdByUserId = (userId) => onlineUsers.get(String(userId));

export const getOnlineUserIds = () => Array.from(onlineUsers.keys());

const openChats = new Map(); // userId -> otherUserId اللي شاتها مفتوح معاه

export const setOpenChat = (userId, otherUserId) => {
  openChats.set(String(userId), String(otherUserId));
};

export const clearOpenChat = (userId) => {
  openChats.delete(String(userId));
};

export const isChattingWith = (userId, otherUserId) => {
  return openChats.get(String(userId)) === String(otherUserId);
};


export const addUser = (userId, socketId) => {
  onlineUsers.set(userId, socketId);
};

export const removeUser = (userId) => {
  onlineUsers.delete(String(userId));
};


export const getSocketId = (userId) => {
  return onlineUsers.get(userId);
};

//C:\Users\Menna kamal\Downloads\Telegram Desktop\ECO LINK (3)\ECO LINK\ecolink-backend\src\modules\socket\socket.registry.js
