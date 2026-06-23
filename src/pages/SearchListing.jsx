import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import DashboardDropdown from "../components/DashboardDropdown";
import { SupplierProfile, SupplierSidebar } from "../components/SupplierDashboardLayout";
import { useI18n } from "../i18n/i18nContext";
import { getApiErrorMessage } from "../utils/apiClient";
import { getCategoryLabel, listingMatchesCategory, normalizeComparable } from "../utils/categoryMatching";
import { getCategories } from "../utils/categoryApi";
import { getListings, isAvailableListingStatus, searchListings } from "../utils/listingApi";
import {
  calculateEcoScore,
  classifyPotentialValue,
  classifyRecyclability,
  estimateEnvironmentalImpact,
  // getAuditReadinessScore,
  getPriceEstimation,
  getRecommendedMatches,
} from "../utils/smartEcoAi";
import { getSupplierUser } from "../utils/supplierUser";
import "./Dashboard.css";
import "./SearchListing.css";

const materialImageByType = {
  Plastic: "/assets/dashboard/materials-plastic.png",
  Glass: "/assets/dashboard/materials-glass.png",
  Metal: "/assets/dashboard/materials-metal.png",
  Paper: "/assets/dashboard/activity-cardboard.png",
  Electronics: "/assets/dashboard/activity-electronics.png",
  Other: "/assets/recycle.png",
};

const defaultCategoryNames = ["Plastic", "Metal", "Paper", "Glass"];
const SEARCH_DETAIL_ICONS = {
  location: "/assets/placeholder.png",
  price: "/assets/best-price.png",
  condition: "/assets/recycling.png",
  date: "/assets/calendar.png",
};

function translateKnownOption(value, optionLabel) {
  if (!value) {
    return "";
  }

  const translated = optionLabel(value);
  return translated === `options.${value}` ? value : translated;
}

function getListingImage(listing) {
  return (
    listing.existingImages?.[0] ||
    listing.images?.[0] ||
    materialImageByType[listing.materialType] ||
    materialImageByType.Other
  );
}

function formatPrice(value, t) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return `0${t("common.egp")}`;
  }

  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(number)}${t("common.egp")}`;
}

function formatSmartMaterial(value, optionLabel) {
  const normalized = String(value || "Other").trim();
  const optionValue = normalized.charAt(0).toUpperCase() + normalized.slice(1);
  return translateKnownOption(optionValue, optionLabel);
}

function formatDate(value, language) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getDisplayLocation(listing, optionLabel, t) {
  const location =
    [listing.area, listing.city, listing.address]
      .filter(Boolean)
      .map((part) => translateKnownOption(part, optionLabel))
      .join(", ") ||
    listing.displayLocation;

  return location || t("searchListing.locationNotAvailable");
}

function matchesSearchTerm(listing, searchTerm) {
  const normalizedSearch = normalizeComparable(searchTerm);
  if (!normalizedSearch) {
    return true;
  }

  return [
    listing.materialName,
    listing.description,
    listing.materialType,
    listing.condition,
    listing.area,
    listing.city,
    listing.address,
    listing.displayLocation,
    listing.price,
    listing.quantity,
    listing.currency,
    `${listing.price || ""} ${listing.currency || ""}`,
  ]
    .filter(Boolean)
    .some((value) => normalizeComparable(value).includes(normalizedSearch));
}

function SmartInsightPanel({ listing, allListings, t }) {
  const ecoScore = calculateEcoScore(listing, allListings);
  const priceEstimation = getPriceEstimation(listing, allListings);
  const recyclability = classifyRecyclability(listing);
  const value = classifyPotentialValue(listing);
  const impact = estimateEnvironmentalImpact(listing);
  // const audit = getAuditReadinessScore(listing);

  return (
    <div className="search-smart-insights" aria-label={t("smartEcoAi.panelLabel")}>
      <span className="search-smart-pill search-smart-pill-strong">
        {t("smartEcoAi.ecoScore", { score: ecoScore })}
      </span>
      <span className={`search-smart-pill search-smart-pill-${priceEstimation.level}`}>
        {t(priceEstimation.labelKey)}
      </span>
      <span className={`search-smart-pill search-smart-pill-${recyclability.level}`}>
        {t(recyclability.labelKey)}
      </span>
      <span className={`search-smart-pill search-smart-pill-${value.level}`}>
        {t(value.labelKey)}
      </span>
      <div className="search-smart-details">
        <p>
          <strong>{t("smartEcoAi.environmentalImpact")}</strong>{" "}
          {t("smartEcoAi.impactDetails", {
            units: impact.reusedUnits,
            co2: impact.co2SavingKg,
            level: t(impact.labelKey),
          })}
        </p>
      </div>
    </div>
  );
}

function RecommendedMatches({ matches, allListings, optionLabel, t }) {
  if (matches.length === 0) {
    return null;
  }

  return (
    <section className="search-recommended" aria-label={t("smartEcoAi.recommendedTitle")}>
      <div className="search-recommended-heading">
        <h2>{t("smartEcoAi.recommendedTitle")}</h2>
        <p>{t("smartEcoAi.recommendedSubtitle")}</p>
      </div>

      <div className="search-recommended-list">
        {matches.map(({ listing, match }) => (
          <Link
            className="search-recommended-card"
            to={`/listing-details/${listing.id}`}
            key={`recommended-${listing.id || listing.materialName}`}
          >
            <strong>{t("smartEcoAi.ecoScore", { score: calculateEcoScore(listing, allListings) })}</strong>
            <span>{listing.materialName || t("listing.untitled")}</span>
            <small>
              {formatSmartMaterial(match.materialKey, optionLabel)} - {t(match.reasonKey)}
            </small>
          </Link>
        ))}
      </div>
    </section>
  );
}

function SearchListingCard({ listing, allListings, factoryNeeds, language, optionLabel, t }) {
  const location = getDisplayLocation(listing, optionLabel, t);
  const listedDate = formatDate(listing.createdAt, language);

  return (
    <article className="search-listing-card">
      <Link
        className="search-listing-card-main"
        to={`/listing-details/${listing.id}`}
        aria-label={`${t("searchListing.viewListing")} ${listing.materialName || t("listing.untitled")}`}
      >
        <img
          className="search-listing-image"
          src={getListingImage(listing)}
          alt={listing.materialName || t("listing.untitled")}
        />

        <div className="search-listing-copy">
          <h2>{listing.materialName || t("listing.untitled")}</h2>
          <p>
            <img src={SEARCH_DETAIL_ICONS.location} alt="" aria-hidden="true" />
            {location}
          </p>
          <p>
            <img src={SEARCH_DETAIL_ICONS.price} alt="" aria-hidden="true" />
            {formatPrice(listing.price, t)}
          </p>
          <SmartInsightPanel
            listing={listing}
            allListings={allListings}
            factoryNeeds={factoryNeeds}
            optionLabel={optionLabel}
            t={t}
          />
          <p>
            <img src={SEARCH_DETAIL_ICONS.condition} alt="" aria-hidden="true" />
            {translateKnownOption(listing.condition, optionLabel) || listing.materialType}
          </p>
          <p>
            <img src={SEARCH_DETAIL_ICONS.date} alt="" aria-hidden="true" />
            {listedDate ? t("searchListing.listedOn", { date: listedDate }) : t("searchListing.listedRecently")}
          </p>
        </div>
      </Link>

      <Link className="search-listing-view" to={`/listing-details/${listing.id}`}>
        {t("searchListing.viewListing")}
        <i className="bi bi-chevron-right" aria-hidden="true" />
      </Link>
    </article>
  );
}

function FilterPanel({
  categories,
  filters,
  setFilters,
  sortBy,
  setSortBy,
  openDropdown,
  setOpenDropdown,
  optionLabel,
  t,
}) {
  const visibleCategories =
    categories.length > 0
      ? categories
      : defaultCategoryNames.map((name) => ({ id: name, name }));

  const toggleCategory = (categoryId) => {
    setFilters((current) => ({
      ...current,
      categoryIds: current.categoryIds.includes(categoryId)
        ? current.categoryIds.filter((id) => id !== categoryId)
        : [...current.categoryIds, categoryId],
    }));
  };

  const updatePrice = (field, value) => {
    setFilters((current) => ({
      ...current,
      [field]: value,
    }));
  };

  return (
    <aside className="search-filter-card" aria-label={t("searchListing.filters")}>
      <section>
        <h2>{t("searchListing.categories")}</h2>
        <div className="search-checkbox-list">
          {visibleCategories.map((category) => (
            <label key={category.id} className="search-checkbox">
              <input
                type="checkbox"
                checked={filters.categoryIds.includes(category.id)}
                onChange={() => toggleCategory(category.id)}
              />
              <span>{getCategoryLabel(category, optionLabel)}</span>
            </label>
          ))}
        </div>
      </section>

      <section>
        <h2>{t("searchListing.sortBy")}</h2>
        <DashboardDropdown
          id="search-sort"
          label={t("searchListing.latestFirst")}
          options={[
            { value: "latest", label: t("searchListing.latestFirst") },
            { value: "oldest", label: t("searchListing.oldestFirst") },
            { value: "priceLow", label: t("searchListing.priceLow") },
            { value: "priceHigh", label: t("searchListing.priceHigh") },
          ]}
          value={sortBy}
          isOpen={openDropdown === "sort"}
          onToggle={() => setOpenDropdown((current) => (current === "sort" ? "" : "sort"))}
          onSelect={(option) => {
            setSortBy(option);
            setOpenDropdown("");
          }}
          onClose={() => setOpenDropdown("")}
        />
      </section>

      <section>
        <h2>{t("searchListing.priceRange")}</h2>
        <div className="search-price-row">
          <input
            type="number"
            min="0"
            inputMode="numeric"
            placeholder={t("searchListing.min")}
            value={filters.minPrice}
            onChange={(event) => updatePrice("minPrice", event.target.value)}
          />
          <input
            type="number"
            min="0"
            inputMode="numeric"
            placeholder={t("searchListing.max")}
            value={filters.maxPrice}
            onChange={(event) => updatePrice("maxPrice", event.target.value)}
          />
        </div>
      </section>
    </aside>
  );
}

export default function SearchListing() {
  const [searchParams] = useSearchParams();
  const dashboardUser = getSupplierUser();
  const { language, t, optionLabel } = useI18n();
  const [listings, setListings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [sortBy, setSortBy] = useState("latest");
  const [openDropdown, setOpenDropdown] = useState("");
  const [filters, setFilters] = useState({
    categoryIds: [],
    minPrice: "",
    maxPrice: "",
  });

  useEffect(() => {
    let isMounted = true;

    async function loadCategories() {
      try {
        const categoryData = await getCategories();
        if (isMounted) {
          setCategories(categoryData);
        }
      } catch {
        if (isMounted) {
          setCategories([]);
        }
      }
    }

    loadCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const timeoutId = window.setTimeout(async () => {
      try {
        setStatus("loading");
        setErrorMessage("");

        const trimmedSearch = searchTerm.trim();
        const requestParams = {
          status: "available",
          minPrice: filters.minPrice,
          maxPrice: filters.maxPrice,
        };
        const data = trimmedSearch
          ? await searchListings(trimmedSearch, requestParams)
          : await getListings(requestParams);

        if (isMounted) {
          setListings(data);
          setStatus("ready");
        }
      } catch (error) {
        if (isMounted) {
          setListings([]);
          setErrorMessage(getApiErrorMessage(error, t("searchListing.loadError"), t));
          setStatus("error");
        }
      }
    }, 240);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [filters.maxPrice, filters.minPrice, searchTerm, t]);

  const locationOptions = useMemo(() => {
    const locations = new Set();

    listings.forEach((listing) => {
      [listing.area, listing.city, listing.address, listing.displayLocation]
        .filter(Boolean)
        .forEach((location) => locations.add(location));
    });

    return Array.from(locations);
  }, [listings]);

  const displayedListings = useMemo(() => {
    const activeCategoryIds = [...new Set(filters.categoryIds.filter(Boolean))];
    const minPrice = Number(filters.minPrice);
    const maxPrice = Number(filters.maxPrice);

    const filtered = listings.filter((listing) => {
      const statusMatch = isAvailableListingStatus(listing.status);
      const searchMatch = matchesSearchTerm(listing, searchTerm);
      const categoryMatch =
        activeCategoryIds.length === 0 ||
        activeCategoryIds.some((categoryId) => listingMatchesCategory(listing, categoryId, categories));
      const locationMatch =
        !selectedLocation ||
        [listing.area, listing.city, listing.address, listing.displayLocation]
          .filter(Boolean)
          .some((value) => normalizeComparable(value).includes(normalizeComparable(selectedLocation)));
      const price = Number(listing.price);
      const minMatch = !filters.minPrice || (Number.isFinite(price) && price >= minPrice);
      const maxMatch = !filters.maxPrice || (Number.isFinite(price) && price <= maxPrice);

      return statusMatch && searchMatch && categoryMatch && locationMatch && minMatch && maxMatch;
    });

    return filtered.sort((first, second) => {
      if (sortBy === "priceLow") {
        return Number(first.price || 0) - Number(second.price || 0);
      }

      if (sortBy === "priceHigh") {
        return Number(second.price || 0) - Number(first.price || 0);
      }

      const firstDate = new Date(first.createdAt || 0).getTime();
      const secondDate = new Date(second.createdAt || 0).getTime();

      return sortBy === "oldest" ? firstDate - secondDate : secondDate - firstDate;
    });
  }, [categories, filters, listings, searchTerm, selectedLocation, sortBy]);

  const factoryNeeds = useMemo(() => {
    const selectedCategoryNames = filters.categoryIds
      .map((categoryId) => categories.find((category) => String(category.id) === String(categoryId)))
      .filter(Boolean)
      .map((category) => category.name);

    return {
      materialTypes: selectedCategoryNames,
      searchTerm,
      location: selectedLocation,
      maxPrice: filters.maxPrice,
      needsText: dashboardUser.role === "Buyer" ? "factory production recyclable material needs" : "",
    };
  }, [categories, dashboardUser.role, filters.categoryIds, filters.maxPrice, searchTerm, selectedLocation]);

  const recommendedMatches = useMemo(
    () => getRecommendedMatches(displayedListings, factoryNeeds, 3),
    [displayedListings, factoryNeeds]
  );

  return (
    <main className="dashboard-shell search-listing-shell">
      <SupplierSidebar />

      <section className="search-listing-content">
        <header className="search-listing-topbar">
          <div>
            <h1>{t("searchListing.title")}</h1>
            <p>{t("searchListing.subtitle")}</p>
          </div>

          <SupplierProfile user={dashboardUser} />
        </header>

        <div className="search-listing-controls">
          <label className="search-field" aria-label={t("common.search")}>
            <i className="bi bi-search" aria-hidden="true" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={t("common.search")}
            />
          </label>

          <DashboardDropdown
            id="search-location"
            label={t("dashboard.location")}
            options={[
              { value: "", label: t("searchListing.allLocations") },
              ...locationOptions.map((location) => ({
                value: location,
                label: translateKnownOption(location, optionLabel),
              })),
            ]}
            value={selectedLocation}
            isOpen={openDropdown === "location"}
            onToggle={() => setOpenDropdown((current) => (current === "location" ? "" : "location"))}
            onSelect={(option) => {
              setSelectedLocation(option);
              setOpenDropdown("");
            }}
            onClose={() => setOpenDropdown("")}
          />
        </div>

        <div className="search-listing-grid">
          <FilterPanel
            categories={categories}
            filters={filters}
            setFilters={setFilters}
            sortBy={sortBy}
            setSortBy={setSortBy}
            openDropdown={openDropdown}
            setOpenDropdown={setOpenDropdown}
            optionLabel={optionLabel}
            t={t}
          />

          <section className="search-listing-results" aria-busy={status === "loading"}>
            <h2>{t("searchListing.heading")}</h2>

            {status === "ready" && (
              <RecommendedMatches
                matches={recommendedMatches}
                allListings={listings}
                optionLabel={optionLabel}
                t={t}
              />
            )}

            {status === "loading" && <p className="search-state">{t("common.loading")}</p>}
            {status === "error" && <p className="search-state search-state-error">{errorMessage}</p>}
            {status === "ready" && displayedListings.length === 0 && (
              <p className="search-state">{t("searchListing.empty")}</p>
            )}

            <div className="search-listing-list">
              {displayedListings.map((listing) => (
                <SearchListingCard
                  key={listing.id || `${listing.materialName}-${listing.price}`}
                  listing={listing}
                  allListings={listings}
                  factoryNeeds={factoryNeeds}
                  language={language}
                  optionLabel={optionLabel}
                  t={t}
                />
              ))}
            </div>
          </section>
        </div>

      </section>
    </main>
  );
}
