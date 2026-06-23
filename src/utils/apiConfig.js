export const REAL_API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3000/api";

export const API_BASE_URL = REAL_API_BASE_URL;
export const API_PROXY_BASE_URL = "/api";

export const API_ENDPOINTS = {
  auth: {
    login: "/auth/login",
    register: "/auth/register",
    refreshToken: "/auth/refresh-token",
    logout: "/auth/logout",
    verifyCode: "/auth/verify-code",
    verifyEmail: "/auth/verify-email",
    resendOtp: "/auth/resend-otp",
    resendResetCode: "/auth/resend-reset-code",
    forgotPassword: "/auth/forgot-password",
    resetPassword: "/auth/reset-password",
  },
  user: {
    profile: "/user/profile",
    changePassword: "/user/change-password",
    uploadProfilePicture: "/user/upload-profile-picture",
  },
  categories: {
    root: "/category/getcategories",
    create: "/category/addcategory",
    byId: (categoryId) => `/category/getcategory/${categoryId}`,
  },
  listings: {
    root: "/waste/list",
    available: "/waste/list?status=available",
    search: (params = {}) => {
      const searchParams = new URLSearchParams();
      if (params.search) searchParams.set("search", params.search);
      if (params.minPrice !== undefined && params.minPrice !== "") searchParams.set("minPrice", params.minPrice);
      if (params.maxPrice !== undefined && params.maxPrice !== "") searchParams.set("maxPrice", params.maxPrice);
      const query = searchParams.toString();
      return query ? `/waste/search?${query}` : "/waste/search";
    },
    byCategory: (categoryId) => `/waste/list?categoryId=${encodeURIComponent(categoryId)}`,
    byId: (listingId) => `/waste/getwaste/${listingId}`,
    create: (categoryId) => `/waste/addwaste/${categoryId}`,
    update: (listingId) => `/waste/updatewaste/${listingId}`,
    delete: (listingId) => `/waste/deletewaste/${listingId}`,
  },
  reviews: {
    root: "/review/list-review",
    create: "/review/add-review",
    notifySeller: "/review/notify-seller",
    update: (reviewId) => `/review/update-review/${reviewId}`,
    delete: (reviewId) => `/review/delete-review/${reviewId}`,
  },
  messages: {
    users: "/message/users",
    chatList: "/message/chat-list",
    conversation: (userId) => `/message/conversation/${userId}`,
    conversationStatus: (userId) => `/message/conversation-status/${userId}`,
    seen: (userId) => `/message/conversation/${userId}/seen`,
    send: "/message/send",
  },
  notifications: {
    root: "/notifications",
    read: (notificationId) => `/notifications/${notificationId}/read`,
    unreadCount: "/notifications/unread-count",
  },
  cart: {
    root: "/cart",
    add: "/cart/add",
    byId: (cartItemId) => `/cart/${cartItemId}`,
    checkout: "/cart/checkout",
    total: "/cart/total",
  },
  orders: {
    create: "/orders/make-order",
    mine: "/orders/list-my-orders",
    byId: (orderId) => `/orders/get-order/${orderId}`,
    delete: (orderId) => `/orders/delete-order/${orderId}`,
  },
  payments: {
    create: "/payments/make-payment",
    notifySeller: (orderId) => `/payments/notify-seller/${orderId}`,
  },
  contact: {
    root: "/contact",
  },
  purchaseRequests: {
  create: "/purchase-requests/send-request",
  viewByWaste: (wasteId) => `/purchase-requests/view-request/${wasteId}`,
  accept: (requestId) => `/purchase-requests/accept-request/${requestId}`,
  decline: (requestId) => `/purchase-requests/decline-request/${requestId}`,
  myRequests: "/purchase-requests/my-requests",
  myAcceptedRequests: "/purchase-requests/my-accepted-requests",
  status: (requestId) => `/purchase-requests/request-status/${requestId}`,
  cancel: (requestId) => `/purchase-requests/cancel-request/${requestId}`,
},
  admin: {
    users: "/admin/list-users",
    stats: "/admin/stats",
    blockUser: (userId) => `/admin/users/${userId}/block`,
    unblockUser: (userId) => `/admin/users/${userId}/unblock`,
    deleteUser: (userId) => `/admin/users/${userId}/delete`,
    listings: "/admin/listings",
    deleteListing: (listingId) => `/admin/listings/${listingId}/delete`,
    commissions: "/admin/list-commissions",
    completedDeals: "/admin/list-completed-deals",
    payments: "/admin/list-payments",
  },
};
