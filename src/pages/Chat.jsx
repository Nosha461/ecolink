import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useSocket } from "../context/SocketProvider";
import { API_ENDPOINTS } from "../utils/apiConfig";
import { getApiErrorMessage } from "../utils/apiClient";
import { DEFAULT_PROFILE_IMAGE, resolveProfileImage } from "../utils/supplierUser";
import { useI18n } from "../i18n/i18nContext";
import "./Chat.css";

const decodeTokenUserId = (token) => {
  try {
    const payloadPart = token?.split(".")?.[1];
    if (!payloadPart) return null;

    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(normalized));
    return decoded?.id || decoded?._id || decoded?.userId
      ? String(decoded.id || decoded._id || decoded.userId)
      : null;
  } catch {
    return null;
  }
};

const getCurrentUserId = () => {
  try {
    const savedUser = localStorage.getItem("User");
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      return String(parsedUser?._id || parsedUser?.id || "");
    }
  } catch {
    // fall through to token decode
  }

  return decodeTokenUserId(localStorage.getItem("UserToken"));
};

const CHAT_BLOCKS_STORAGE_KEY = "EcoLinkChatBlockedUsers";

const readStoredBlockedUsers = (currentUserId) => {
  if (!currentUserId) return [];

  try {
    const storedBlocks = JSON.parse(localStorage.getItem(CHAT_BLOCKS_STORAGE_KEY) || "{}");
    const blockedUsers = storedBlocks?.[String(currentUserId)];
    return Array.isArray(blockedUsers) ? blockedUsers.map(String) : [];
  } catch {
    return [];
  }
};

const writeStoredBlockedUsers = (currentUserId, blockedUsers) => {
  if (!currentUserId) return;

  try {
    const storedBlocks = JSON.parse(localStorage.getItem(CHAT_BLOCKS_STORAGE_KEY) || "{}");
    storedBlocks[String(currentUserId)] = Array.from(new Set(blockedUsers.map(String)));
    localStorage.setItem(CHAT_BLOCKS_STORAGE_KEY, JSON.stringify(storedBlocks));
  } catch {
    // Local unblock state is a convenience layer; ignore storage failures.
  }
};

const extractBlockedUsers = (payload) => {
  const data = payload?.data || payload || {};
  const candidates = [
    data.blockedUsers,
    data.user?.blockedUsers,
    data.profile?.blockedUsers,
    data.activeRole?.blockedUsers,
    data.role?.blockedUsers,
  ];
  const blockedUsers = candidates.find(Array.isArray);
  return blockedUsers ? blockedUsers.map((user) => String(user?._id || user?.id || user)) : [];
};

const formatChatTime = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getChatProfileImage = (user = {}) =>
  resolveProfileImage(
    user.profilePicture ||
      user.profileImage ||
      user.avatar ||
      user.imageUrl ||
      user.photo ||
      user.image
  ) || DEFAULT_PROFILE_IMAGE;

const getUserId = (user = {}) => String(user._id || user.id || user.userId || "");

const normalizeConversationStatus = (payload) => {
  const data = payload?.data || payload || {};
  const status = String(data.status || "").trim().toLowerCase();

  return {
    status: status || null,
    requestedBy: data.requestedBy ? String(data.requestedBy) : "",
    convoId: data.convoId || data.conversationId || data._id || "",
    isBlocked: Boolean(data.isBlocked),
  };
};

const Chat = () => {
  const [chatList, setChatList] = useState([]);
  const [userMap, setUserMap] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendError, setSendError] = useState("");
  const [conversationStatus, setConversationStatus] = useState({
    status: null,
    requestedBy: "",
    convoId: "",
    isBlocked: false,
  });
  const [isRequestActionLoading, setIsRequestActionLoading] = useState(false);
  const [blockedUserIds, setBlockedUserIds] = useState(() => readStoredBlockedUsers(getCurrentUserId()));
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [isBlockActionLoading, setIsBlockActionLoading] = useState(false);
  const [blockError, setBlockError] = useState("");
  const [blockStatusMessage, setBlockStatusMessage] = useState("");
  const [deleteTargetMessage, setDeleteTargetMessage] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const messagesEndRef = useRef(null);
  const selectedUserRef = useRef(null);
  const requestActionTimeoutRef = useRef(null);
  const navigate = useNavigate();
  const currentUserId = useMemo(() => getCurrentUserId(), []);
  const { t } = useI18n();

  const {
    socket,
    connected,
    incomingMessages,
    consumeIncomingMessages,
    onlineUsers = [],
    typingUsers = [],
    chatRequestEvents = [],
    consumeChatRequestEvents,
    deletedMessageId,
    consumeDeletedMessageId,
    seenEvents = [],
    consumeSeenEvents,
  } = useSocket() || {};

  useEffect(() => {
    selectedUserRef.current = selectedUser;
    setIsRequestActionLoading(false);
  }, [selectedUser]);

  useEffect(() => {
    return () => {
      if (requestActionTimeoutRef.current) {
        window.clearTimeout(requestActionTimeoutRef.current);
      }
    };
  }, []);

  const startRequestActionLoading = () => {
    if (requestActionTimeoutRef.current) {
      window.clearTimeout(requestActionTimeoutRef.current);
    }

    setIsRequestActionLoading(true);
    requestActionTimeoutRef.current = window.setTimeout(() => {
      setIsRequestActionLoading(false);
      requestActionTimeoutRef.current = null;
    }, 6000);
  };

  const stopRequestActionLoading = () => {
    if (requestActionTimeoutRef.current) {
      window.clearTimeout(requestActionTimeoutRef.current);
      requestActionTimeoutRef.current = null;
    }

    setIsRequestActionLoading(false);
  };

  const setBlockedUsersForCurrentUser = useCallback((updater) => {
    setBlockedUserIds((currentBlockedUsers) => {
      const nextBlockedUsers =
        typeof updater === "function" ? updater(currentBlockedUsers) : updater;
      const uniqueBlockedUsers = Array.from(new Set((nextBlockedUsers || []).map(String)));
      writeStoredBlockedUsers(currentUserId, uniqueBlockedUsers);
      return uniqueBlockedUsers;
    });
  }, [currentUserId]);

  // Handle deleted messages in real time
  useEffect(() => {
    if (!deletedMessageId) return;

    setMessages((prev) => prev.filter((m) => m._id !== deletedMessageId));

    setChatList((prevChats) => {
      return prevChats.map((chat) => {
        if (chat.lastMessage === messages.find(m => m._id === deletedMessageId)?.message) {
          return {
            ...chat,
            lastMessage: t("chat.messageDeleted"),
          };
        }
        return chat;
      });
    });

    consumeDeletedMessageId?.();
  }, [deletedMessageId, consumeDeletedMessageId, messages, t]);

  const handleDeleteConfirm = () => {
    if (!deleteTargetMessage?._id || !socket) return;
    socket.emit("deleteMessage", { messageId: deleteTargetMessage._id });
    setShowDeleteModal(false);
    setDeleteTargetMessage(null);
  };

  const loadConversationStatus = useCallback(async (userId) => {
    if (!userId) {
      return { status: null, requestedBy: "", convoId: "" };
    }

    const statusRes = await api.get(API_ENDPOINTS.messages.conversationStatus(userId));
    return normalizeConversationStatus(statusRes.data);
  }, []);

  // Fetch chat list and user details
  useEffect(() => {
    api
      .get(API_ENDPOINTS.messages.chatList)
      .then(async (res) => {
        const chats = Array.isArray(res.data?.data) ? res.data.data : [];
        setChatList(chats);

        const usersRes = await api.get(API_ENDPOINTS.messages.users);
        const users = Array.isArray(usersRes.data?.data) ? usersRes.data.data : [];

        // Build a map: userId -> user object
        const map = {};
        users.forEach((u) => {
          const userId = getUserId(u);
          map[userId] = u;
        });
        setUserMap(map);

        try {
          const profileRes = await api.get(API_ENDPOINTS.user.profile);
          const profileBlockedUsers = extractBlockedUsers(profileRes.data);

          if (profileBlockedUsers.length) {
            setBlockedUsersForCurrentUser((currentBlockedUsers) => [
              ...currentBlockedUsers,
              ...profileBlockedUsers,
            ]);
          }
        } catch {
          // Keep the local blocked list when the profile shape does not expose blocked users.
        }
      })
      .catch(() => {
        setChatList([]);
        setUserMap({});
      });
  }, [setBlockedUsersForCurrentUser]);

  useEffect(() => {
    if (!incomingMessages?.length) return;

    const currentId = String(currentUserId || "");
    const activeUserId = String(selectedUserRef.current?.userId || "");

    setChatList((prevChats) => {
      const nextChats = [...prevChats];

      incomingMessages.forEach((incomingMessage) => {
        const incomingSenderId = String(incomingMessage?.senderId || "");
        const incomingReceiverId = String(incomingMessage?.receiverId || "");
        const relatedUserId =
          incomingSenderId === currentId
            ? incomingReceiverId
            : incomingSenderId;

        if (!relatedUserId) return;

        const chatIndex = nextChats.findIndex(
          (chat) => String(chat.userId) === relatedUserId,
        );

        const nextEntry = {
          userId: relatedUserId,
          lastMessage: incomingMessage.message,
          lastMessageTime: incomingMessage.createdAt,
          unreadCount:
            relatedUserId === activeUserId || incomingSenderId === currentId
              ? 0
              : chatIndex >= 0
                ? (nextChats[chatIndex].unreadCount || 0) + 1
                : 1,
        };

        if (chatIndex >= 0) {
          nextChats[chatIndex] = { ...nextChats[chatIndex], ...nextEntry };
        } else {
          nextChats.unshift(nextEntry);
        }
      });

      return nextChats.sort(
        (a, b) =>
          new Date(b.lastMessageTime || 0) - new Date(a.lastMessageTime || 0),
      );
    });

    setMessages((prev) => {
      const merged = [...prev];
      const currentId = String(currentUserId || "");
      let shouldMarkActiveConversationSeen = false;

      incomingMessages.forEach((incomingMessage) => {
        const incomingSenderId = String(incomingMessage?.senderId || "");
        const incomingReceiverId = String(incomingMessage?.receiverId || "");
        const activeUserIdNow = String(selectedUserRef.current?.userId || "");
        const relatedUserId =
          incomingSenderId === currentId
            ? incomingReceiverId
            : incomingSenderId;
        const isActiveConversation =
          activeUserIdNow &&
          (incomingSenderId === activeUserIdNow ||
            incomingReceiverId === activeUserIdNow);

        if (!relatedUserId || !isActiveConversation) return;

        if (!merged.some((msg) => msg._id === incomingMessage._id)) {
          merged.push(incomingMessage);
        }

        if (incomingSenderId === activeUserIdNow && incomingReceiverId === currentId) {
          shouldMarkActiveConversationSeen = true;
        }
      });

      if (shouldMarkActiveConversationSeen && selectedUserRef.current?.userId) {
        socket?.emit("openChat", {
          otherUserId: selectedUserRef.current.userId,
        });
      }

      return merged.sort(
        (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0),
      );
    });

    consumeIncomingMessages?.();
  }, [consumeIncomingMessages, currentUserId, incomingMessages, socket]);

  useEffect(() => {
    if (!seenEvents.length) return;

    const activeUserId = String(selectedUserRef.current?.userId || "");
    const hasActiveSeenEvent = seenEvents.some((event) => String(event.by || "") === activeUserId);

    if (hasActiveSeenEvent) {
      setMessages((prevMessages) =>
        prevMessages.map((message) =>
          String(message.senderId) === String(currentUserId || "") &&
          String(message.receiverId) === activeUserId
            ? { ...message, status: "seen" }
            : message
        )
      );
    }

    consumeSeenEvents?.();
  }, [consumeSeenEvents, currentUserId, seenEvents]);

  useEffect(() => {
    if (!chatRequestEvents.length) return;
    stopRequestActionLoading();

    const activeUserId = String(selectedUserRef.current?.userId || "");
    const currentId = String(currentUserId || "");
    let shouldRefreshActiveStatus = false;

    chatRequestEvents.forEach((event) => {
      const senderId = String(event.senderId || "");
      const receiverId = String(event.receiverId || "");
      const isIncomingForActiveUser =
        event.type === "new" && senderId && senderId === activeUserId;
      const isAcceptedForActiveUser =
        event.type === "accepted" || event.type === "alreadyAccepted";

      if (isIncomingForActiveUser) {
        shouldRefreshActiveStatus = true;
        setConversationStatus({
          status: "pending",
          requestedBy: senderId,
          convoId: event.convoId || "",
        });
      }

      if (event.type === "sent" || event.type === "pending") {
        stopRequestActionLoading();
        setConversationStatus((currentStatus) => ({
          ...currentStatus,
          status: "pending",
          requestedBy: currentId,
          convoId: event.convoId || currentStatus.convoId,
        }));
      }

      if (isAcceptedForActiveUser) {
        shouldRefreshActiveStatus = true;
        setConversationStatus((currentStatus) => ({
          ...currentStatus,
          status: "accepted",
          convoId: event.convoId || currentStatus.convoId,
        }));
      }

      if (event.type === "rejected" && activeUserId) {
        shouldRefreshActiveStatus = true;
        setConversationStatus((currentStatus) => ({
          ...currentStatus,
          status: "rejected",
          requestedBy: currentStatus.requestedBy || currentId,
        }));
      }
    });

    if (activeUserId && shouldRefreshActiveStatus) {
      loadConversationStatus(activeUserId)
        .then(setConversationStatus)
        .catch(() => {});
    }

    consumeChatRequestEvents?.();
  }, [chatRequestEvents, consumeChatRequestEvents, currentUserId, loadConversationStatus]);

  useEffect(() => {
    if (!selectedUser) return;
    let cancelled = false;

    const loadConversation = async () => {
      setLoading(true);

      try {
        const nextConversationStatus = await loadConversationStatus(selectedUser.userId);
        if (!cancelled) {
          setConversationStatus(nextConversationStatus);
          if (nextConversationStatus.isBlocked) {
            setBlockedUsersForCurrentUser((currentBlockedUsers) => [
              ...currentBlockedUsers,
              selectedUser.userId,
            ]);
          }
        }

        if (blockedUserIds.includes(String(selectedUser.userId)) || nextConversationStatus.status !== "accepted") {
          if (!cancelled) {
            setMessages([]);
          }
          return;
        }

        const res = await api.get(API_ENDPOINTS.messages.conversation(selectedUser.userId));
        if (!cancelled) {
          setMessages(Array.isArray(res.data?.data) ? res.data.data : []);
        }
      } catch {
        if (!cancelled) {
          setMessages([]);
          setConversationStatus({ status: null, requestedBy: "", convoId: "", isBlocked: false });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }

      socket?.emit("openChat", {
        otherUserId: selectedUser.userId,
      });
    };

    void loadConversation();

    return () => {
      cancelled = true;
    };
  }, [blockedUserIds, loadConversationStatus, selectedUser, setBlockedUsersForCurrentUser, socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const asideUsers = useMemo(() => {
    const chatsByUserId = new Map(
      chatList.map((chat) => [String(chat.userId), chat]),
    );

    return Object.values(userMap)
      .filter((user) => String(user?._id) !== String(currentUserId || ""))
      .map((user) => {
        const chat = chatsByUserId.get(String(user._id));
        return {
          userId: String(user._id),
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          profileImage: getChatProfileImage(user),
          isOnline: onlineUsers.includes(String(user._id)) || user.isOnline,
          lastMessage: chat?.lastMessage || "",
          lastMessageTime: chat?.lastMessageTime || null,
          unreadCount: chat?.unreadCount || 0,
        };
      })
      .sort((a, b) => {
        if (a.lastMessageTime && b.lastMessageTime) {
          return new Date(b.lastMessageTime) - new Date(a.lastMessageTime);
        }
        if (a.lastMessageTime) return -1;
        if (b.lastMessageTime) return 1;
        return `${a.firstName || ""} ${a.lastName || ""}`.localeCompare(
          `${b.firstName || ""} ${b.lastName || ""}`,
        );
      });
  }, [chatList, currentUserId, userMap, onlineUsers]);

  const displayName = (user) =>
    `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
    user?.email ||
    t("chat.unknownUser");

  const chatStatus = conversationStatus.status;
  const isConversationAccepted = chatStatus === "accepted";
  const selectedUserId = selectedUser?.userId ? String(selectedUser.userId) : "";
  const isSelectedUserBlocked = selectedUserId
    ? blockedUserIds.includes(selectedUserId) || conversationStatus.isBlocked
    : false;
  const isIncomingPendingRequest =
    chatStatus === "pending" &&
    conversationStatus.requestedBy &&
    String(conversationStatus.requestedBy) !== String(currentUserId || "");

  const sendChatRequest = () => {
    if (!selectedUser || isRequestActionLoading) return;

    setSendError("");
    setBlockStatusMessage("");
    if (!connected) {
      setSendError(t("chat.requestConnectionError"));
      return;
    }

    const didEmit = socket?.emit("sendChatRequest", {
      receiverId: selectedUser.userId,
    });

    if (!didEmit) {
      setSendError(t("chat.requestConnectionError"));
      stopRequestActionLoading();
      return;
    }

    setConversationStatus((currentStatus) => ({
      ...currentStatus,
      status: "pending",
      requestedBy: String(currentUserId || ""),
    }));
  };

  const acceptChatRequest = () => {
    if (!selectedUser || !conversationStatus.convoId || isRequestActionLoading) return;

    setSendError("");
    setBlockStatusMessage("");
    if (!connected) {
      setSendError(t("chat.requestConnectionError"));
      return;
    }

    startRequestActionLoading();
    const didEmit = socket?.emit("acceptChatRequest", {
      convoId: conversationStatus.convoId,
      senderId: selectedUser.userId,
    });

    if (!didEmit) {
      setSendError(t("chat.requestConnectionError"));
      stopRequestActionLoading();
      return;
    }

    setConversationStatus((currentStatus) => ({
      ...currentStatus,
      status: "accepted",
      isBlocked: false,
    }));
    stopRequestActionLoading();
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !selectedUser) return;

    if (isSelectedUserBlocked) {
      setSendError(t("chat.blockedSendError"));
      return;
    }

    if (!isConversationAccepted) {
      if (!chatStatus) {
        sendChatRequest();
      } else {
        setSendError(t("chat.requestRequiredBeforeMessage"));
      }
      return;
    }

    const messageText = input.trim();

    setSendError("");
    const didEmit = socket?.emit("sendMessage", {
      receiverId: selectedUser.userId,
      message: messageText,
    });

    if (!didEmit) {
      setSendError(t("chat.sendError"));
      return;
    }

    setInput("");
    socket?.emit("stopTyping", { to: selectedUser.userId });
  };

  const openBlockModal = () => {
    setBlockError("");
    setBlockStatusMessage("");
    setShowBlockModal(true);
  };

  const handleBlockUser = async () => {
    if (!selectedUser || isBlockActionLoading) return;

    setIsBlockActionLoading(true);
    setBlockError("");
    setBlockStatusMessage("");

    try {
      await api.post(`/chat/block/${selectedUser.userId}`);
      setBlockedUsersForCurrentUser((currentBlockedUsers) => [
        ...currentBlockedUsers,
        selectedUser.userId,
      ]);
      setMessages([]);
      setShowBlockModal(false);
      setBlockStatusMessage(t("chat.blockSuccess"));
    } catch (error) {
      setBlockError(getApiErrorMessage(error, t("chat.blockError"), t));
    } finally {
      setIsBlockActionLoading(false);
    }
  };

  const handleUnblockUser = () => {
    if (!selectedUser || isBlockActionLoading) return;

    setIsBlockActionLoading(true);
    setBlockError("");
    setSendError("");
    setBlockedUsersForCurrentUser((currentBlockedUsers) =>
      currentBlockedUsers.filter((userId) => String(userId) !== String(selectedUser.userId))
    );
    setConversationStatus((currentStatus) => ({
      ...currentStatus,
      isBlocked: false,
    }));
    setBlockStatusMessage(t("chat.unblockSuccess"));
    window.setTimeout(() => setIsBlockActionLoading(false), 150);
  };

  const handleInputChange = (event) => {
    const nextValue = event.target.value;
    setInput(nextValue);

    if (!selectedUser || !isConversationAccepted) return;

    socket?.emit(nextValue.trim() ? "typing" : "stopTyping", {
      to: selectedUser.userId,
    });
  };

  // Get user details from userMap
  const getUserDetails = (userId) => userMap[userId] || {};

  return (
    <div className="chat-container">
      <aside className="chat-sidebar">
        <div className="chat-sidebar-header">
          <button
            className="chat-back"
            type="button"
            onClick={() => navigate(-1)}
            aria-label={t("common.backToListings")}
          >
            <svg
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden
            >
              <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
            </svg>
          </button>
          <h2>{t("chat.title")}</h2>
        </div>
        <input
          type="text"
          placeholder={t("common.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="chat-search"
        />
        <ul className="chat-list">
          {asideUsers
            .filter((c) => {
              if (!search.trim()) return true;
              const fullName = displayName(c).toLowerCase();
              return fullName.includes(search.toLowerCase());
            })
            .map((c) => {
              const user = getUserDetails(c.userId) || c || {};
              const isOnline = onlineUsers.includes(String(c.userId)) || user.isOnline;
              return (
                <li
                  key={c.userId}
                  className={selectedUser?.userId === c.userId ? "active" : ""}
                  onClick={() => setSelectedUser(c)}
                >
                  <div className="chat-avatar-container">
                    <div className="chat-avatar">
                      <img
                        src={getChatProfileImage(user)}
                        alt={displayName(user)}
                        onError={(event) => {
                          event.currentTarget.src = DEFAULT_PROFILE_IMAGE;
                        }}
                      />
                    </div>
                    <span className={`status-dot ${isOnline ? "online" : "offline"}`} />
                  </div>
                  <div>
                    <div className="chat-user-name">{displayName(user)}</div>
                    <div className="chat-last-message">{c.lastMessage}</div>
                  </div>
                  <div className="chat-time">
                    {formatChatTime(c.lastMessageTime)}
                  </div>
                  {c.unreadCount > 0 && (
                    <span className="chat-unread">{c.unreadCount}</span>
                  )}
                </li>
              );
            })}
        </ul>
      </aside>
      <main className="chat-main">
        {selectedUser ? (
          <>
            {(() => {
              const sel = getUserDetails(selectedUser.userId) || {};
              const selectedProfile = Object.keys(sel).length > 0 ? sel : selectedUser;
              const isOnline =
                onlineUsers.includes(String(selectedProfile._id || selectedProfile.userId)) ||
                selectedProfile.isOnline;
              return (
                <header className="chat-header">
                  <div className="chat-avatar-container">
                    <div className="chat-avatar">
                      <img
                        src={getChatProfileImage(selectedProfile)}
                        alt={displayName(selectedProfile)}
                        onError={(event) => {
                          event.currentTarget.src = DEFAULT_PROFILE_IMAGE;
                        }}
                      />
                    </div>
                    <span className={`status-dot ${isOnline ? "online" : "offline"}`} />
                  </div>
                  <div>
                    <div className="chat-user-name">
                      {displayName(selectedProfile)}
                    </div>
                    <div className="chat-user-status">
                      {isSelectedUserBlocked ? t("chat.blocked") : isOnline ? t("chat.online") : t("chat.offline")}
                    </div>
                  </div>
                  {isSelectedUserBlocked ? (
                    <button
                      type="button"
                      className="chat-block-btn chat-unblock-btn"
                      onClick={handleUnblockUser}
                      disabled={isBlockActionLoading}
                    >
                      {isBlockActionLoading ? t("chat.unblocking") : t("chat.unblock")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="chat-block-btn"
                      onClick={openBlockModal}
                    >
                      {t("chat.block")}
                    </button>
                  )}
                </header>
              );
            })()}
            {blockStatusMessage ? (
              <div className="chat-request-banner chat-request-banner-success">
                <span>{blockStatusMessage}</span>
              </div>
            ) : null}
            {isSelectedUserBlocked && (
              <div className="chat-request-banner chat-request-banner-blocked">
                <span>{t("chat.blockedDescription")}</span>
                <button type="button" onClick={handleUnblockUser} disabled={isBlockActionLoading}>
                  {isBlockActionLoading ? t("chat.unblocking") : t("chat.unblock")}
                </button>
              </div>
            )}
            {!isSelectedUserBlocked && chatStatus !== "accepted" && (
              <div className={`chat-request-banner chat-request-banner-${chatStatus || "none"}`}>
                {!chatStatus && (
                  <>
                    <span>{t("chat.requestRequired")}</span>
                    <button type="button" onClick={sendChatRequest} disabled={isRequestActionLoading}>
                      {isRequestActionLoading ? t("chat.sendingRequest") : t("chat.sendRequest")}
                    </button>
                  </>
                )}
                {chatStatus === "pending" && isIncomingPendingRequest && (
                  <>
                    <span>{t("chat.incomingRequest")}</span>
                    <button type="button" onClick={acceptChatRequest} disabled={isRequestActionLoading}>
                      {isRequestActionLoading ? t("chat.acceptingRequest") : t("chat.acceptRequest")}
                    </button>
                  </>
                )}
                {chatStatus === "pending" && !isIncomingPendingRequest && (
                  <span>{t("chat.requestPending")}</span>
                )}
                {chatStatus === "rejected" && (
                  <span>{t("chat.requestDeclined")}</span>
                )}
              </div>
            )}
            <div className="chat-messages">
              {isSelectedUserBlocked ? (
                <div className="chat-empty chat-empty-inline">{t("chat.blockedTitle")}</div>
              ) : loading ? (
                <div>{t("common.loading")}</div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg._id}
                    className={`chat-message ${String(msg.senderId) === String(currentUserId) ? "sent" : "received"}`}
                  >
                    <div className="chat-message-content">
                      <div className="chat-message-text">{msg.message}</div>
                      {String(msg.senderId) === String(currentUserId) && (
                        <button
                          type="button"
                          className="delete-message-btn"
                          onClick={() => {
                            setDeleteTargetMessage(msg);
                            setShowDeleteModal(true);
                          }}
                          aria-label={t("chat.deleteMessage")}
                        >
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                          </svg>
                        </button>
                      )}
                    </div>
                    <div className="chat-message-time">
                      {formatChatTime(msg.createdAt)}
                      {String(msg.senderId) === String(currentUserId) && msg.status === "seen" ? (
                        <span className="chat-message-seen">{t("chat.seen")}</span>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
            <form className="chat-input-form" onSubmit={sendMessage}>
              <input
                type="text"
                placeholder={isConversationAccepted ? t("chat.typeMessage") : t("chat.requestInputPlaceholder")}
                value={input}
                onChange={handleInputChange}
                disabled={!isConversationAccepted || isSelectedUserBlocked}
              />
              <button type="submit" disabled={!input.trim() || !isConversationAccepted || isSelectedUserBlocked}>
                {t("common.send")}
              </button>
            </form>
            {selectedUser && typingUsers.includes(String(selectedUser.userId)) ? (
              <div className="chat-typing-indicator">
                {t("chat.typing", { name: displayName(getUserDetails(selectedUser.userId) || selectedUser) })}
              </div>
            ) : null}
            {sendError ? <div className="chat-empty">{sendError}</div> : null}
            {!connected ? (
              <div className="chat-empty">{t("chat.connecting")}</div>
            ) : null}
          </>
        ) : (
          <div className="chat-empty">
            {t("chat.selectConversation")}
          </div>
        )}
      </main>

      {showDeleteModal && (
        <div className="delete-modal-overlay">
          <div className="delete-modal-content">
            <h3>{t("chat.deleteMessage")}</h3>
            <p>{t("chat.deleteConfirm")}</p>
            <div className="delete-modal-actions">
              <button
                type="button"
                className="delete-modal-btn cancel"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteTargetMessage(null);
                }}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="delete-modal-btn confirm"
                onClick={handleDeleteConfirm}
              >
                {t("chat.delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBlockModal && (
        <div className="delete-modal-overlay">
          <div className="delete-modal-content">
            <h3>{t("chat.blockUserTitle")}</h3>
            <p>{t("chat.blockUserConfirm", { name: displayName(getUserDetails(selectedUser?.userId) || selectedUser) })}</p>
            {blockError ? <p className="block-error-msg">{blockError}</p> : null}
            <div className="delete-modal-actions">
              <button
                type="button"
                className="delete-modal-btn cancel"
                onClick={() => {
                  setShowBlockModal(false);
                  setBlockError("");
                }}
                disabled={isBlockActionLoading}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="delete-modal-btn confirm"
                onClick={handleBlockUser}
                disabled={isBlockActionLoading}
              >
                {isBlockActionLoading ? t("chat.blocking") : t("chat.block")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
