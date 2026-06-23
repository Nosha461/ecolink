import apiClient from "./apiClient";
import { API_ENDPOINTS } from "./apiConfig";

function extractArray(payload, keys = []) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const candidates = [
    payload.data,
    payload.results,
    payload.items,
    payload.docs,
    ...keys.map((key) => payload[key]),
    ...keys.map((key) => payload.data?.[key]),
  ];

  return candidates.find(Array.isArray) || [];
}

export function normalizeCategory(rawCategory) {
  const category = rawCategory?.category || rawCategory;

  if (!category || typeof category !== "object") {
    return null;
  }

  const id = category._id || category.id || category.categoryId || "";
  const name = category.name || category.title || category.categoryName || "";

  if (!id || !name) {
    return null;
  }

  return {
    ...category,
    _id: id,
    id,
    name,
    description: category.description || "",
  };
}

export async function getCategories() {
  const response = await apiClient.get(API_ENDPOINTS.categories.root);
  return extractArray(response.data, ["categories", "category"])
    .map(normalizeCategory)
    .filter(Boolean);
}

export async function createCategory(payload) {
  const name = String(payload.name || "").trim();
  const description = String(payload.description || "").trim() || name;
  const response = await apiClient.post(API_ENDPOINTS.categories.create, {
    name,
    description,
  });

  return normalizeCategory(response.data?.data || response.data);
}
