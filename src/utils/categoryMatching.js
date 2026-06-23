export function normalizeComparable(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getCategoryLabel(category, optionLabel) {
  const name = typeof category === "object" && category ? category.name : category;
  const translated = optionLabel(name);
  return translated === `options.${name}` ? name : translated;
}

export function listingMatchesCategory(listing, categoryId, categories = []) {
  if (!categoryId) {
    return true;
  }

  const selectedCategory = categories.find(
    (category) => String(category.id) === String(categoryId) || String(category.name) === String(categoryId)
  );
  const selectedName = selectedCategory?.name || categoryId;
  const selectedComparable = normalizeComparable(selectedName);
  const listingValues = [
    listing.categoryId,
    listing.materialType,
    listing.category,
    listing.categoryName,
  ];

  return listingValues.some((value) => {
    if (String(value || "") === String(categoryId)) {
      return true;
    }

    const comparable = normalizeComparable(value);
    return comparable && selectedComparable && comparable === selectedComparable;
  });
}
