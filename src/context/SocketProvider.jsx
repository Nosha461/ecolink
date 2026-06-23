/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { io } from "socket.io-client";
import apiClient from "../utils/apiClient";
import { API_BASE_URL, API_ENDPOINTS } from "../utils/apiConfig";
import {
  getLocalUnreadNotificationCount,
  recordChatRequestNotification,
  recordMessageNotification,
} from "../utils/notificationApi";

const SocketContext = createContext(null);

function getSocketUrl() {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return API_BASE_URL.replace(/\/api\/?$/, "");
  }
}

function readToken() {
  return localStorage.getItem("UserToken") || "";
}

function decodeTokenUserId(token) {
  try {
    const payloadPart = token?.split(".")?.[1];
    if (!payloadPart) return "";

    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(normalized));
    return String(decoded?.id || decoded?._id || decoded?.userId || "").trim();
  } catch {
    return "";
  }
}

function getCurrentUserId() {
  try {
    const user = JSON.parse(localStorage.getItem("User") || "null");
    const userId = String(user?._id || user?.id || user?.userId || "").trim();
    if (userId) return userId;
  } catch {
    // fall through to token decode
  }

  return decodeTokenUserId(readToken());
}

const CHAT_BLOCKS_STORAGE_KEY = "EcoLinkChatBlockedUsers";

function getLocallyBlockedChatUsers() {
  const currentUserId = getCurrentUserId();
  if (!currentUserId) return [];

  try {
    const storedBlocks = JSON.parse(localStorage.getItem(CHAT_BLOCKS_STORAGE_KEY) || "{}");
    const blockedUsers = storedBlocks?.[String(currentUserId)];
    return Array.isArray(blockedUsers) ? blockedUsers.map(String) : [];
  } catch {
    return [];
  }
}

function isChatUserLocallyBlocked(userId) {
  const normalizedUserId = String(userId || "");
  return normalizedUserId
    ? getLocallyBlockedChatUsers().includes(normalizedUserId)
    : false;
}

function getNotificationRelatedUserId(notification) {
  return String(
    notification?.senderId ||
      notification?.from ||
      notification?.relatedId ||
      notification?.data?.senderId ||
      notification?.data?.from ||
      notification?.data?.relatedId ||
      ""
  );
}

function isBlockedMessageNotification(notification) {
  const notificationType = String(notification?.type || notification?.category || "").toLowerCase();
  const title = String(notification?.title || notification?.subject || "").toLowerCase();
  const body = String(notification?.body || notification?.message || "").toLowerCase();
  const looksLikeMessageNotification =
    notificationType === "message" ||
    title.includes("new message") ||
    body.includes("new message");

  return looksLikeMessageNotification && isChatUserLocallyBlocked(getNotificationRelatedUserId(notification));
}

function extractUnreadCount(payload) {
  const value =
    payload?.data?.unread ??
    payload?.data?.count ??
    payload?.unread ??
    payload?.count ??
    payload;

  const count = Number(value);
  return Number.isFinite(count) ? count : 0;
}

export function SocketProvider({ children }) {
  const [incomingMessages, setIncomingMessages] = useState([]);
  const [incomingNotifications, setIncomingNotifications] = useState([]);
  const [chatRequestEvents, setChatRequestEvents] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [deletedMessageId, setDeletedMessageId] = useState("");
  const [seenEvents, setSeenEvents] = useState([]);
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const [token, setToken] = useState(readToken);
  const socketRef = useRef(null);

  const pushLocalChatRequestNotification = useCallback((type, payload = {}) => {
    const localNotification = recordChatRequestNotification(type, payload);
    if (!localNotification) {
      return false;
    }

    setIncomingNotifications((currentNotifications) => [
      localNotification,
      ...currentNotifications,
    ]);
    setUnreadNotifications((currentCount) => currentCount + 1);
    window.dispatchEvent(new Event("ecolink:notifications-refresh"));
    return true;
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const nextToken = readToken();
      setToken((currentToken) => (currentToken === nextToken ? currentToken : nextToken));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const refreshUnreadNotifications = useCallback(async () => {
    if (!readToken()) {
      setUnreadNotifications(0);
      return;
    }

    try {
      const response = await apiClient.get(API_ENDPOINTS.notifications.unreadCount);
      setUnreadNotifications(extractUnreadCount(response.data) + getLocalUnreadNotificationCount());
    } catch {
      setUnreadNotifications(0);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("ecolink:notifications-refresh", refreshUnreadNotifications);

    return () => {
      window.removeEventListener("ecolink:notifications-refresh", refreshUnreadNotifications);
    };
  }, [refreshUnreadNotifications]);

  useEffect(() => {
    void refreshUnreadNotifications();
    const intervalId = window.setInterval(refreshUnreadNotifications, 15000);

    return () => window.clearInterval(intervalId);
  }, [refreshUnreadNotifications]);

  useEffect(() => {
    if (!token) {
      window.setTimeout(() => {
        setConnected(false);
        socketRef.current = null;
        setIncomingMessages([]);
        setIncomingNotifications([]);
        setUnreadNotifications(0);
      }, 0);
      return undefined;
    }

    const realSocket = io(getSocketUrl(), {
      auth: { token },
      transports: ["websocket", "polling"],
      withCredentials: true,
    });

    socketRef.current = realSocket;

    realSocket.on("connect", () => {
      setConnected(true);
      setConnectionError("");
      void refreshUnreadNotifications();
    });

    realSocket.on("disconnect", () => {
      setConnected(false);
    });

    realSocket.on("connect_error", (error) => {
      setConnected(false);
      setConnectionError("Real-time updates are temporarily unavailable.");
    });

    realSocket.on("receiveMessage", (message) => {
      if (message) {
        setIncomingMessages((currentMessages) => [...currentMessages, message]);
        if (
          String(message.receiverId || "") === getCurrentUserId() &&
          !isChatUserLocallyBlocked(message.senderId)
        ) {
          const localNotification = recordMessageNotification(message);
          if (localNotification) {
            setUnreadNotifications((currentCount) => currentCount + 1);
            window.dispatchEvent(new Event("ecolink:notifications-refresh"));
          }
        }
      }
    });

    realSocket.on("onlineUsers", (users) => {
      setOnlineUsers(Array.isArray(users) ? users.map(String) : []);
    });

    realSocket.on("onlineUsersSync", (users) => {
      setOnlineUsers(Array.isArray(users) ? users.map(String) : []);
    });

    realSocket.on("messageDeleted", ({ messageId } = {}) => {
      if (messageId) {
        setDeletedMessageId(String(messageId));
      }
    });

    realSocket.on("messagesSeen", ({ by } = {}) => {
      if (!by) return;
      setSeenEvents((currentEvents) => [
        ...currentEvents,
        { by: String(by), receivedAt: Date.now() },
      ]);
    });

    realSocket.on("typing", ({ from } = {}) => {
      if (!from) return;
      setTypingUsers((currentUsers) =>
        currentUsers.includes(String(from)) ? currentUsers : [...currentUsers, String(from)]
      );
    });

    realSocket.on("stopTyping", ({ from } = {}) => {
      if (!from) return;
      setTypingUsers((currentUsers) => currentUsers.filter((userId) => userId !== String(from)));
    });

    realSocket.on("notification", (notification) => {
      if (notification) {
        if (isBlockedMessageNotification(notification)) {
          return;
        }

        setIncomingNotifications((currentNotifications) => [
          notification,
          ...currentNotifications,
        ]);
        setUnreadNotifications((currentCount) => currentCount + 1);
        window.dispatchEvent(new Event("ecolink:notifications-refresh"));
      }
    });

    const pushChatRequestEvent = (type) => (payload = {}) => {
      setChatRequestEvents((currentEvents) => [
        ...currentEvents,
        { ...payload, type, receivedAt: Date.now() },
      ]);
      const shouldNotify =
        type === "new" ||
        type === "rejected" ||
        (type === "accepted" && payload.senderId && String(payload.senderId) !== getCurrentUserId());
      const didNotify = shouldNotify ? pushLocalChatRequestNotification(type, payload) : false;
      void didNotify;
    };

    realSocket.on("newChatRequest", pushChatRequestEvent("new"));
    realSocket.on("chatRequestSent", pushChatRequestEvent("sent"));
    realSocket.on("chatRequestPending", pushChatRequestEvent("pending"));
    realSocket.on("chatRequestAccepted", pushChatRequestEvent("accepted"));
    realSocket.on("chatAlreadyAccepted", pushChatRequestEvent("alreadyAccepted"));
    realSocket.on("chatRequestRejected", pushChatRequestEvent("rejected"));

    return () => {
      realSocket.disconnect();
      if (socketRef.current === realSocket) {
        socketRef.current = null;
      }
      setConnected(false);
    };
  }, [pushLocalChatRequestNotification, refreshUnreadNotifications, token]);

  const emit = useCallback((eventName, payload = {}) => {
    const currentSocket = socketRef.current;

    if (!currentSocket?.connected) {
      return false;
    }

    if (eventName === "conversationSeen" && payload.otherUserId) {
      currentSocket.emit("openChat", { otherUserId: payload.otherUserId });
      return true;
    }

    currentSocket.emit(eventName, payload);
    return true;
  }, []);

  const consumeIncomingMessages = useCallback(() => {
    setIncomingMessages([]);
  }, []);

  const consumeIncomingNotifications = useCallback(() => {
    setIncomingNotifications([]);
  }, []);

  const consumeChatRequestEvents = useCallback(() => {
    setChatRequestEvents([]);
  }, []);

  const consumeDeletedMessageId = useCallback(() => {
    setDeletedMessageId("");
  }, []);

  const consumeSeenEvents = useCallback(() => {
    setSeenEvents([]);
  }, []);

  const socket = useMemo(
    () => ({
      emit,
      connected,
    }),
    [connected, emit]
  );

  const value = useMemo(() => {
    return {
      socket,
      connected,
      connectionError,
      incomingMessages,
      incomingNotifications,
      chatRequestEvents,
      unreadNotifications,
      onlineUsers,
      typingUsers,
      deletedMessageId,
      seenEvents,
      consumeIncomingMessages,
      consumeIncomingNotifications,
      consumeChatRequestEvents,
      consumeDeletedMessageId,
      consumeSeenEvents,
      refreshUnreadNotifications,
    };
  }, [
    connected,
    connectionError,
    consumeIncomingMessages,
    consumeIncomingNotifications,
    consumeChatRequestEvents,
    consumeDeletedMessageId,
    consumeSeenEvents,
    deletedMessageId,
    seenEvents,
    chatRequestEvents,
    incomingMessages,
    incomingNotifications,
    onlineUsers,
    typingUsers,
    refreshUnreadNotifications,
    socket,
    unreadNotifications,
  ]);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  return useContext(SocketContext);
}
