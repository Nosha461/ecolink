import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardDropdown from "../components/DashboardDropdown";
import { SupplierProfile, SupplierSidebar } from "../components/SupplierDashboardLayout";
import { useI18n } from "../i18n/i18nContext";
import { getApiErrorMessage } from "../utils/apiClient";
import { getCategoryLabel, listingMatchesCategory, normalizeComparable } from "../utils/categoryMatching";
import { getCategories } from "../utils/categoryApi";
import { getCartDealMeta } from "../utils/cartDealMeta";
import { calculateCommissionBreakdown } from "../utils/commission";

import { getListings, getMyListings } from "../utils/listingApi";
import { getMyOrders } from "../utils/paymentApi";
import {
  calculateEcoScore,
classifyPotentialValue,
  classifyRecyclability,
  estimateEnvironmentalImpact,
  getPriceEstimation,
  getRecommendedMatches,
} from "../utils/smartEcoAi";
import { getSupplierUser } from "../utils/supplierUser";
import "./Dashboard.css";
import { getMyPurchaseRequests, getSupplierPurchaseRequests } from "../utils/requestApi";

const MATERIALS_PER_SLIDE = 3;
const DASHBOARD_ICON_PATH = "/assets/dashboard/";
const ASSET_ICON_PATH = "/assets/";

const materialImageByType = {
  Plastic: "/assets/dashboard/materials-plastic.png",
  Glass: "/assets/dashboard/materials-glass.png",
  Metal: "/assets/dashboard/materials-metal.png",
  Paper: "/assets/dashboard/activity-cardboard.png",
  Electronics: "/assets/dashboard/activity-electronics.png",
  Other: "/assets/dashboard/activity-bottles.png",
};

function chunkItems(items, size) {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function StatusBadge({ status, children }) {
  const statusClass = String(status || "pending").trim().toLowerCase().replace(/[\s_]+/g, "-");
  return (
    <span className={`dashboard-status dashboard-status-${statusClass}`}>
      <span />
      {children}
    </span>
  );
}

function getListingImage(listing) {
  const image = listing.existingImages?.[0] || listing.images?.[0];

  if (typeof image === "string" && /^(https?:|data:|blob:|\/)/i.test(image)) {
    return image;
  }

  return materialImageByType[listing.materialType] || materialImageByType.Other;
}



function translateKnownOption(value, optionLabel) {
  if (!value) {
    return "";
  }

  const translated = optionLabel(value);
  return translated === `options.${value}` ? value : translated;
}

function formatSmartMaterial(value, optionLabel) {
  const normalized = String(value || "Other").trim();
  const optionValue = normalized.charAt(0).toUpperCase() + normalized.slice(1);
  return translateKnownOption(optionValue, optionLabel);
}

function getTranslatedLocation(listing, optionLabel, t) {
  const fallbackLocation =
    typeof listing.location === "string"
      ? listing.location
      : [
          listing.location?.area,
          listing.location?.district,
          listing.location?.city,
          listing.location?.governorate,
          listing.location?.address,
          listing.location?.street,
          listing.location?.name,
        ]
          .filter(Boolean)
          .join(", ");
  const location = [listing.area, listing.city, listing.address]
    .filter(Boolean)
    .map((part) => translateKnownOption(part, optionLabel))
    .join(", ");

  return location || listing.displayLocation || fallbackLocation || t("searchListing.locationNotAvailable");
}

function getStatusLabel(status, t) {
  const normalizedStatus = String(status || "pending").trim().toLowerCase().replace(/\s+/g, "_");
  const translatedStatus = t(`requests.status.${normalizedStatus}`);
  return translatedStatus === `requests.status.${normalizedStatus}` ? normalizedStatus : translatedStatus;
}

function formatActivityDate(value, t) {
  if (!value) {
    return t("manageListing.dateUnavailable");
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return t("manageListing.dateUnavailable");
  }

  return t("manageListing.listedOn", {
    date: date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
  });
}

function formatDashboardAmount(value) {
  const number = Number(value);
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(Number.isFinite(number) ? number : 0);
}

function normalizeBuyerActivity(request) {
  return {
    id: request.id,
    materialName: request.wasteTitle || request.materialName || "Untitled listing",
    quantity: request.quantity || 0,
    unit: request.unit || "Units",
    price: request.totalAmount || request.unitPrice || 0,
    materialType: request.materialType || "Other",
    existingImages: request.image ? [request.image] : [],
    status: request.status || "pending",
    paymentStatus: request.paymentStatus || "pending",
    createdAt: request.createdAt || "",
  };
}

function normalizeStatusValue(value) {
  return String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function isPaidCompletedOrder(payload) {
  const order = payload?.order || payload || {};
  const payment = payload?.payment || order.payment || {};
  const deal = payload?.deal || order.deal || {};
  const orderStatus = normalizeStatusValue(order.status || payload?.status);
  const paymentStatus = normalizeStatusValue(
    payment.status || order.paymentStatus || payload?.paymentStatus
  );
  const dealStatus = normalizeStatusValue(deal.status || payload?.dealStatus);
  const rejectedStatuses = new Set(["cancelled", "canceled", "declined", "failed", "unpaid"]);

  if (rejectedStatuses.has(orderStatus) || rejectedStatuses.has(paymentStatus) || rejectedStatuses.has(dealStatus)) {
    return false;
  }

  return (
    orderStatus === "completed" ||
    orderStatus === "paid" ||
    paymentStatus === "paid" ||
    dealStatus === "completed"
  );
}

function getOrderOriginalAmount(payload) {
  const order = payload?.order || payload || {};
  const payment = payload?.payment || order.payment || {};
  const quantity = Number(order.quantity || payload?.quantity || 0);
  const unitPrice = Number(order.unitPrice || payload?.unitPrice || order.waste?.price || 0);
  const amount = Number(
    order.totalAmount ??
      order.amount ??
      payload?.totalAmount ??
      payload?.amount ??
      payment.amount ??
      0
  );

  return Number.isFinite(amount) && amount > 0 ? amount : quantity * unitPrice;
}

function getSupplierOrderEarnings(order) {
  return calculateCommissionBreakdown(getOrderOriginalAmount(order)).supplierAmount;
}

function isCompletedSupplierListing(listing = {}) {
  const status = normalizeStatusValue(listing.status || listing.paymentStatus || listing.dealStatus);
  return ["completed", "paid", "sold", "out_of_stock"].includes(status);
}

function isAcceptedSupplierRequest(request = {}) {
  const status = normalizeStatusValue(request.status || request.rawStatus || request.paymentStatus || request.dealStatus);
  return ["accepted", "confirmed", "approved", "completed", "paid"].includes(status);
}

function getSupplierRequestOriginalAmount(request = {}) {
  const amount = Number(request.totalAmount || 0);
  const unitPrice = Number(request.unitPrice || 0);
  const quantity = Number(request.quantity || 0);

  if (Number.isFinite(amount) && amount > 0) {
    return amount;
  }

  return Number.isFinite(unitPrice) && Number.isFinite(quantity) ? unitPrice * quantity : 0;
}

function getListingAcceptedRequestAmount(listing = {}, supplierRequests = []) {
  const listingId = String(listing.id || listing._id || "");

  if (!listingId) {
    return 0;
  }

  return supplierRequests
    .filter((request) => String(request.wasteId || "") === listingId)
    .filter(isAcceptedSupplierRequest)
    .reduce((sum, request) => sum + getSupplierRequestOriginalAmount(request), 0);
}

function getSupplierListingOriginalAmount(listing = {}, supplierRequests = []) {
  const paidMeta = getCartDealMeta(listing.id || listing._id);
  const paidOriginalAmount = Number(paidMeta?.originalAmount || 0);
  const acceptedRequestAmount = getListingAcceptedRequestAmount(listing, supplierRequests);
  const price = Number(listing.price || 0);
  const quantity = Number(listing.quantity || 0);

  if (paidMeta?.paymentStatus === "paid" && Number.isFinite(paidOriginalAmount) && paidOriginalAmount > 0) {
    return paidOriginalAmount;
  }

  if (isCompletedSupplierListing(listing) && acceptedRequestAmount > 0) {
    return acceptedRequestAmount;
  }

  if (Number.isFinite(price) && Number.isFinite(quantity) && quantity > 0) {
    return price * quantity;
  }

  return Number.isFinite(price) ? price : 0;
}

function getSupplierListingEarnings(listing = {}, supplierRequests = []) {
  const paidMeta = getCartDealMeta(listing.id || listing._id);
  const savedSupplierAmount = Number(paidMeta?.supplierAmount || 0);

  if (paidMeta?.paymentStatus === "paid" && Number.isFinite(savedSupplierAmount) && savedSupplierAmount > 0) {
    return savedSupplierAmount;
  }

  return calculateCommissionBreakdown(getSupplierListingOriginalAmount(listing, supplierRequests)).supplierAmount;
}

function DashboardSmartBadges({ material, materials, t }) {
  const ecoScore = calculateEcoScore(material, materials);
const value = classifyPotentialValue(material);
  const priceEstimation = getPriceEstimation(material, materials);
  const recyclability = classifyRecyclability(material);
  const impact = estimateEnvironmentalImpact(material);

 return (
  <div className="dashboard-smart-badges" aria-label={t("smartEcoAi.panelLabel")}>
    <span className="dashboard-smart-pill dashboard-smart-pill-score">
      {t("smartEcoAi.ecoScore", { score: ecoScore })}
    </span>

    <span className={`dashboard-smart-pill dashboard-smart-pill-price-${priceEstimation.level}`}>
      {t(priceEstimation.labelKey)}
    </span>

    <span className={`dashboard-smart-pill dashboard-smart-pill-recyclability-${recyclability.level}`}>
      {t(recyclability.labelKey)}
    </span>

    <span className={`dashboard-smart-pill dashboard-smart-pill-value-${value.level}`}>
      {t(value.labelKey)}
    </span>

    <small className={`dashboard-smart-pill dashboard-smart-pill-impact-${impact.contributionLevel}`}>
      {t("smartEcoAi.co2Short", { co2: impact.co2SavingKg })}
    </small>
  </div>
);
}
export default function Dashboard() {
  const navigate = useNavigate();
  const [dashboardUser, setDashboardUser] = useState(() => getSupplierUser());
  const { t, optionLabel } = useI18n();
  const [materials, setMaterials] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [supplierListings, setSupplierListings] = useState([]);
  const [supplierRequests, setSupplierRequests] = useState([]);
  const [supplierPaidOrders, setSupplierPaidOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [status, setStatus] = useState("loading");
  const [categoryStatus, setCategoryStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [categoryErrorMessage, setCategoryErrorMessage] = useState("");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [openDropdown, setOpenDropdown] = useState("");
  const [dashboardSearch, setDashboardSearch] = useState("");
  const [filters, setFilters] = useState({
    category: "",
    location: "",
  });

  useEffect(() => {
    const refreshProfile = () => setDashboardUser(getSupplierUser());

    window.addEventListener("ecolink:user-updated", refreshProfile);
    window.addEventListener("storage", refreshProfile);

    return () => {
      window.removeEventListener("ecolink:user-updated", refreshProfile);
      window.removeEventListener("storage", refreshProfile);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      try {
        setStatus("loading");
        setCategoryStatus("loading");
        setErrorMessage("");
        setCategoryErrorMessage("");
        const [allListings, ownListings, myRequests, supplierRequestData, myOrders, realCategories] = await Promise.all([
  getListings(),
  getMyListings(),
  getMyPurchaseRequests().catch(() => []),
  dashboardUser.role === "Supplier" ? getSupplierPurchaseRequests().catch(() => []) : Promise.resolve([]),
  dashboardUser.role === "Supplier" ? getMyOrders().catch(() => []) : Promise.resolve([]),
  getCategories(),
]);

        if (isMounted) {
          setMaterials(allListings);
          setSupplierListings(ownListings);
          setSupplierRequests(supplierRequestData);
          setRecentActivity(
 dashboardUser.role === "Buyer"
  ? myRequests.map(normalizeBuyerActivity).slice(0, 6)
  : ownListings.slice(0, 6)
);
          setSupplierPaidOrders(myOrders.filter(isPaidCompletedOrder));
          setCategories(realCategories);
          setStatus("ready");
          setCategoryStatus("ready");
        }
      } catch (error) {
        if (isMounted) {
          setMaterials([]);
          setRecentActivity([]);
          setSupplierListings([]);
          setSupplierRequests([]);
          setSupplierPaidOrders([]);
          setErrorMessage(getApiErrorMessage(error, t("listing.loadMyListingsError"), t));
          setStatus("error");
          setCategories([]);
          setCategoryErrorMessage(getApiErrorMessage(error, t("dashboard.categoriesLoadError"), t));
          setCategoryStatus("error");
        }
      }
    }
        loadDashboardData();

    window.addEventListener("ecolink:dashboard-refresh", loadDashboardData);

    return () => {
      isMounted = false;
      window.removeEventListener("ecolink:dashboard-refresh", loadDashboardData);
    };
  }, [t, dashboardUser.role]);

  const visibleMaterials = useMemo(
    () =>
      materials.filter((material) => {
        const normalizedSearch = normalizeComparable(dashboardSearch);
        const matchesSearch =
          !normalizedSearch ||
          [
            material.materialName,
            material.description,
            material.materialType,
            material.area,
            material.city,
            material.address,
            material.displayLocation,
            material.price,
            material.quantity,
          ]
            .filter(Boolean)
            .some((value) => normalizeComparable(value).includes(normalizedSearch));
        const matchesCategory = listingMatchesCategory(material, filters.category, categories);
        const matchesLocation =
          !filters.location ||
          [material.area, material.city, material.address, material.displayLocation]
            .filter(Boolean)
            .some((value) => normalizeComparable(value).includes(normalizeComparable(filters.location)));
        return matchesSearch && matchesCategory && matchesLocation;
      }),
    [categories, dashboardSearch, filters, materials]
  );

  const factoryNeeds = useMemo(() => {
    const selectedCategory = categories.find((category) => String(category.id) === String(filters.category));

    return {
      materialTypes: selectedCategory ? [selectedCategory.name] : [],
      searchTerm: dashboardSearch,
      location: filters.location,
      needsText: dashboardUser.role === "Buyer" ? "factory production recyclable material needs" : "",
    };
  }, [categories, dashboardSearch, dashboardUser.role, filters.category, filters.location]);

  const recommendedMatches = useMemo(
    () => getRecommendedMatches(visibleMaterials, factoryNeeds, 3),
    [factoryNeeds, visibleMaterials]
  );

  const visibleMaterialSlides = chunkItems(visibleMaterials, MATERIALS_PER_SLIDE);
  const locationOptions = useMemo(() => {
    const locations = new Set();

    materials.forEach((material) => {
      [material.area, material.city].filter(Boolean).forEach((location) => locations.add(location));
    });

    return Array.from(locations);
  }, [materials]);
  const completedActivity = recentActivity.filter(
    (item) => item.status === "completed" || item.paymentStatus === "paid"
  );
  const totalQuantity = completedActivity.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const isBuyerDashboard = dashboardUser.role === "Buyer";
  const totalValue = isBuyerDashboard
    ? completedActivity.reduce((sum, item) => sum + Number(item.price || 0), 0)
    : supplierPaidOrders.length > 0
      ? supplierPaidOrders.reduce((sum, order) => sum + getSupplierOrderEarnings(order), 0)
      : supplierListings
          .filter(isCompletedSupplierListing)
          .reduce((sum, listing) => sum + getSupplierListingEarnings(listing, supplierRequests), 0);
  const statCards = [
    {
      icon: `${ASSET_ICON_PATH}recycling.png`,
      iconClass: "dashboard-stat-img-recycle",
      value: isBuyerDashboard ? String(recentActivity.length) : totalQuantity ? String(totalQuantity) : String(recentActivity.length),
      labelKey: isBuyerDashboard ? "dashboard.recycledUnits" : "dashboard.recycledUnits",
    },
    {
      icon: `${DASHBOARD_ICON_PATH}stat-income.png`,
      iconClass: "dashboard-stat-img-income",
      value: totalValue ? `${formatDashboardAmount(totalValue)} EGP` : "0 EGP",
      labelKey: "dashboard.totalEarnings",
    },
    {
      icon: `${ASSET_ICON_PATH}planet-earth.png`,
      iconClass: "dashboard-stat-img-photosynthesis",
      value: `${recentActivity.length}%`,
      labelKey: "dashboard.co2Reduction",
    },
  ];

  const goToSlide = (slideIndex) => {
    if (visibleMaterialSlides.length === 0) {
      setCurrentSlide(0);
      return;
    }

    setCurrentSlide((slideIndex + visibleMaterialSlides.length) % visibleMaterialSlides.length);
  };

  const selectFilter = (filterName, option) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [filterName]: option,
    }));
    setCurrentSlide(0);
    setOpenDropdown("");
  };

  const submitDashboardSearch = (event) => {
    event.preventDefault();
    const query = dashboardSearch.trim();
    navigate(query ? `/search-listing?q=${encodeURIComponent(query)}` : "/search-listing");
  };

  return (
    <main className="dashboard-shell">
      <SupplierSidebar />

      <section className="dashboard-content">
        <header className="dashboard-topbar">
          <div>
            <h1>{t("dashboard.welcome", { name: dashboardUser.firstName })}</h1>
            <p>{t("dashboard.subtitle")}</p>
          </div>

          <SupplierProfile user={dashboardUser} />
        </header>

        <section className="dashboard-stats" aria-label={t("dashboard.supplierStats")}>
          {statCards.map((stat) => (
            <article className="dashboard-stat-card" key={stat.labelKey}>
              <span className="dashboard-stat-icon">
                <img className={stat.iconClass} src={stat.icon} alt="" aria-hidden="true" />
              </span>
              <div>
                <strong>{stat.value}</strong>
                <span>{t(stat.labelKey)}</span>
              </div>
            </article>
          ))}
        </section>

        <section className="dashboard-featured">
          <h2>{t("dashboard.featured")}</h2>

          <div className="dashboard-filters">
            <form className="dashboard-search" aria-label={t("common.search")} onSubmit={submitDashboardSearch}>
              <img src={`${DASHBOARD_ICON_PATH}clipboard.png`} alt="" aria-hidden="true" />
              <input
                type="search"
                value={dashboardSearch}
                onChange={(event) => setDashboardSearch(event.target.value)}
                placeholder={t("common.search")}
              />
            </form>

            <DashboardDropdown
              id="category"
              label={t("dashboard.category")}
              options={categories.map((category) => ({
                value: category.id,
                label: getCategoryLabel(category, optionLabel),
              }))}
              value={filters.category}
              isOpen={openDropdown === "category"}
              onToggle={() =>
                setOpenDropdown((current) => (current === "category" ? "" : "category"))
              }
              onSelect={(option) => selectFilter("category", option)}
              onClose={() => setOpenDropdown("")}
            />

            <DashboardDropdown
              id="location"
              label={t("dashboard.location")}
              options={locationOptions.map((value) => ({
                value,
                label: translateKnownOption(value, optionLabel),
              }))}
              value={filters.location}
              isOpen={openDropdown === "location"}
              onToggle={() =>
                setOpenDropdown((current) => (current === "location" ? "" : "location"))
              }
              onSelect={(option) => selectFilter("location", option)}
              onClose={() => setOpenDropdown("")}
            />
          </div>

          {recommendedMatches.length > 0 && (
            <div className="dashboard-smart-recommendations" aria-label={t("smartEcoAi.recommendedTitle")}>
              <div>
                <h3>{t("smartEcoAi.recommendedTitle")}</h3>
                <p>{t("smartEcoAi.recommendedSubtitle")}</p>
              </div>
              <div className="dashboard-smart-recommendation-list">
                {recommendedMatches.map(({ listing, match }) => (
                  <Link
                    to={`/listing-details/${listing.id}`}
                    className="dashboard-smart-recommendation"
                    key={`dashboard-smart-${listing.id || listing.materialName}`}
                  >
                    <strong>{t("smartEcoAi.ecoScore", { score: calculateEcoScore(listing, materials) })}</strong>
                    <span>{listing.materialName || t("listing.untitled")}</span>
                    <small>{formatSmartMaterial(match.materialKey, optionLabel)}</small>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="dashboard-carousel">
            <button
              type="button"
              className="dashboard-carousel-control dashboard-carousel-control-prev"
              onClick={() => goToSlide(currentSlide - 1)}
              aria-label={t("dashboard.previousMaterials")}
            >
              <span aria-hidden="true">‹</span>
            </button>

            <div className="dashboard-carousel-window">
              <div
                className="dashboard-material-grid"
                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
              >
                {visibleMaterialSlides.map((slide, slideIndex) => (
                  <div className="dashboard-carousel-slide" key={`materials-slide-${slideIndex}`}>
                    {slide.map((material) => (
                      <article className="dashboard-material-card" key={material.id || material.materialName}>
                        <div className="dashboard-material-image">
                          <img src={getListingImage(material)} alt={material.materialName} />
                          <div className="dashboard-material-tags">
                            <span>{optionLabel(material.materialType)}</span>
                            <span>{material.quantity} {optionLabel(material.unit)}</span>
                          </div>
                        </div>

                        <h3>{material.materialName || t("listing.untitled")}</h3>
                        <p>
                          <img src={`${ASSET_ICON_PATH}placeholder.png`} alt="" aria-hidden="true" />
                          {getTranslatedLocation(material, optionLabel, t)}
                        </p>
                        <p>
                          <img src={`${ASSET_ICON_PATH}best-price.png`} alt="" aria-hidden="true" />
                          {material.price} {t("common.egp")}
                        </p>
                        <DashboardSmartBadges
                          material={material}
                          materials={materials}
                          factoryNeeds={factoryNeeds}
                          t={t}
                        />

                        <Link to={`/listing-details/${material.id}`} className="dashboard-view-link">
                          {t("dashboard.viewDetails")}
                        </Link>
                      </article>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="dashboard-carousel-control dashboard-carousel-control-next"
              onClick={() => goToSlide(currentSlide + 1)}
              aria-label={t("dashboard.nextMaterials")}
            >
              <span aria-hidden="true">›</span>
            </button>
          </div>

          <div className="dashboard-carousel-dots" aria-label={t("dashboard.materialSlides")}>
            {visibleMaterialSlides.map((_, index) => (
              <button
                key={`materials-dot-${index}`}
                type="button"
                className={index === currentSlide ? "active" : ""}
                onClick={() => goToSlide(index)}
                aria-label={t("dashboard.showSlide", { number: index + 1 })}
                aria-current={index === currentSlide ? "true" : undefined}
              />
            ))}
          </div>
          {status === "loading" && <p className="listing-info">{t("common.loading")}</p>}
          {status === "error" && <p className="listing-error">{errorMessage}</p>}
          {categoryStatus === "loading" && <p className="listing-info">{t("dashboard.loadingCategories")}</p>}
          {categoryStatus === "error" && <p className="listing-error">{categoryErrorMessage}</p>}
          {categoryStatus === "ready" && categories.length === 0 && (
            <p className="listing-info">{t("errors.categoriesRequired")}</p>
          )}
          {status === "ready" && visibleMaterials.length === 0 && (
            <p className="listing-info">{t("dashboard.emptyMaterials")}</p>
          )}
        </section>

        <section className="dashboard-activity">
          <h2>{t("dashboard.recentActivity")}</h2>

          <div className="dashboard-activity-grid">
            {recentActivity.map((item, index) => (
              <article className="dashboard-activity-item" key={`${item.id || item.materialName}-${index}`}>
                <img src={getListingImage(item)} alt={item.materialName || t("listing.untitled")} />
                <div className="dashboard-activity-copy">
                  <h3>{item.materialName || t("listing.untitled")}</h3>
                  <p>
                    <img src={`${ASSET_ICON_PATH}procurement.png`} alt="" aria-hidden="true" />
                    {item.quantity} {optionLabel(item.unit)}
                  </p>
                  <p>
                    <img src={`${ASSET_ICON_PATH}quality-assurance.png`} alt="" aria-hidden="true" />
                    {item.createdAt ? formatActivityDate(item.createdAt, t) : optionLabel(item.materialType)}
                  </p>
                </div>
                <StatusBadge status={item.status || "pending"}>
                  {getStatusLabel(item.status, t)}
                </StatusBadge>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
