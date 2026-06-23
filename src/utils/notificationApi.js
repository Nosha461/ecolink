import apiClient from "./apiClient";
import { API_ENDPOINTS } from "./apiConfig";

const LOCAL_NOTIFICATIONS_KEY = "EcoLinkLocalNotifications";
const LEGACY_LOCAL_NOTIFICATION_PREFIX = "frontend-notification-";

function getNotificationId(notification) {
  return String(notification?._id || notification?.id || "");
}

function isLegacyFrontendNotification(notification) {
  return getNotificationId(notification).startsWith(LEGACY_LOCAL_NOTIFICATION_PREFIX);
}

function isLocalNotificationId(notificationId) {
  const id = String(notificationId || "");
  return id.startsWith("local-") || id.startsWith(LEGACY_LOCAL_NOTIFICATION_PREFIX);
}

export function getLocalNotifications() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_NOTIFICATIONS_KEY) || "[]");
    if (!Array.isArray(parsed)) {
      return [];
    }

    const nextNotifications = parsed.filter((notification) => !isLegacyFrontendNotification(notification));
    if (nextNotifications.length !== parsed.length) {
      localStorage.setItem(LOCAL_NOTIFICATIONS_KEY, JSON.stringify(nextNotifications));
    }

    return nextNotifications;
  } catch {
    return [];
  }
}

export function setLocalNotificationRead(notificationId, isRead) {
  const nextNotifications = getLocalNotifications().map((notification) =>
    notification.id === notificationId || notification._id === notificationId
      ? { ...notification, isRead: Boolean(isRead), read: Boolean(isRead) }
      : notification
  );
  localStorage.setItem(LOCAL_NOTIFICATIONS_KEY, JSON.stringify(nextNotifications));
  return nextNotifications;
}

export function getLocalUnreadNotificationCount() {
  return getLocalNotifications().filter((notification) => !notification.isRead && !notification.read).length;
}

export function recordMessageNotification(message) {
  const receiverId = String(message?.receiverId || "");
  const senderId = String(message?.senderId || "");
  const messageId = message?._id || message?.id || `${senderId}-${message?.createdAt || Date.now()}`;

  if (!receiverId || !senderId) {
    return null;
  }

  const notification = {
    _id: `local-message-${messageId}`,
    id: `local-message-${messageId}`,
    type: "message",
    title: "New message",
    body: message?.message || "You have a new message.",
    relatedId: senderId,
    isRead: false,
    createdAt: message?.createdAt || new Date().toISOString(),
    titleKey: "notifications.newMessageTitle",
    bodyKey: "notifications.newMessageBody",
  };

  const currentNotifications = getLocalNotifications();
  if (currentNotifications.some((item) => item.id === notification.id || item._id === notification._id)) {
    return null;
  }

  localStorage.setItem(LOCAL_NOTIFICATIONS_KEY, JSON.stringify([notification, ...currentNotifications]));
  return notification;
}

export function recordChatRequestNotification(eventType, payload = {}) {
  const convoId = payload.convoId || payload.conversationId || "";
  const senderId = payload.senderId || payload.from || "";
  const receiverId = payload.receiverId || payload.to || "";
  const uniqueSuffix = eventType === "accepted" ? Date.now() : convoId || senderId || receiverId || Date.now();
  const notificationId = `local-chat-request-${eventType}-${uniqueSuffix}`;
  const titleKey =
    eventType === "accepted"
      ? "notifications.chatRequestAcceptedTitle"
      : eventType === "rejected"
        ? "notifications.chatRequestDeclinedTitle"
        : "notifications.chatRequestTitle";
  const bodyKey =
    eventType === "accepted"
      ? "notifications.chatRequestAcceptedBody"
      : eventType === "rejected"
        ? "notifications.chatRequestDeclinedBody"
        : "notifications.chatRequestBody";

  const notification = {
    _id: notificationId,
    id: notificationId,
    type: "message",
    title: eventType === "accepted" ? "Chat request accepted" : "Chat request",
    body:
      eventType === "accepted"
        ? "Your chat request was accepted. You can now start chatting."
        : "You have a chat request update.",
    relatedId: senderId || receiverId || convoId,
    isRead: false,
    createdAt: new Date().toISOString(),
    titleKey,
    bodyKey,
  };

  const currentNotifications = getLocalNotifications();
  if (currentNotifications.some((item) => item.id === notification.id || item._id === notification._id)) {
    return null;
  }

  localStorage.setItem(LOCAL_NOTIFICATIONS_KEY, JSON.stringify([notification, ...currentNotifications]));
  return notification;
}

export async function recordListingNotification(action, listingId = "") {
  void action;
  void listingId;
  return null;
}

export function mergeNotifications(apiNotifications = [], localNotifications = []) {
  const byId = new Map();

  [...apiNotifications, ...localNotifications].forEach((notification) => {
    const normalizedNotification = normalizeNotification(notification);

    if (!normalizedNotification?.id) {
      return;
    }

    byId.set(normalizedNotification.id, normalizedNotification);
  });

  return Array.from(byId.values()).sort((first, second) => {
    const firstDate = new Date(first.createdAt || first.time || 0).getTime();
    const secondDate = new Date(second.createdAt || second.time || 0).getTime();
    return secondDate - firstDate;
  });
}

function extractNotificationArray(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const candidates = [
    payload.data,
    payload.notifications,
    payload.notification,
    payload.results,
    payload.items,
    payload.docs,
    payload.data?.notifications,
    payload.data?.notification,
    payload.data?.data,
    payload.data?.results,
    payload.data?.items,
    payload.data?.docs,
  ];

  const arrayCandidate = candidates.find(Array.isArray);
  if (arrayCandidate) {
    return arrayCandidate;
  }

  const singleNotification = candidates.find(
    (candidate) => candidate && typeof candidate === "object"
  );

  return singleNotification ? [singleNotification] : [];
}

const notificationTextKeys = [
  {
    matches: ["new message"],
    titleKey: "notifications.newMessageTitle",
    bodyKey: "notifications.newMessageBody",
  },
  {
    matches: ["new purchase request"],
    titleKey: "notifications.newPurchaseRequestTitle",
    bodyKey: "notifications.newPurchaseRequestBody",
  },
  {
    matches: ["new sale"],
    titleKey: "notifications.newSaleTitle",
    bodyKey: "notifications.newSaleBody",
  },
  {
    matches: ["new review"],
    titleKey: "notifications.newReviewTitle",
    bodyKey: "notifications.newReviewBody",
  },
  {
    matches: ["cart updated"],
    titleKey: "notifications.cartUpdatedTitle",
  },
  {
    matches: ["item added to cart"],
    bodyKey: "notifications.cartItemAddedBody",
  },
  {
    matches: ["item removed from cart"],
    bodyKey: "notifications.cartItemRemovedBody",
  },
  {
    matches: ["cart cleared"],
    titleKey: "notifications.cartClearedTitle",
  },
  {
    matches: ["your cart has been cleared after checkout"],
    bodyKey: "notifications.cartClearedBody",
  },
  {
    matches: ["order created successfully"],
    titleKey: "notifications.orderCreatedTitle",
    bodyKey: "notifications.orderCreatedBody",
  },
  {
    matches: ["request accepted", "purchase request accepted"],
    titleKey: "notifications.requestAcceptedTitle",
    bodyKey: "notifications.requestAcceptedBody",
  },
  {
    matches: ["chat request accepted", "your chat request was accepted"],
    titleKey: "notifications.chatRequestAcceptedTitle",
    bodyKey: "notifications.chatRequestAcceptedBody",
  },
  {
    matches: ["your purchase request has been accepted", "your request has been accepted"],
    titleKey: "notifications.requestAcceptedTitle",
    bodyKey: "notifications.requestAcceptedBody",
  },
];

function getNotificationTextKey(value, field) {
  const normalizedValue = String(value || "").trim().toLowerCase();
  if (!normalizedValue) {
    return "";
  }

  const match = notificationTextKeys.find((item) =>
    item.matches.some((text) => normalizedValue.includes(text))
  );

  return match?.[`${field}Key`] || "";
}

export function normalizeNotification(rawNotification) {
  if (!rawNotification || typeof rawNotification !== "object") {
    return null;
  }

  const id =
    rawNotification._id ||
    rawNotification.id ||
    rawNotification.notification_ID ||
    rawNotification.notificationId ||
    rawNotification.uuid ||
    "";

  const body =
    rawNotification.body ||
    rawNotification.message ||
    rawNotification.content ||
    rawNotification.description ||
    "";

  const title =
    rawNotification.title ||
    rawNotification.subject ||
    rawNotification.heading ||
    body ||
    "";

  return {
    ...rawNotification,
    _id: id,
    id,
    type: rawNotification.type || rawNotification.category || "general",
    title,
    titleKey: rawNotification.titleKey || getNotificationTextKey(title, "title"),
    body,
    bodyKey: rawNotification.bodyKey || getNotificationTextKey(body, "body"),
    isRead: Boolean(rawNotification.isRead ?? rawNotification.read ?? rawNotification.seen),
    createdAt:
      rawNotification.createdAt ||
      rawNotification.time ||
      rawNotification.date ||
      rawNotification.timestamp ||
      "",
  };
}

export async function getNotifications() {
  const response = await apiClient.get(API_ENDPOINTS.notifications.root);
  return mergeNotifications(
    extractNotificationArray(response.data).map(normalizeNotification).filter(Boolean),
    getLocalNotifications()
  );
}

export async function setNotificationReadStatus(notificationId, isRead) {
  if (isLocalNotificationId(notificationId)) {
    return setLocalNotificationRead(notificationId, isRead);
  }

  if (!isRead) {
    // TODO: Postman documents PATCH /notifications/:id/read only.
    throw new Error("This notification action is currently unavailable.");
  }

  const endpoint = isRead
    ? API_ENDPOINTS.notifications.read(notificationId)
    : "";
  const response = await apiClient.patch(endpoint);
  return response.data?.data || response.data;
}
