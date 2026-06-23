import axios from "axios";
import { API_BASE_URL, API_PROXY_BASE_URL } from "./apiConfig";

// Shared HTTP client for frontend requests.

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

function shouldRetryThroughLocalProxy(error) {
  const configuredBaseUrl = String(error?.config?.baseURL || API_BASE_URL || "");
  return (
    !error?.response &&
    !error?.config?._retriedViaLocalProxy &&
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/api\/?$/i.test(configuredBaseUrl) &&
    typeof window !== "undefined" &&
    /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname)
  );
}

const AUTH_HEADER_SKIP_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/verify-code",
  "/auth/verify-email",
  "/auth/resend-otp",
  "/auth/resend-reset-code",
  "/auth/forgot-password",
  "/auth/reset-password",
];

function getRequestPath(config) {
  const rawUrl = String(config.url || "");

  try {
    const resolvedUrl = new URL(rawUrl, config.baseURL || API_BASE_URL || window.location.origin);
    return resolvedUrl.pathname.replace(/^\/api(?=\/)/, "");
  } catch {
    return rawUrl.split("?")[0].replace(/^\/api(?=\/)/, "");
  }
}

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("UserToken");
  const requestPath = getRequestPath(config);
  const shouldSkipAuthHeader = AUTH_HEADER_SKIP_PATHS.some((path) => requestPath === path);

  if (shouldSkipAuthHeader) {
    delete config.headers.Authorization;
  } else if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!shouldRetryThroughLocalProxy(error)) {
      return Promise.reject(error);
    }

    return apiClient.request({
      ...error.config,
      baseURL: API_PROXY_BASE_URL,
      _retriedViaLocalProxy: true,
    });
  }
);

export function translateApiErrorMessage(message, t) {
  if (!message || typeof t !== "function") {
    return message;
  }

  const normalizedMessage = String(message).toLowerCase();
  const translations = [
    {
      matches: ["shippingaddress is required", "shipping address is required"],
      key: "errors.shippingAddressRequired",
    },
    {
      matches: ["categoryid is required", "categoryid cannot be empty"],
      key: "errors.categoryRequired",
    },
    {
      matches: ["no categories found", "no material categories"],
      key: "errors.categoriesRequired",
    },
    {
      matches: ["category name already exists"],
      key: "listing.categoryAlreadyExists",
    },
    {
      matches: [
        "email already registered",
        "this email is already registered",
        "email already exists",
        "email exists",
        "email is already in use",
        "email already in use",
        "duplicate email",
      ],
      key: "auth.emailRegistered",
    },
    {
      matches: [
        "phone already registered",
        "phone already exists",
        "phone number already exists",
        "phonenumber already exists",
        "phone is already in use",
        "phone already in use",
      ],
      key: "auth.phoneRegistered",
    },
    {
      matches: ["no token provided", "token missing", "jwt", "unauthorized", "user not authenticated"],
      key: "errors.loginRequired",
    },
    {
      matches: ["validation failed", "please check the required fields"],
      key: "errors.validationFailed",
    },
    {
      matches: ["invalid code", "invalid otp", "wrong code", "wrong otp", "code is incorrect", "otp is incorrect"],
      key: "errors.invalidCode",
    },
    {
      matches: ["expired code", "code expired", "otp expired", "expired otp"],
      key: "errors.codeExpired",
    },
    {
      matches: ["email not found", "user not found", "no user found", "email does not exist"],
      key: "errors.emailNotFound",
    },
    {
      matches: ["title is required", "title cannot be empty"],
      key: "errors.titleRequired",
    },
    {
      matches: ["description is required", "description cannot be empty"],
      key: "errors.descriptionRequired",
    },
    {
      matches: ["wasteid is required", "waste id is required"],
      key: "errors.wasteIdRequired",
    },
    {
      matches: ["waste not found"],
      key: "errors.wasteNotFound",
    },
    {
      matches: ["only buyers can review waste"],
      key: "review.onlyBuyers",
    },
    {
      matches: ["no order found for this waste"],
      key: "review.orderRequired",
    },
    {
      matches: ["payment not completed for this waste"],
      key: "review.paymentRequired",
    },
    {
      matches: ["you have already reviewed this waste"],
      key: "review.alreadyReviewed",
    },
    {
      matches: ["review not found"],
      key: "review.notFound",
    },
    {
      matches: ["item not found"],
      key: "errors.cartItemNotFound",
    },
    {
      matches: ["quantity must be greater than 0"],
      key: "cart.quantityValidation",
    },
    {
      matches: ["quantity is required"],
      key: "listing.quantityError",
    },
    {
      matches: ["cardnumber is required", "cardnumber must be 16 digits"],
      key: "payment.validCard",
    },
    {
      matches: ["expiry is required", "expiry must be mm/yy"],
      key: "payment.expiryFormat",
    },
    {
      matches: ["cvv is required", "invalid cvv"],
      key: "payment.cvvRequired",
    },
    {
      matches: ["cart is empty"],
      key: "cart.emptyTitle",
    },
    {
      matches: ["only pending orders can be deleted"],
      key: "requests.onlyPendingDelete",
    },
    {
      matches: ["you already have a pending request for this waste", "already have a pending request"],
      key: "listingDetails.alreadyRequested",
    },
    {
      matches: ["you cannot send messages to this user", "cannot send messages to this user"],
      key: "chat.blockedSendError",
    },
    {
      matches: ["user blocked successfully"],
      key: "chat.blockSuccess",
    },
  ];
  const isWasteImageRequired =
    normalizedMessage ===
      "waste validation failed: images: at least one image is required" ||
    (normalizedMessage.includes("images") &&
      normalizedMessage.includes("at least one image")) ||
    normalizedMessage.includes('at least one image file is required in field "images"');

  if (isWasteImageRequired) {
    return t("errors.wasteImageRequired");
  }

  const translatedError = translations.find(({ matches }) =>
    matches.some((match) => normalizedMessage.includes(match))
  );

  if (translatedError) {
    return t(translatedError.key);
  }

  return message;
}

export function getApiErrorMessage(error, fallbackMessage, t) {
  const errors = error?.response?.data?.errors;
  const firstError = Array.isArray(errors) ? errors[0] : null;

  const message =
    error?.response?.data?.message ||
    error?.response?.data?.msg ||
    error?.response?.data?.error ||
    firstError?.message ||
    firstError?.msg ||
    (typeof firstError === "string" ? firstError : "") ||
    error?.message ||
    fallbackMessage;

  return translateApiErrorMessage(message, t);
}

export default apiClient;
