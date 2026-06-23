import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BiSearch } from "react-icons/bi";
import DashboardDropdown from "../components/DashboardDropdown";
import { SupplierProfile, SupplierSidebar } from "../components/SupplierDashboardLayout";
import { useI18n } from "../i18n/i18nContext";
import { getApiErrorMessage } from "../utils/apiClient";
import { getCategoryLabel, listingMatchesCategory } from "../utils/categoryMatching";
import { getCategories } from "../utils/categoryApi";
import { deleteListing, getMyListings } from "../utils/listingApi";
import { getSupplierUser } from "../utils/supplierUser";
import "./Dashboard.css";
import "./ManageListing.css";

const FALLBACK_IMAGE = "/assets/recycle.png";
const LISTING_DETAIL_ICONS = {
  location: "/assets/placeholder.png",
  price: "/assets/best-price.png",
  condition: "/assets/recycling.png",
  date: "/assets/procurement.png",
};

function canManageListing(listing, user) {
  if (!listing || user.role !== "Supplier") {
    return false;
  }

  return Boolean(
    (listing.ownerUserId && user.id && String(listing.ownerUserId) === String(user.id)) ||
      (listing.ownerFactoryId &&
        user.factoryId &&
        String(listing.ownerFactoryId) === String(user.factoryId)) ||
      (listing.ownerId &&
        ((user.id && String(listing.ownerId) === String(user.id)) ||
          (user.factoryId && String(listing.ownerId) === String(user.factoryId))))
  );
}

function translateOption(value, optionLabel) {
  if (!value) return "";
  const translated = optionLabel(value);
  return translated === `options.${value}` ? value : translated;
}

function formatListingDate(value, language, t) {
  if (!value) {
    return t("manageListing.dateUnavailable");
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return t("manageListing.dateUnavailable");
  }

  const formattedDate = new Intl.DateTimeFormat(language === "ar" ? "ar-EG" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);

  return t("manageListing.listedOn", { date: formattedDate });
}

function getListingLocation(listing, optionLabel, t) {
  return (
    [listing.area, listing.city, listing.address]
      .filter(Boolean)
      .map((part) => translateOption(part, optionLabel))
      .join("، ") ||
    listing.displayLocation ||
    t("searchListing.locationNotAvailable")
  );
}

export default function ManageListing() {
  const navigate = useNavigate();
  const { language, optionLabel, t } = useI18n();
  const supplierUser = useMemo(() => getSupplierUser(), []);
  const [listings, setListings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [sortOrder, setSortOrder] = useState("latest");
  const [deletingId, setDeletingId] = useState("");
  const [openDropdown, setOpenDropdown] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadPageData() {
      try {
        setStatus("loading");
        setMessage("");
        setMessageType("");
        const [myListings, categoryList] = await Promise.all([getMyListings(), getCategories()]);

        if (isMounted) {
          setListings(myListings.filter((listing) => canManageListing(listing, supplierUser)));
          setCategories(categoryList);
          setStatus("ready");
        }
      } catch (error) {
        if (isMounted) {
          setMessage(getApiErrorMessage(error, t("listing.loadMyListingsError"), t));
          setMessageType("error");
          setStatus("error");
        }
      }
    }

    loadPageData();
    window.addEventListener("ecolink:listings-refresh", loadPageData);

    return () => {
      isMounted = false;
      window.removeEventListener("ecolink:listings-refresh", loadPageData);
    };
  }, [supplierUser, t]);

  const filteredListings = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return listings
      .filter((listing) => {
        const matchesSearch =
          !normalizedSearch ||
          [
            listing.materialName,
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
            .some((value) => String(value).toLowerCase().includes(normalizedSearch));
        const matchesCategory = listingMatchesCategory(listing, categoryId, categories);

        return matchesSearch && matchesCategory;
      })
      .sort((first, second) => {
        const firstDate = new Date(first.createdAt || 0).getTime();
        const secondDate = new Date(second.createdAt || 0).getTime();
        return sortOrder === "oldest" ? firstDate - secondDate : secondDate - firstDate;
      });
  }, [categories, categoryId, listings, searchTerm, sortOrder]);

  const handleDelete = async (listing) => {
    if (!canManageListing(listing, supplierUser)) {
      setMessage(t("listingDetails.viewOnly"));
      setMessageType("error");
      return;
    }

    const confirmed = window.confirm(t("listingDetails.confirmDelete"));
    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(listing.id);
      setMessage("");
      setMessageType("");
      await deleteListing(listing.id);
      setListings((current) => current.filter((item) => item.id !== listing.id));
      setMessage(t("manageListing.deleteSuccess"));
      setMessageType("success");
      window.dispatchEvent(new Event("ecolink:listings-refresh"));
    } catch (error) {
      setMessage(getApiErrorMessage(error, t("listingDetails.deleteError"), t));
      setMessageType("error");
    } finally {
      setDeletingId("");
    }
  };

  return (
    <main className="dashboard-shell manage-listing-shell">
      <SupplierSidebar />

      <section className="manage-listing-content">
        <header className="manage-listing-topbar">
          <div>
            <p className="manage-listing-greeting">
              {t("dashboard.welcome", { name: supplierUser.firstName })}
            </p>
            <h1>{t("manageListing.title")}</h1>
            <p>{t("manageListing.subtitle")}</p>
          </div>

          <SupplierProfile user={supplierUser} />
        </header>

        <div className="manage-listing-title-row">
          <div />
          <Link to="/listings" className="manage-create-button">
            {t("manageListing.createNew")}
          </Link>
        </div>

        <section className="manage-listing-filters" aria-label={t("manageListing.filters")}>
          <label className="manage-search">
            <BiSearch aria-hidden="true" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={t("common.search")}
            />
          </label>

          <DashboardDropdown
            id="manage-category"
            label={t("dashboard.category")}
            options={[
              { value: "", label: t("dashboard.category") },
              ...categories.map((category) => ({
                value: category.id,
                label: getCategoryLabel(category, optionLabel),
              })),
            ]}
            value={categoryId}
            isOpen={openDropdown === "category"}
            onToggle={() => setOpenDropdown((current) => (current === "category" ? "" : "category"))}
            onSelect={(option) => {
              setCategoryId(option);
              setOpenDropdown("");
            }}
            onClose={() => setOpenDropdown("")}
          />

          <DashboardDropdown
            id="manage-sort"
            label={t("searchListing.latestFirst")}
            options={[
              { value: "latest", label: t("searchListing.latestFirst") },
              { value: "oldest", label: t("searchListing.oldestFirst") },
            ]}
            value={sortOrder}
            isOpen={openDropdown === "sort"}
            onToggle={() => setOpenDropdown((current) => (current === "sort" ? "" : "sort"))}
            onSelect={(option) => {
              setSortOrder(option);
              setOpenDropdown("");
            }}
            onClose={() => setOpenDropdown("")}
          />
        </section>

        <div className="manage-status" aria-live="polite">
          {status === "loading" && <p>{t("common.loading")}</p>}
          {message && (
            <p className={messageType === "success" ? "manage-success" : "manage-error"}>
              {message}
            </p>
          )}
          {status === "ready" && filteredListings.length === 0 && <p>{t("manageListing.empty")}</p>}
        </div>

        {status === "ready" && filteredListings.length > 0 && (
          <div className="manage-listing-list">
            {filteredListings.map((listing) => {
              const image = listing.existingImages?.[0] || FALLBACK_IMAGE;
              const translatedCondition = translateOption(listing.condition, optionLabel);

              return (
                <article className="manage-listing-card" key={listing.id}>
                  <img
                    className="manage-listing-image"
                    src={image}
                    alt={listing.materialName || t("listing.untitled")}
                    onError={(event) => {
                      event.currentTarget.src = FALLBACK_IMAGE;
                    }}
                  />

                  <div className="manage-listing-details">
                    <h2>{listing.materialName || t("listing.untitled")}</h2>
                    <p>
                      <img src={LISTING_DETAIL_ICONS.location} alt="" aria-hidden="true" />
                      <span>{getListingLocation(listing, optionLabel, t)}</span>
                    </p>
                    <p>
                      <img src={LISTING_DETAIL_ICONS.price} alt="" aria-hidden="true" />
                      <span>
                        {listing.price || "-"} {listing.currency || "EGP"}
                      </span>
                    </p>
                    <p>
                      <img src={LISTING_DETAIL_ICONS.condition} alt="" aria-hidden="true" />
                      <span>{translatedCondition}</span>
                    </p>
                    <p>
                      <img src={LISTING_DETAIL_ICONS.date} alt="" aria-hidden="true" />
                      <span>{formatListingDate(listing.createdAt, language, t)}</span>
                    </p>
                  </div>

                  <div className="manage-listing-actions">
                    <button
                      type="button"
                      className="manage-action-view"
                      onClick={() => navigate(`/edit-listing/${listing.id}`, { state: { listing } })}
                    >
                      {t("common.edit")}
                    </button>
                    <button
                      type="button"
                      className="manage-action-delete"
                      onClick={() => handleDelete(listing)}
                      disabled={deletingId === listing.id}
                    >
                      {deletingId === listing.id ? t("listingDetails.deleting") : t("listingDetails.delete")}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
