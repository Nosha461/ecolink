import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { SupplierProfile, SupplierSidebar } from "../components/SupplierDashboardLayout";
import { useI18n } from "../i18n/i18nContext";
import { getApiErrorMessage } from "../utils/apiClient";
import { deleteListing, getListing } from "../utils/listingApi";
import { sendPurchaseRequest } from "../utils/requestApi";
import { getSupplierUser } from "../utils/supplierUser";
import "./Dashboard.css";
import "./ListingDetails.css";
import "./PageWrappers.css";

const FALLBACK_LISTING_IMAGES = [
  "/assets/image3.png",
  "/assets/imag2.png",
  "/assets/imag1.png",
];

function translateKnownOption(value, optionLabel) {
  if (!value) {
    return "";
  }

  const translated = optionLabel(value);
  return translated === `options.${value}` ? value : translated;
}

export default function ListingDetailsRoute() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dashboardUser = getSupplierUser();
  const isSupplier = dashboardUser.role === "Supplier";
  const isBuyer = dashboardUser.role === "Buyer";
  const { t, optionLabel } = useI18n();
  const [listing, setListing] = useState(null);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [buyerMessage, setBuyerMessage] = useState({ type: "", text: "" });
  const [buyerForm, setBuyerForm] = useState({ quantity: 1, shippingAddress: "" });
  const [buyerAction, setBuyerAction] = useState("");
  const [selectedImage, setSelectedImage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadListing() {
      if (!id) {
        setStatus("error");
        setErrorMessage(t("listingDetails.missingId"));
        return;
      }

      try {
        setStatus("loading");
        setErrorMessage("");
        const data = await getListing(id);

        if (isMounted) {
          setListing(data);
          setBuyerForm({
            quantity: data?.quantity ? Math.max(1, Number(data.quantity) || 1) : 1,
            shippingAddress: data?.address || data?.displayLocation || "",
          });
          setStatus(data ? "ready" : "empty");
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(getApiErrorMessage(error, t("listingDetails.loadError"), t));
          setStatus("error");
        }
      }
    }

    loadListing();

    return () => {
      isMounted = false;
    };
  }, [id, t]);

  const gallery = useMemo(() => {
    const images = listing?.existingImages || [];
    return images.filter((image) => typeof image === "string" && image.trim());
  }, [listing]);

  const visibleGallery = gallery.length > 0 ? gallery : FALLBACK_LISTING_IMAGES;
  const mainImage = visibleGallery[0] || "";
  const previewImages = visibleGallery.slice(0, 4);
  const extraImageCount = Math.max(0, visibleGallery.length - previewImages.length);
  const translatedLocation = listing
    ? [listing.area, listing.city, listing.address]
        .filter(Boolean)
        .map((part) => translateKnownOption(part, optionLabel))
        .join(", ") ||
      listing.displayLocation ||
      t("searchListing.locationNotAvailable")
    : "";
  const canManageListing =
    isSupplier &&
    listing &&
    ((listing.ownerUserId && dashboardUser.id && String(listing.ownerUserId) === String(dashboardUser.id)) ||
      (listing.ownerFactoryId &&
        dashboardUser.factoryId &&
        String(listing.ownerFactoryId) === String(dashboardUser.factoryId)));

  const handleDeleteListing = async () => {
    if (!listing?.id || !canManageListing) {
      return;
    }

    const confirmed = window.confirm(t("listingDetails.confirmDelete"));

    if (!confirmed) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteListing(listing.id);
      window.dispatchEvent(new CustomEvent("ecolink:listings-refresh"));
      navigate("/listings");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, t("listingDetails.deleteError"), t));
    } finally {
      setIsDeleting(false);
    }
  };

  const updateBuyerForm = (field, value) => {
    setBuyerForm((current) => ({
      ...current,
      [field]: value,
    }));
    setBuyerMessage({ type: "", text: "" });
  };

 

  const handleSendRequest = async () => {
    if (!listing?.id) {
      return;
    }

    const quantity = Number(buyerForm.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setBuyerMessage({ type: "error", text: t("listingDetails.quantityValidation") });
      return;
    }

    if (!buyerForm.shippingAddress.trim()) {
      setBuyerMessage({ type: "error", text: t("errors.shippingAddressRequired") });
      return;
    }

    try {
      setBuyerAction("request");
      await sendPurchaseRequest({
        wasteId: listing.id,
        quantity,
      });
      setBuyerMessage({ type: "success", text: t("listingDetails.requestSent") });
      window.dispatchEvent(new CustomEvent("ecolink:requests-refresh"));
      window.dispatchEvent(new CustomEvent("ecolink:notifications-refresh"));
      window.setTimeout(() => navigate("/requests"), 700);
    } catch (error) {
      setBuyerMessage({
        type: "error",
        text: getApiErrorMessage(error, t("listingDetails.requestError"), t),
      });
    } finally {
      setBuyerAction("");
    }
  };

  return (
    <main className="dashboard-shell dashboard-route-shell">
      <SupplierSidebar />

      <section className="dashboard-content dashboard-route-content">
        <header className="dashboard-topbar dashboard-route-topbar">
          <div>
            <Link to={isBuyer ? "/search-listing" : "/listings"} className="listing-details-back-link">
              <i className="bi bi-chevron-left" aria-hidden="true" />
              {t("common.backToListings")}
            </Link>
            <h1>{t("listingDetails.title")}</h1>
            <p>{t("listingDetails.subtitle")}</p>
          </div>

          <SupplierProfile user={dashboardUser} />
        </header>

        {status === "loading" && <p className="listing-info">{t("common.loading")}</p>}

        {status === "error" && (
          <p className="listing-error" aria-live="polite">{errorMessage}</p>
        )}

        {status === "empty" && (
          <section className="listing-details-api-missing" aria-live="polite">
            <i className="bi bi-info-circle" aria-hidden="true" />
            <div>
              <h2>{t("listingDetails.emptyTitle")}</h2>
              <p>{t("listingDetails.emptyBody")}</p>
            </div>
          </section>
        )}

        {status === "ready" && errorMessage && (
          <p className="listing-error" aria-live="polite">{errorMessage}</p>
        )}

        {status === "ready" && listing && (
          <div className="listing-details-container">
            <div className={`listing-visuals ${visibleGallery.length === 1 ? "listing-visuals-single" : ""}`}>
              {mainImage && (
                <button
                  className="main-image-container"
                  type="button"
                  onClick={() => setSelectedImage(mainImage)}
                  aria-label={t("listingDetails.galleryImage", { number: 1 })}
                >
                  <img src={mainImage} alt={listing.materialName} className="main-image" />
                </button>
              )}

              {visibleGallery.length > 1 && (
                <div className="image-gallery">
                  {previewImages.map((image, index) => (
                    <button
                      key={`${image}-${index}`}
                      className="gallery-thumb"
                      type="button"
                      onClick={() => setSelectedImage(image)}
                    >
                      <img src={image} alt={t("listingDetails.galleryImage", { number: index + 1 })} />
                    </button>
                  ))}
                  {extraImageCount > 0 && (
                    <button
                      className="gallery-thumb more-thumb"
                      type="button"
                      onClick={() => setSelectedImage(visibleGallery[4])}
                    >
                      <img src={visibleGallery[4]} alt={t("listingDetails.galleryImage", { number: 5 })} />
                      <span className="more-overlay" aria-hidden="true">
                        <span>+{extraImageCount}</span>
                        <span>{t("common.more") === "common.more" ? "More" : t("common.more")}</span>
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="listing-info">
              <div className="title-row">
                <h2>{listing.materialName || t("listing.untitled")}</h2>
                {listing.requestVerification && (
                  <span className="verified-badge">
                    <span className="dot" />
                    {t("listingDetails.verified")}
                  </span>
                )}
              </div>

              <p className="description">{listing.description}</p>

              <div className="logistics-banner">
                <img src="/assets/procurement.png" alt="" aria-hidden="true" />
                <span>{t("listingDetails.logistics")}</span>
              </div>

              <div className="details-grid">
                <div className="detail-item">
                  <div className="detail-icon"><img src="/assets/placeholder.png" alt="" aria-hidden="true" /></div>
                  <div className="detail-text">
                    <span>{translatedLocation || "-"}</span>
                  </div>
                </div>
                <div className="detail-item">
                  <div className="detail-icon"><img src="/assets/best-price.png" alt="" aria-hidden="true" /></div>
                  <div className="detail-text">
                    <span>{listing.price} {t("common.egp")}</span>
                  </div>
                </div>
                <div className="detail-item">
                  <div className="detail-icon"><img src="/assets/procurement.png" alt="" aria-hidden="true" /></div>
                  <div className="detail-text">
                    <span>{listing.quantity} {optionLabel(listing.unit)}</span>
                  </div>
                </div>
                <div className="detail-item">
                  <div className="detail-icon"><img src="/assets/recycling.png" alt="" aria-hidden="true" /></div>
                  <div className="detail-text">
                    <span>{optionLabel(listing.condition)}</span>
                  </div>
                </div>
              </div>

              <div className="listing-actions">
                {canManageListing ? (
                  <>
                    <Link className="btn-primary edit-btn" to={`/edit-listing/${listing.id}`}>
                      {t("listingDetails.editDetails")}
                    </Link>
                    <button
                      className="btn-danger delete-btn"
                      type="button"
                      onClick={handleDeleteListing}
                      disabled={isDeleting}
                    >
                      {isDeleting ? t("listingDetails.deleting") : t("listingDetails.delete")}
                    </button>
                  </>
                ) : isBuyer ? (
                  <div className="listing-buyer-panel">
                    {buyerMessage.text && (
                      <p className={`listing-buyer-message listing-buyer-message-${buyerMessage.type}`}>
                        {buyerMessage.text}
                      </p>
                    )}

                    <div className="listing-buyer-fields">
                      <label>
                        <span>{t("listing.quantity")}</span>
                        <input
                          type="number"
                          min="1"
                          value={buyerForm.quantity}
                          onChange={(event) => updateBuyerForm("quantity", event.target.value)}
                        />
                      </label>
                      <label>
                        <span>{t("payment.shippingAddress")}</span>
                        <input
                          type="text"
                          value={buyerForm.shippingAddress}
                          onChange={(event) => updateBuyerForm("shippingAddress", event.target.value)}
                          placeholder={t("payment.shippingAddressPlaceholder")}
                        />
                      </label>
                    </div>

                    <div className="listing-actions listing-buyer-actions">
                      <button
                        className="btn-primary buy-btn"
                        type="button"
                        disabled={Boolean(buyerAction)}
                        onClick={handleSendRequest}
                      >
                        {buyerAction === "request" ? t("listingDetails.sendingRequest") : t("listingDetails.sendRequest")}
                      </button>
                      <p className="listing-details-flow-note">
                        {t("listingDetails.makeOfferUnavailable")}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="listing-details-view-only">{t("listingDetails.viewOnly")}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {selectedImage && (
          <div className="listing-image-modal" role="dialog" aria-modal="true" onClick={() => setSelectedImage("")}>
            <button
              className="listing-image-modal-close"
              type="button"
              onClick={() => setSelectedImage("")}
              aria-label={t("common.close") === "common.close" ? "Close" : t("common.close")}
            >
              <i className="bi bi-x-lg" aria-hidden="true" />
            </button>
            <img
              src={selectedImage}
              alt={listing?.materialName || t("listingDetails.title")}
              onClick={(event) => event.stopPropagation()}
            />
          </div>
        )}
      </section>
    </main>
  );
}
