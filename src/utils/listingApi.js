import apiClient from "./apiClient";
import { API_BASE_URL, API_ENDPOINTS } from "./apiConfig";
export { getCategories, normalizeCategory } from "./categoryApi";

const LISTINGS_ENDPOINT = API_ENDPOINTS.listings.root;
const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;
const LOCAL_LISTING_IMAGES_KEY = "EcoLinkLocalListingImages";
const LOCAL_LISTING_META_KEY = "EcoLinkLocalListingMeta";
const LOCAL_IMAGE_MAX_DIMENSION = 1200;
const LOCAL_IMAGE_QUALITY = 0.82;
const sessionListingImages = new Map();

function unwrapData(response) {
  return response?.data?.data || response?.data || null;
}

function extractListingArray(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const candidates = [
    payload.results,
    payload.listings,
    payload.wastes,
    payload.waste,
    payload.items,
    payload.docs,
    payload.data,
    payload.data?.results,
    payload.data?.listings,
    payload.data?.wastes,
    payload.data?.waste,
    payload.data?.items,
    payload.data?.docs,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }

    if (candidate && typeof candidate === "object") {
      const nestedArray = [
        candidate.results,
        candidate.listings,
        candidate.wastes,
        candidate.waste,
        candidate.items,
        candidate.docs,
      ].find(Array.isArray);

      if (nestedArray) {
        return nestedArray;
      }
    }
  }

  return [];
}

function shouldTryFallbackEndpoint(error) {
  const status = error?.response?.status;
  return !status || [404, 405].includes(status);
}

async function getFirstAvailableListingResponse(endpoints, config = {}) {
  let lastError;

  for (const endpoint of endpoints.filter(Boolean)) {
    try {
      return await apiClient.get(endpoint, config);
    } catch (error) {
      lastError = error;
      if (!shouldTryFallbackEndpoint(error)) {
        throw error;
      }
    }
  }

  throw lastError;
}

function getCurrentUserId() {
  try {
    const user = JSON.parse(localStorage.getItem("User") || "null");
    return String(user?._id || user?.id || user?.userId || "").trim();
  } catch {
    return "";
  }
}

function getCurrentFactoryId() {
  try {
    const user = JSON.parse(localStorage.getItem("User") || "null");
    return String(user?.factoryId || user?.factory?._id || user?.factory?.id || "").trim();
  } catch {
    return "";
  }
}

function getApiOrigin() {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return API_BASE_URL.replace(/\/api\/?$/, "");
  }
}

function isMissingImageValue(value) {
  return ["undefined", "null", "none", "[object object]"].includes(value.trim().toLowerCase());
}

function stripQueryAndHash(value) {
  return value.split(/[?#]/)[0];
}

function getFileName(value) {
  return stripQueryAndHash(value).split("/").filter(Boolean).pop() || "";
}

function getListingOwnerUserId(listing = {}) {
  return (
    listing.ownerUserId ||
    listing.userId ||
    listing.supplierId ||
    listing.sellerId ||
    listing.factory?.user?._id ||
    listing.factory?.owner?._id ||
    listing.factory?.createdBy?._id ||
    listing.factory?.user ||
    listing.factory?.owner ||
    listing.factory?.createdBy ||
    listing.createdBy ||
    ""
  );
}

function withApiOrigin(pathname) {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${getApiOrigin()}${normalizedPath}`;
}

function readLocalListingImages() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_LISTING_IMAGES_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocalListingImages(imagesByListingId) {
  try {
    localStorage.setItem(LOCAL_LISTING_IMAGES_KEY, JSON.stringify(imagesByListingId));
  } catch {
    // Local image persistence is a frontend-only fallback. Ignore quota/private-mode failures.
  }
}

function readLocalListingMeta() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_LISTING_META_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocalListingMeta(metaByListingId) {
  try {
    localStorage.setItem(LOCAL_LISTING_META_KEY, JSON.stringify(metaByListingId));
  } catch {
    // Frontend-only fallback. Ignore quota/private-mode failures.
  }
}

function getLocalListingMeta(listingId) {
  if (!listingId) {
    return {};
  }

  const meta = readLocalListingMeta()[String(listingId)];
  return meta && typeof meta === "object" ? meta : {};
}

function getLocationDisplayFromValues(values = {}) {
  return [values.area, values.city, values.address]
    .filter(Boolean)
    .map((part) => String(part).trim())
    .filter(Boolean)
    .join(", ");
}

function saveLocalListingMeta(listingId, values = {}) {
  if (!listingId) {
    return;
  }

  const currentMeta = readLocalListingMeta();
  currentMeta[String(listingId)] = {
    ...(currentMeta[String(listingId)] || {}),
    city: values.city || "",
    area: values.area || "",
    address: values.address || "",
    displayLocation: getLocationDisplayFromValues(values),
    location: getLocationDisplayFromValues(values),
  };
  writeLocalListingMeta(currentMeta);
}

function getLocalImageKeys(listing = {}) {
  const keys = [
    listing._id,
    listing.id,
    listing.title,
    listing.materialName,
    listing.name,
  ];

  return keys
    .filter(Boolean)
    .map((value) => String(value).trim())
    .filter(Boolean)
    .flatMap((value) => [value, value.toLowerCase()])
    .filter((value, index, allKeys) => allKeys.indexOf(value) === index);
}

function getLocalListingImages(listing) {
  const keys = typeof listing === "object" && listing ? getLocalImageKeys(listing) : [listing];
  const normalizedKeys = keys.map((key) => String(key || "").trim()).filter(Boolean);

  if (normalizedKeys.length === 0) {
    return [];
  }

  const sessionImages = normalizedKeys
    .map((key) => sessionListingImages.get(key))
    .find((images) => Array.isArray(images) && images.length > 0);

  if (Array.isArray(sessionImages) && sessionImages.length > 0) {
    return sessionImages;
  }

  const savedImages = readLocalListingImages();
  const images = normalizedKeys
    .map((key) => savedImages[key])
    .find((imageList) => Array.isArray(imageList) && imageList.length > 0);

  return Array.isArray(images) ? images.filter(Boolean) : [];
}

function compressImageDataUrl(dataUrl) {
  return new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith("data:image/")) {
      resolve(dataUrl || "");
      return;
    }

    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, LOCAL_IMAGE_MAX_DIMENSION / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");

      if (!context) {
        resolve(dataUrl);
        return;
      }

      context.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", LOCAL_IMAGE_QUALITY));
    };
    image.onerror = () => resolve(dataUrl);
    image.src = dataUrl;
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve) => {
    if (!(file instanceof File)) {
      resolve("");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      resolve(await compressImageDataUrl(result));
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

async function saveLocalListingImages(listing, files = []) {
  const keys = typeof listing === "object" && listing ? getLocalImageKeys(listing) : [listing];
  const normalizedKeys = keys.map((key) => String(key || "").trim()).filter(Boolean);

  if (normalizedKeys.length === 0 || !files.length) {
    return;
  }

  const objectUrls = files
    .filter((file) => file instanceof File)
    .map((file) => URL.createObjectURL(file));

  if (objectUrls.length > 0) {
    normalizedKeys.forEach((key) => sessionListingImages.set(key, objectUrls));
  }

  const dataUrls = (await Promise.all(files.map(fileToDataUrl))).filter(Boolean);
  if (dataUrls.length === 0) {
    return;
  }

  const currentImages = readLocalListingImages();
  normalizedKeys.forEach((key) => {
    currentImages[key] = dataUrls;
  });
  writeLocalListingImages(currentImages);
}

function saveLocalListingImageValues(listing, imageValues = []) {
  const keys = typeof listing === "object" && listing ? getLocalImageKeys(listing) : [listing];
  const normalizedKeys = keys.map((key) => String(key || "").trim()).filter(Boolean);
  const normalizedImages = imageValues
    .filter((image) => typeof image === "string")
    .map((image) => image.trim())
    .filter((image) => image && !/^blob:/i.test(image));

  if (normalizedKeys.length === 0 || normalizedImages.length === 0) {
    return;
  }

  const currentImages = readLocalListingImages();
  normalizedKeys.forEach((key) => {
    currentImages[key] = normalizedImages;
  });
  writeLocalListingImages(currentImages);
}

export function resolveUploadedImageUrl(value, listingContext = {}) {
  if (!value) {
    return "";
  }

  const rawValue =
    typeof value === "string"
      ? value
      : value.url ||
        value.secure_url ||
        value.imageUrl ||
        value.path ||
        value.finalPath ||
        value.destination ||
        value.filename ||
        value.file ||
        "";

  if (!rawValue || typeof rawValue !== "string") {
    return "";
  }

  const imageUrl = rawValue.trim().replace(/\\/g, "/");

  if (!imageUrl || isMissingImageValue(imageUrl)) {
    return "";
  }

  if (/^(https?:|data:|blob:)/i.test(imageUrl)) {
    return imageUrl;
  }

  const cleanedImageUrl = imageUrl.replace(/^\.?\//, "");
  const lowerImageUrl = cleanedImageUrl.toLowerCase();

  const srcUploadsIndex = lowerImageUrl.lastIndexOf("src/uploads/");
  if (srcUploadsIndex >= 0) {
    return withApiOrigin(cleanedImageUrl.slice(srcUploadsIndex + 4));
  }

  const uploadsIndex = lowerImageUrl.lastIndexOf("uploads/");
  if (uploadsIndex >= 0) {
    return withApiOrigin(cleanedImageUrl.slice(uploadsIndex));
  }

  if (lowerImageUrl.startsWith("waste/")) {
    return withApiOrigin(`uploads/${cleanedImageUrl}`);
  }

  const localWindowsPathPattern = /^\/?[a-z]:\//i;
  if (localWindowsPathPattern.test(imageUrl)) {
    const fileName = getFileName(imageUrl);
    return fileName && !isMissingImageValue(fileName)
      ? resolveUploadedImageUrl(fileName, listingContext)
      : "";
  }

  if (cleanedImageUrl.startsWith("assets/")) {
    return withApiOrigin(cleanedImageUrl);
  }

  if (cleanedImageUrl.includes("/")) {
    return withApiOrigin(cleanedImageUrl);
  }

  const ownerUserId = getListingOwnerUserId(listingContext);
  if (ownerUserId) {
    return withApiOrigin(`uploads/waste/${ownerUserId}/undefined/${cleanedImageUrl}`);
  }

  return withApiOrigin(`uploads/${cleanedImageUrl}`);
}

function normalizeImageList(listing) {
  const imageCandidates = [
    listing.images,
    listing.imageUrls,
    listing.photos,
    listing.attachments,
    listing.files,
    listing.gallery,
    listing.image,
    listing.imageUrl,
    listing.photo,
    listing.file,
    listing.thumbnail,
    listing.picture,
    listing.logoUrl,
    listing.wasteImage,
    listing.wasteImages,
  ];

  return imageCandidates
    .flatMap((candidate) => (Array.isArray(candidate) ? candidate : [candidate]))
    .map((candidate) => resolveUploadedImageUrl(candidate, listing))
    .filter(Boolean);
}

export function isAvailableListingStatus(status) {
  const normalizedStatus = String(status || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "_");

  return !["archived", "removed", "deleted", "inactive"].includes(normalizedStatus);
}

function asText(value) {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function parseLocationParts(value) {
  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeLocation(rawLocation, listing = {}) {
  const factory = listing.factory || listing.supplierFactory || listing.sellerFactory || {};
  const supplier = listing.supplier || listing.seller || listing.owner || {};
  const user = listing.user || listing.createdBy || {};
  const factoryUser = typeof factory.user === "object" && factory.user ? factory.user : {};
  const factoryLocationParts = parseLocationParts(factory.location || factoryUser.location);
  const city =
    asText(listing.city) ||
    asText(listing.governorate) ||
    asText(listing.locationCity) ||
    asText(rawLocation?.city) ||
    asText(rawLocation?.governorate) ||
    asText(factory.city) ||
    asText(factory.governorate) ||
    asText(supplier.city) ||
    asText(user.city) ||
    factoryLocationParts[1] ||
    factoryLocationParts[0] ||
    "";
  const area =
    asText(listing.area) ||
    asText(listing.district) ||
    asText(listing.locationArea) ||
    asText(rawLocation?.area) ||
    asText(rawLocation?.district) ||
    asText(factory.area) ||
    asText(factory.district) ||
    asText(supplier.area) ||
    asText(user.area) ||
    "";
  const address =
    asText(listing.address) ||
    asText(listing.locationAddress) ||
    asText(rawLocation?.address) ||
    asText(rawLocation?.street) ||
    asText(factory.address) ||
    asText(supplier.address) ||
    asText(user.address) ||
    asText(user.location) ||
    asText(factoryUser.location) ||
    factoryLocationParts.slice(2).join(", ");

  if (typeof rawLocation === "string") {
    const parts = parseLocationParts(rawLocation);

    return {
      city: city || parts[1] || "",
      area: area || parts[0] || "",
      address: address || parts.slice(2).join(", "),
      displayLocation: [area || parts[0], city || parts[1], address || parts.slice(2).join(", ")]
        .filter(Boolean)
        .join(", "),
    };
  }

  const rawLocationText = asText(rawLocation);
  const displayLocation = [area, city, address].filter(Boolean).join(", ") || rawLocationText;

  return {
    city,
    area,
    address,
    displayLocation,
  };
}

export function normalizeListing(rawListing) {
  const listing =
    rawListing?.listing ||
    rawListing?.waste ||
    rawListing?.material ||
    rawListing?.item ||
    rawListing;

  if (!listing) {
    return null;
  }

  const normalizedLocation = normalizeLocation(listing.location, listing);
  const category =
    typeof listing.category === "object" && listing.category
      ? listing.category.name || listing.category.title
      : listing.category;
  const categoryId =
    listing.categoryId ||
    listing.category_ID ||
    (typeof listing.category === "object" && listing.category
      ? listing.category._id || listing.category.id
      : "");

  const id = listing._id || listing.id || "";
  const localMeta = getLocalListingMeta(id);
  const backendImages = normalizeImageList(listing);
  const localImages = getLocalListingImages(listing);
  const city = normalizedLocation.city || localMeta.city || "";
  const area = normalizedLocation.area || localMeta.area || "";
  const address = normalizedLocation.address || localMeta.address || "";
  const displayLocation =
    normalizedLocation.displayLocation ||
    localMeta.displayLocation ||
    getLocationDisplayFromValues({ area, city, address });

  return {
    id,
    categoryId,
    materialType: listing.materialType || category || listing.type || categoryId || "Other",
    materialName: listing.materialName || listing.title || listing.name || "",
    condition: listing.condition || "Mixed",
    description: listing.description || "",
    quantity: listing.quantity != null ? String(listing.quantity) : "",
    unit: listing.unit || "Units",
    price: listing.price != null ? String(listing.price) : "",
    currency: listing.currency || "EGP",
    status: listing.status || "",
    createdAt: listing.createdAt || listing.created_at || listing.listedAt || "",
    updatedAt: listing.updatedAt || listing.updated_at || "",
    location: listing.location || localMeta.location || displayLocation || "",
    city,
    area,
    address,
    displayLocation,
    requestVerification: Boolean(
      listing.requestVerification ?? listing.verificationRequested ?? listing.isVerificationRequested
    ),
    images: [],
    existingImages: backendImages.length > 0 ? backendImages : localImages,
    ownerUserId:
      listing.ownerUserId ||
      listing.userId ||
      listing.supplierId ||
      listing.sellerId ||
      listing.factory?.user?._id ||
      listing.factory?.owner?._id ||
      listing.factory?.createdBy?._id ||
      listing.factory?.user ||
      listing.factory?.owner ||
      listing.factory?.createdBy ||
      listing.createdBy ||
      "",
    ownerFactoryId:
      listing.ownerFactoryId ||
      listing.factoryId ||
      listing.factory?._id ||
      listing.factory?.id ||
      "",
    ownerId:
      listing.ownerId ||
      listing.sellerId ||
      listing.userId ||
      listing.supplierId ||
      listing.factoryId ||
      listing.factory?.user?._id ||
      listing.factory?.user ||
      listing.factory?._id ||
      listing.createdBy ||
      "",
    sellerName:
      listing.sellerName ||
      listing.supplierName ||
      listing.factory?.factoryName ||
      listing.factory?.name ||
      listing.factory?.companyName ||
      listing.supplier?.factoryName ||
      listing.seller?.factoryName ||
      listing.owner?.factoryName ||
      "",
  };
}

function buildListingPayload(values) {
  const quantity = Number(values.quantity);
  const price = Number(values.price);

  return {
    materialType: values.materialType,
    category: values.materialType,
    materialName: values.materialName.trim(),
    title: values.materialName.trim(),
    condition: values.condition,
    description: values.description.trim(),
    quantity,
    unit: values.unit,
    price,
    city: values.city,
    area: values.area,
    address: values.address.trim(),
    location: {
      city: values.city,
      area: values.area,
      address: values.address.trim(),
    },
    requestVerification: values.requestVerification,
  };
}

function buildFormData(values) {
  const payload = buildListingPayload(values);
  const formData = new FormData();
  const categoryId = getCategoryId(values);

  formData.append("categoryId", categoryId);
  formData.append("title", payload.title);
  formData.append("description", payload.description);
  formData.append("quantity", payload.quantity);
  formData.append("unit", payload.unit);
  formData.append("price", payload.price);
  formData.append("currency", values.currency || "EGP");
  formData.append("status", values.status || "available");
  formData.append("city", payload.city);
  formData.append("area", payload.area);
  formData.append("address", payload.address);

  if (values.city || values.area || values.address) {
    formData.append(
      "location",
      [values.area, values.city, values.address].filter(Boolean).join(", ")
    );
  }

  values.images.forEach((image) => {
    formData.append("images", image);
  });

  return formData;
}

function getCategoryId(values) {
  const categoryId = values.categoryId || values.materialType;

  if (OBJECT_ID_PATTERN.test(String(categoryId || ""))) {
    return categoryId;
  }

  throw new Error("Please select a category before publishing this listing.");
}

export async function createListing(values) {
  const categoryId = getCategoryId(values);
  const response = await apiClient.post(
    API_ENDPOINTS.listings.create(categoryId),
    buildFormData(values)
  );
  const createdListing = normalizeListing(unwrapData(response));

  if (createdListing?.id) {
    await saveLocalListingImages(createdListing, values.images);
    saveLocalListingMeta(createdListing.id, values);
    try {
      return await getListing(createdListing.id);
    } catch {
      return createdListing;
    }
  }

  return createdListing;
}

export async function getListing(listingId) {
  const response = await apiClient.get(API_ENDPOINTS.listings.byId(listingId));
  return normalizeListing(unwrapData(response));
}

export async function getListings(params = {}) {
  const hasCategoryFilter = Boolean(params.categoryId);
  const hasRequestParams = Object.keys(params || {}).some((key) => params[key] != null && params[key] !== "");
  const response = await getFirstAvailableListingResponse(
    hasCategoryFilter
      ? [API_ENDPOINTS.listings.byCategory(params.categoryId), LISTINGS_ENDPOINT]
      : [LISTINGS_ENDPOINT],
    hasCategoryFilter ? {} : { params }
  );
  let data = unwrapData(response);
  let listings = extractListingArray(data);

  if (hasRequestParams && listings.length === 0) {
    const fallbackResponse = await apiClient.get(LISTINGS_ENDPOINT);
    data = unwrapData(fallbackResponse);
    listings = extractListingArray(data);
  }

  return listings
    .map(normalizeListing)
    .filter((listing) => listing && isAvailableListingStatus(listing.status));
}

function isPriceSearchTerm(searchTerm) {
  const normalizedSearch = String(searchTerm || "").trim().replace(/,/g, "");
  return normalizedSearch !== "" && Number.isFinite(Number(normalizedSearch));
}

export async function searchListings(searchTerm = "", params = {}) {
  const response = await apiClient.get(
    API_ENDPOINTS.listings.search({
      search: String(searchTerm || "").trim(),
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
    })
  );
  const data = unwrapData(response);
  const listings = extractListingArray(data)
    .map(normalizeListing)
    .filter((listing) => listing && isAvailableListingStatus(listing.status));

  if (listings.length === 0 && isPriceSearchTerm(searchTerm)) {
    return getListings({ status: "available" });
  }

  return listings;
}

export async function getMyListings() {
  const listings = await getListings();
  const currentUserId = getCurrentUserId();
  const currentFactoryId = getCurrentFactoryId();

  return listings.filter((listing) => {
    const ownerUserId = String(listing?.ownerUserId || "").trim();
    const ownerFactoryId = String(listing?.ownerFactoryId || "").trim();
    const ownerId = String(listing?.ownerId || "").trim();

    return Boolean(
      (currentUserId && (ownerUserId === currentUserId || ownerId === currentUserId)) ||
        (currentFactoryId && (ownerFactoryId === currentFactoryId || ownerId === currentFactoryId))
    );
  });
}

export async function updateListing(listingId, values) {
  const response = await apiClient.patch(
    API_ENDPOINTS.listings.update(listingId),
    buildFormData(values)
  );
  const updatedListing = normalizeListing(unwrapData(response));
  if (values.images.length > 0) {
    await saveLocalListingImages(updatedListing || { id: listingId }, values.images);
  } else {
    saveLocalListingImageValues(updatedListing || { id: listingId }, values.existingImages);
  }
  saveLocalListingMeta(updatedListing?.id || listingId, values);

  try {
    return await getListing(updatedListing?.id || listingId);
  } catch {
    return updatedListing;
  }
}

export async function deleteListing(listingId) {
  const response = await apiClient.delete(API_ENDPOINTS.listings.delete(listingId));
  return response.data?.data || response.data;
}
