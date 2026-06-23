import apiClient from "./apiClient";
import { API_BASE_URL, API_ENDPOINTS, API_PROXY_BASE_URL } from "./apiConfig";

function findAuthData(data) {
  return data?.data || data?.user || data || {};
}

export function findAuthUser(data) {
  const authData = findAuthData(data);
  return normalizeAuthUser(authData.user || authData.profile || data?.user || null);
}

export function findAuthToken(data) {
  const authData = findAuthData(data);
  return authData.token || authData.accessToken || authData.access_token || data?.token || "";
}

export function findRefreshToken(data) {
  const authData = findAuthData(data);
  return (
    authData.refreshToken ||
    authData.refresh_token ||
    data?.refreshToken ||
    data?.refresh_token ||
    ""
  );
}

export function normalizeAuthUser(user) {
  if (!user || typeof user !== "object") {
    return null;
  }

  const fullName =
    user.fullName ||
    user.name ||
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim();

  return {
    ...user,
    fullName,
    role: user.role || user.currentRole || user.userRole || user.accountType || user.type,
    phoneNumber:
      user.phoneNumber ||
      user.phone ||
      user.mobileNumber ||
      user.mobile ||
      user.phone_number ||
      "",
  };
}

function readStoredUser() {
  try {
    const savedUser = localStorage.getItem("User");
    return savedUser ? JSON.parse(savedUser) : null;
  } catch {
    return null;
  }
}

export function mergeAuthUsers(nextUser, previousUser = readStoredUser()) {
  const next = normalizeAuthUser(nextUser);
  const previous = normalizeAuthUser(previousUser);

  if (!next) {
    return previous;
  }

  return {
    ...(previous || {}),
    ...next,
    fullName: next.fullName || previous?.fullName || "",
    role: next.role || previous?.role || previous?.currentRole || "",
    phoneNumber:
      next.phoneNumber ||
      next.phone ||
      next.mobileNumber ||
      next.mobile ||
      next.phone_number ||
      previous?.phoneNumber ||
      previous?.phone ||
      previous?.mobileNumber ||
      previous?.mobile ||
      previous?.phone_number ||
      "",
    profilePicture:
      next.profilePicture ||
      next.profileImage ||
      next.avatar ||
      next.imageUrl ||
      next.photo ||
      next.image ||
      previous?.profilePicture ||
      previous?.profileImage ||
      previous?.avatar ||
      previous?.imageUrl ||
      previous?.photo ||
      previous?.image ||
      "",
  };
}

export function saveAuthUser(user) {
  if (!user) {
    return null;
  }

  localStorage.setItem("User", JSON.stringify(user));
  window.dispatchEvent(new CustomEvent("ecolink:user-updated", { detail: user }));
  return user;
}

export async function refreshStoredUserProfile(previousUser = readStoredUser()) {
  const profileUser = await fetchCurrentUser();
  return saveAuthUser(mergeAuthUsers(profileUser, previousUser));
}

function buildApiUrl(path) {
  const baseUrl = API_BASE_URL.replace(/\/$/, "");
  const endpoint = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${endpoint}`;
}

function buildProxyApiUrl(path) {
  const baseUrl = API_PROXY_BASE_URL.replace(/\/$/, "");
  const endpoint = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${endpoint}`;
}

function canUseLocalProxyFallback() {
  return (
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/api\/?$/i.test(API_BASE_URL) &&
    typeof window !== "undefined" &&
    /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname)
  );
}

async function postLogin(url, credentials) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error = new Error(data?.message || "Login failed");
    error.response = { status: response.status, data };
    throw error;
  }

  return data;
}

export async function loginUser(credentials) {
  try {
    return await postLogin(buildApiUrl(API_ENDPOINTS.auth.login), credentials);
  } catch (error) {
    if (error?.response || !canUseLocalProxyFallback()) {
      throw error;
    }

    return postLogin(buildProxyApiUrl(API_ENDPOINTS.auth.login), credentials);
  }
}

export async function registerUser(payload) {
  const response = await apiClient.post(API_ENDPOINTS.auth.register, payload);
  return response;
}

export async function verifyOtp(endpoint, payload) {
  const response = await apiClient.post(endpoint || API_ENDPOINTS.auth.verifyEmail, payload);
  return response.data;
}

export async function resendOtp(endpoint, payload) {
  const response = await apiClient.post(endpoint || API_ENDPOINTS.auth.forgotPassword, payload);
  return response.data;
}

export async function requestPasswordReset(email) {
  const response = await apiClient.post(API_ENDPOINTS.auth.forgotPassword, { email });
  return response.data;
}

export async function verifyPasswordResetCode(payload) {
  const response = await apiClient.post(API_ENDPOINTS.auth.verifyCode, {
    email: payload.email,
    code: payload.code,
  });
  return response.data;
}

export async function resetPassword(payload) {
  const response = await apiClient.post(API_ENDPOINTS.auth.resetPassword, {
    email: payload.email,
    password: payload.password,
    confirmPassword: payload.confirmPassword,
  });
  return response.data;
}

export async function fetchCurrentUser() {
  const response = await apiClient.get(API_ENDPOINTS.user.profile);
  return normalizeAuthUser(
    response.data?.data?.user || response.data?.data || response.data?.user || response.data || null
  );
}

export async function updateUserProfile(payload) {
  const cleanPayload = Object.entries(payload || {}).reduce((nextPayload, [key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      nextPayload[key] = typeof value === "string" ? value.trim() : value;
    }

    return nextPayload;
  }, {});

  const response = await apiClient.patch(API_ENDPOINTS.user.profile, cleanPayload);
  return normalizeAuthUser(
    response.data?.data?.user || response.data?.data || response.data?.user || response.data || null
  );
}

export async function uploadProfilePicture(file) {
  if (!file) {
    return null;
  }

  const formData = new FormData();
  formData.append("profilePicture", file);

  const response = await apiClient.patch(API_ENDPOINTS.user.uploadProfilePicture, formData);
  return normalizeAuthUser(
    response.data?.data?.user || response.data?.data || response.data?.user || response.data || null
  );
}

export async function logoutUser() {
  const refreshToken = localStorage.getItem("RefreshToken");

  if (refreshToken) {
    await apiClient.post(API_ENDPOINTS.auth.logout, { refreshToken });
  } else {
    await apiClient.post(API_ENDPOINTS.auth.logout);
  }
}

export function storeAuthSession(data) {
  const userToken = findAuthToken(data);
  const refreshToken = findRefreshToken(data);
  const user = findAuthUser(data);

  if (userToken) {
    localStorage.setItem("UserToken", userToken);
  }

  if (refreshToken) {
    localStorage.setItem("RefreshToken", refreshToken);
  }

  if (user) {
    localStorage.setItem("User", JSON.stringify(user));
  }

  return Boolean(userToken);
}

export function clearAuthSession() {
  localStorage.removeItem("UserToken");
  localStorage.removeItem("RefreshToken");
  localStorage.removeItem("User");
}
