const MATERIAL_KEYWORDS = {
  plastic: ["plastic", "plastics", "pet", "hdpe", "bottle", "packaging", "بلاستيك"],
  metal: ["metal", "aluminum", "aluminium", "steel", "iron", "cans", "scrap", "معادن", "حديد"],
  glass: ["glass", "bottle", "jar", "زجاج"],
  paper: ["paper", "cardboard", "carton", "magazine", "newspaper", "ورق", "كرتون"],
  electronics: ["electronics", "electronic", "computer", "battery", "circuit", "e-waste", "الكترونيات", "إلكترونيات"],
  wood: ["wood", "timber", "pallet", "خشب"],
  textiles: ["textile", "fabric", "cloth", "clothes", "منسوجات"],
};

const FALLBACK_PRICE_BY_MATERIAL = {
  plastic: 18,
  paper: 12,
  cardboard: 10,
  glass: 8,
  metal: 45,
  electronics: 70,
  wood: 15,
  textiles: 20,
  other: 18,
};

const IMPACT_FACTORS = {
  plastic: 1.7,
  paper: 0.9,
  cardboard: 0.75,
  glass: 0.35,
  metal: 3.8,
  electronics: 2.6,
  wood: 0.55,
  textiles: 2.1,
  other: 0.8,
};

const HIGH_RECYCLABILITY = new Set(["plastic", "metal", "glass", "paper", "cardboard"]);
const MEDIUM_RECYCLABILITY = new Set(["electronics", "wood", "textiles"]);
const HIGH_VALUE = new Set(["metal", "electronics"]);
const MEDIUM_VALUE = new Set(["plastic", "wood", "textiles"]);

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ");
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getMaterialText(listing = {}) {
  return [
    listing.materialType,
    listing.category,
    listing.categoryName,
    listing.materialName,
    listing.title,
    listing.description,
  ]
    .filter(Boolean)
    .join(" ");
}

function getMaterialKey(value) {
  const text = normalizeText(value);

  for (const [material, keywords] of Object.entries(MATERIAL_KEYWORDS)) {
    if (keywords.some((keyword) => text.includes(normalizeText(keyword)))) {
      return material;
    }
  }

  if (text.includes("cardboard") || text.includes("carton")) {
    return "cardboard";
  }

  return text || "other";
}

function getListingMaterialKey(listing = {}) {
  return getMaterialKey(getMaterialText(listing));
}

function getQuantity(listing = {}) {
  const value = Number(listing.quantity);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function getPrice(listing = {}) {
  const value = Number(listing.price);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function getKgQuantity(listing = {}) {
  const quantity = getQuantity(listing);
  const unit = normalizeText(listing.unit);

  if (!quantity) {
    return 0;
  }

  if (unit.includes("ton")) {
    return quantity * 1000;
  }

  if (unit.includes("kg") || unit.includes("kilo")) {
    return quantity;
  }

  if (unit.includes("box")) {
    return quantity * 8;
  }

  return quantity;
}

function getConditionScore(condition) {
  const normalized = normalizeText(condition);

  if (["clean", "sorted", "new", "excellent", "good"].some((word) => normalized.includes(word))) {
    return 1;
  }

  if (["mixed", "fair", "reusable", "used"].some((word) => normalized.includes(word))) {
    return 0.68;
  }

  if (["needs sorting", "damaged", "poor", "contaminated"].some((word) => normalized.includes(word))) {
    return 0.35;
  }

  return normalized ? 0.55 : 0.4;
}

function getListingLocationText(listing = {}) {
  return [listing.area, listing.city, listing.address, listing.displayLocation, listing.location]
    .filter(Boolean)
    .join(" ");
}

function arrayFromNeeds(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  return value ? [value] : [];
}

function getNeedMaterials(factoryNeeds = {}) {
  return [
    ...arrayFromNeeds(factoryNeeds.materialTypes),
    ...arrayFromNeeds(factoryNeeds.categories),
    ...arrayFromNeeds(factoryNeeds.productionNeeds),
    factoryNeeds.category,
    factoryNeeds.materialType,
    factoryNeeds.searchTerm,
    factoryNeeds.needsText,
  ].filter(Boolean);
}

function getNeedLocation(factoryNeeds = {}) {
  return [factoryNeeds.location, factoryNeeds.city, factoryNeeds.area].filter(Boolean).join(" ");
}

export function calculateSmartMatchScore(listing = {}, factoryNeeds = {}) {
  const materialKey = getListingMaterialKey(listing);
  const needMaterials = getNeedMaterials(factoryNeeds);
  const needMaterialKeys = needMaterials.map(getMaterialKey).filter(Boolean);
  const hasNeedMaterial = needMaterialKeys.length > 0;
  const materialMatch = hasNeedMaterial
    ? needMaterialKeys.includes(materialKey) ||
      needMaterials.some((need) => normalizeText(getMaterialText(listing)).includes(normalizeText(need)))
    : true;
  const materialScore = materialMatch ? 30 : hasNeedMaterial ? 8 : 22;

  const quantity = getQuantity(listing);
  const targetQuantity = Number(factoryNeeds.targetQuantity || factoryNeeds.quantity || 0);
  const quantityScore = !targetQuantity
    ? quantity > 0
      ? 14
      : 5
    : clampScore(Math.min(quantity / targetQuantity, 1) * 16);

  const conditionScore = Math.round(getConditionScore(listing.condition) * 14);

  const listingLocation = normalizeText(getListingLocationText(listing));
  const needLocation = normalizeText(getNeedLocation(factoryNeeds));
  const locationScore = !needLocation
    ? listingLocation
      ? 10
      : 5
    : listingLocation.includes(needLocation) || needLocation.includes(listingLocation)
      ? 12
      : 4;

  const price = getPrice(listing);
  const maxPrice = Number(factoryNeeds.maxPrice || 0);
  const priceScore = !maxPrice
    ? price > 0
      ? 9
      : 4
    : price && price <= maxPrice
      ? 12
      : price
        ? 5
        : 3;

  const recyclability = classifyRecyclability(listing);
  const recyclabilityScore =
    recyclability.level === "high" ? 12 : recyclability.level === "medium" ? 8 : 4;

  const score = clampScore(
    materialScore + quantityScore + conditionScore + locationScore + priceScore + recyclabilityScore
  );

  let reasonKey = "smartEcoAi.reasonBalanced";
  if (materialMatch && hasNeedMaterial) {
    reasonKey = "smartEcoAi.reasonMaterial";
  } else if (recyclability.level === "high") {
    reasonKey = "smartEcoAi.reasonRecyclable";
  } else if (price && (!maxPrice || price <= maxPrice)) {
    reasonKey = "smartEcoAi.reasonPrice";
  }

  return {
    score,
    reasonKey,
    materialKey,
    reason: "AI-like rule-based smart matching based on material, quantity, condition, location, price, and recyclability.",
  };
}

export function getPriceEstimation(listing = {}, allListings = []) {
  const materialKey = getListingMaterialKey(listing);
  const price = getPrice(listing);
  const listingUnitPrice = price;
  const similarUnitPrices = allListings
    .filter((item) => item && item !== listing && getListingMaterialKey(item) === materialKey)
    .map((item) => {
      const itemPrice = getPrice(item);
      const itemQuantity = getQuantity(item) || 1;
      return itemPrice ? itemPrice / itemQuantity : 0;
    })
    .filter((value) => Number.isFinite(value) && value > 0);
  const averageUnitPrice =
    similarUnitPrices.length > 0
      ? similarUnitPrices.reduce((sum, value) => sum + value, 0) / similarUnitPrices.length
      : FALLBACK_PRICE_BY_MATERIAL[materialKey] || FALLBACK_PRICE_BY_MATERIAL.other;
  const conditionMultiplier = 0.85 + getConditionScore(listing.condition) * 0.3;
  const fairPrice = averageUnitPrice * conditionMultiplier;
  const ratio = fairPrice ? listingUnitPrice / fairPrice : 1;

  if (!price) {
    return { level: "fair", labelKey: "smartEcoAi.priceFair", averageUnitPrice, basis: "fallback" };
  }

  if (ratio < 0.85) {
    return { level: "low", labelKey: "smartEcoAi.priceLow", averageUnitPrice, basis: similarUnitPrices.length ? "live" : "fallback" };
  }

  if (ratio > 1.18) {
    return { level: "high", labelKey: "smartEcoAi.priceHigh", averageUnitPrice, basis: similarUnitPrices.length ? "live" : "fallback" };
  }

  return { level: "fair", labelKey: "smartEcoAi.priceFair", averageUnitPrice, basis: similarUnitPrices.length ? "live" : "fallback" };
}

export function classifyRecyclability(listing = {}) {
  const materialKey = getListingMaterialKey(listing);
  const conditionScore = getConditionScore(listing.condition);
  const quantity = getKgQuantity(listing);
  let score = 35;

  if (HIGH_RECYCLABILITY.has(materialKey)) {
    score += 35;
  } else if (MEDIUM_RECYCLABILITY.has(materialKey)) {
    score += 20;
  }

  score += Math.round(conditionScore * 20);

  if (quantity >= 100) {
    score += 10;
  } else if (quantity >= 25) {
    score += 5;
  }

  const level = score >= 75 ? "high" : score >= 52 ? "medium" : "low";
  return { level, score: clampScore(score), labelKey: `smartEcoAi.recyclability.${level}` };
}

export function classifyPotentialValue(listing = {}) {
  const materialKey = getListingMaterialKey(listing);
  const price = getPrice(listing);
  const quantity = getKgQuantity(listing);
  let score = 25;

  if (HIGH_VALUE.has(materialKey)) {
    score += 38;
  } else if (MEDIUM_VALUE.has(materialKey)) {
    score += 24;
  } else {
    score += 12;
  }

  if (quantity >= 250) {
    score += 20;
  } else if (quantity >= 50) {
    score += 12;
  } else if (quantity > 0) {
    score += 6;
  }

  if (price >= 1000) {
    score += 12;
  } else if (price >= 250) {
    score += 7;
  }

  const level = score >= 72 ? "high" : score >= 48 ? "medium" : "low";
  return { level, score: clampScore(score), labelKey: `smartEcoAi.value.${level}` };
}

export function estimateEnvironmentalImpact(listing = {}) {
  const materialKey = getListingMaterialKey(listing);
  const quantityKg = getKgQuantity(listing);
  const factor = IMPACT_FACTORS[materialKey] || IMPACT_FACTORS.other;
  const co2SavingKg = Math.round(quantityKg * factor);
  const reusedUnits = Math.max(1, Math.round(quantityKg || getQuantity(listing)));
  const contributionLevel =
    co2SavingKg >= 500 ? "high" : co2SavingKg >= 100 ? "medium" : "low";

  return {
    reusedUnits,
    co2SavingKg,
    contributionLevel,
    labelKey: `smartEcoAi.impact.${contributionLevel}`,
  };
}

export function getAuditReadinessScore(listing = {}) {
  const checks = [
    Boolean(listing.materialType || listing.category || listing.categoryId),
    getQuantity(listing) > 0,
    Boolean(listing.condition),
    Boolean(getListingLocationText(listing)),
    getPrice(listing) > 0,
    Boolean(listing.description),
    Boolean((listing.existingImages || listing.images || []).length || listing.image || listing.imageUrl),
    Boolean(listing.requestVerification || listing.verified || listing.verificationStatus),
  ];
  const completed = checks.filter(Boolean).length;
  const score = clampScore((completed / checks.length) * 100);
  const level = score >= 80 ? "high" : score >= 55 ? "medium" : "low";

  return {
    score,
    completed,
    total: checks.length,
    level,
    labelKey: `smartEcoAi.audit.${level}`,
  };
}

export function suggestCategoryFromImage(listing = {}) {
  const imageValues = [
    ...(Array.isArray(listing.existingImages) ? listing.existingImages : []),
    ...(Array.isArray(listing.images) ? listing.images : []),
    listing.image,
    listing.imageUrl,
    listing.thumbnail,
  ].filter(Boolean);
  const imageText = imageValues
    .map((value) => String(value).split(/[\\/]/).pop() || String(value))
    .join(" ");
  const suggestedKey = getMaterialKey(imageText);
  const listingKey = getListingMaterialKey(listing);
  const hasUsefulSuggestion = suggestedKey && suggestedKey !== "other" && suggestedKey.length > 2;
  const matchesSelected = hasUsefulSuggestion && suggestedKey === listingKey;

  return {
    suggestedCategory: hasUsefulSuggestion ? suggestedKey : "",
    matchesSelected,
    labelKey: hasUsefulSuggestion
      ? matchesSelected
        ? "smartEcoAi.imageMatches"
        : "smartEcoAi.imageMayMatch"
      : "smartEcoAi.imageVerify",
  };
}

export function getRecommendedMatches(listings = [], factoryNeeds = {}, limit = 3) {
  return listings
    .map((listing) => ({
      listing,
      match: calculateSmartMatchScore(listing, factoryNeeds),
    }))
    .filter(({ match }) => match.score >= 45)
    .sort((first, second) => second.match.score - first.match.score)
    .slice(0, limit);
}
export function calculateEcoScore(listing = {}, allListings = []) {
  const recyclability = classifyRecyclability(listing);
  const priceEstimation = getPriceEstimation(listing, allListings);
  const value = classifyPotentialValue(listing);
  const conditionScore = getConditionScore(listing.condition);
  const quantityKg = getKgQuantity(listing);

  const recyclabilityPoints = recyclability.score * 0.35;

  const pricePoints =
    priceEstimation.level === "low" ? 25 :
    priceEstimation.level === "fair" ? 18 : 8;

  const conditionPoints = conditionScore * 20;

  const valuePoints =
    value.level === "high" ? 12 :
    value.level === "medium" ? 8 : 4;

  const quantityPoints =
    quantityKg >= 1000 ? 8 :
    quantityKg >= 100 ? 6 :
    quantityKg >= 25 ? 4 : 2;

  return clampScore(
    recyclabilityPoints + pricePoints + conditionPoints + valuePoints + quantityPoints
  );
}