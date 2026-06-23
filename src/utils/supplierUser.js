import { API_BASE_URL } from "./apiConfig";

export const DEFAULT_PROFILE_IMAGE = "/assets/office-man.png";

function getApiOrigin() {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return API_BASE_URL.replace(/\/api\/?$/, "");
  }
}

function readSavedUser() {
  try {
    const savedUser = localStorage.getItem("User");
    return savedUser ? JSON.parse(savedUser) : null;
  } catch {
    return null;
  }
}

function decodeTokenPayload() {
  const token = localStorage.getItem("UserToken");

  if (!token) {
    return null;
  }

  try {
    const payload = token.split(".")[1];
    return payload ? JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) : null;
  } catch {
    return null;
  }
}

function findRole(source) {
  if (!source || typeof source !== "object") {
    return "";
  }

  const directRole = source.role || source.userRole || source.accountType || source.type;
  if (directRole) {
    return directRole;
  }

  return findRole(source.user) || findRole(source.data) || findRole(source.profile);
}

export function resolveProfileImage(value) {
  const rawValue =
    typeof value === "string"
      ? value
      : value?.url ||
        value?.secure_url ||
        value?.imageUrl ||
        value?.profileImage ||
        value?.profilePicture ||
        value?.avatar ||
        value?.path ||
        value?.filename ||
        "";

  if (!rawValue || typeof rawValue !== "string") {
    return "";
  }

  const imageUrl = rawValue.trim().replace(/\\/g, "/");

  if (!imageUrl || ["undefined", "null", "none", "[object object]"].includes(imageUrl.toLowerCase())) {
    return "";
  }

  if (/^(https?:|data:|blob:|\/assets\/)/i.test(imageUrl)) {
    return imageUrl;
  }

  const cleanedImageUrl = imageUrl.replace(/^\.?\//, "");
  const uploadPathMatch = cleanedImageUrl.match(/(?:^|\/)(?:src\/)?uploads\/(.+)$/i);
  const normalizedImagePath = uploadPathMatch ? `uploads/${uploadPathMatch[1]}` : cleanedImageUrl;
  const publicUploadPath = normalizedImagePath
    .replace(/^src\/uploads\//i, "uploads/")
    .replace(/^uploads\/uploads\//i, "uploads/");
  const encodedPublicUploadPath = publicUploadPath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  if (publicUploadPath.startsWith("assets/")) {
    return `/${encodedPublicUploadPath}`;
  }

  if (publicUploadPath.startsWith("uploads/")) {
    return `${getApiOrigin()}/${encodedPublicUploadPath}`;
  }

  return `${getApiOrigin()}/${encodedPublicUploadPath}`;
}

export function getStoredUser() {
  return readSavedUser();
}

export function saveStoredUser(user) {
  if (!user) {
    return null;
  }

  localStorage.setItem("User", JSON.stringify(user));
  window.dispatchEvent(new CustomEvent("ecolink:user-updated", { detail: user }));
  return user;
}

export function formatRole(role) {
  const normalizedRole = String(role || "").trim().toLowerCase();

  if (normalizedRole === "admin" || normalizedRole === "administrator") {
    return "Admin";
  }

  if (normalizedRole === "seller" || normalizedRole === "supplier") {
    return "Supplier";
  }

  if (normalizedRole === "buyer") {
    return "Buyer";
  }

  return "";
}

function addImageCacheKey(imageUrl, cacheKey) {
  if (!imageUrl || !cacheKey || !/\/uploads\//i.test(imageUrl)) {
    return imageUrl;
  }

  const separator = imageUrl.includes("?") ? "&" : "?";
  return `${imageUrl}${separator}v=${encodeURIComponent(cacheKey)}`;
}

export function getSupplierUser() {
  const user = readSavedUser();
  const tokenPayload = decodeTokenPayload();
  const fullName =
    user?.fullName ||
    user?.name ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    "EcoLink User";
  const firstName = user?.firstName || fullName.split(" ")[0] || "EcoLink";

  const profileImage = resolveProfileImage(
    user?.profilePicture ||
      user?.profileImage ||
      user?.avatar ||
      user?.imageUrl ||
      user?.photo ||
      user?.image
  );

  return {
    id: user?._id || user?.id || user?.userId || tokenPayload?._id || tokenPayload?.id || tokenPayload?.userId || "",
    factoryId:
      user?.factoryId ||
      user?.factory?._id ||
      user?.factory?.id ||
      tokenPayload?.factoryId ||
      tokenPayload?.factory?._id ||
      tokenPayload?.factory?.id ||
      "",
    firstName,
    fullName,
    role: formatRole(findRole(user) || findRole(tokenPayload)) || "Unknown role",
    image:
      addImageCacheKey(profileImage, user?._profileImageUpdatedAt || user?.updatedAt) ||
      DEFAULT_PROFILE_IMAGE,
  };
}
