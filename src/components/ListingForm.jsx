import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardDropdown from "./DashboardDropdown";
import { useSocket } from "../context/SocketProvider";
import { useI18n } from "../i18n/i18nContext";
import { getApiErrorMessage } from "../utils/apiClient";
import { getCategoryLabel } from "../utils/categoryMatching";
import {
  createListing,
  getListing,
  normalizeListing,
  updateListing,
} from "../utils/listingApi";
import { createCategory, getCategories } from "../utils/categoryApi";
import { EGYPT_GOVERNORATES, getAreasForGovernorate } from "../utils/egyptLocations";
import { getSupplierUser } from "../utils/supplierUser";

const conditions = ["Mixed", "Sorted", "Clean", "Needs sorting"];
const units = ["Units", "KG", "Tons", "Boxes"];

const initialValues = {
  categoryId: "",
  materialType: "",
  materialName: "",
  condition: "Mixed",
  description: "",
  quantity: "",
  unit: "Units",
  price: "",
  city: "",
  area: "",
  address: "",
  requestVerification: true,
  images: [],
  existingImages: [],
};

function validateForm(values, t, isEditMode = false) {
  const nextErrors = {};

  if (!values.materialName.trim()) {
    nextErrors.materialName = t("listing.materialNameRequired");
  }

  if (!values.categoryId) {
    nextErrors.categoryId = t("errors.categoriesRequired");
  }

  if (!values.quantity || Number(values.quantity) <= 0) {
    nextErrors.quantity = t("listing.quantityError");
  }

  if (!values.price || Number(values.price) <= 0) {
    nextErrors.price = t("listing.priceError");
  }

  if (!values.city) {
    nextErrors.city = t("listing.cityError");
  }

  if (!values.area) {
    nextErrors.area = t("listing.areaError");
  }

  if (!values.description.trim()) {
    nextErrors.description = t("listing.descriptionError");
  }

  if (!isEditMode && values.images.length === 0) {
    nextErrors.images = t("errors.wasteImageRequired");
  }

  return nextErrors;
}

function FieldError({ children }) {
  return (
    <span className={`listing-field-error ${children ? "" : "listing-field-error-empty"}`}>
      {children || "\u00a0"}
    </span>
  );
}

function ListingSection({ number, title, children }) {
  return (
    <section className="listing-form-section">
      <h2>
        <span>{number}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function canEditListing(listing, user) {
  if (!listing || user.role !== "Supplier") {
    return false;
  }

  return Boolean(
    (listing.ownerUserId && user.id && String(listing.ownerUserId) === String(user.id)) ||
      (listing.ownerFactoryId && user.factoryId && String(listing.ownerFactoryId) === String(user.factoryId))
  );
}

export default function ListingForm({ mode = "create", listingId = "", initialListing = null }) {
  const navigate = useNavigate();
  const { t, tChoice, optionLabel } = useI18n();
  const { refreshUnreadNotifications } = useSocket() || {};
  const dashboardUser = useMemo(() => getSupplierUser(), []);
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [openDropdown, setOpenDropdown] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingListing, setIsLoadingListing] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [categories, setCategories] = useState([]);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: "", description: "" });
  const [categoryMessage, setCategoryMessage] = useState({ type: "", text: "" });

  const isEditMode = mode === "edit";
  const availableAreas = useMemo(() => getAreasForGovernorate(values.city), [values.city]);

  useEffect(() => {
    let isMounted = true;

    async function loadCategories() {
      try {
        setIsLoadingCategories(true);
        const data = await getCategories();

        if (isMounted) {
          setCategories(data);
          setValues((currentValues) => {
            if (currentValues.categoryId || data.length === 0) {
              return currentValues;
            }

            return {
              ...currentValues,
              categoryId: data[0].id,
              materialType: data[0].name,
            };
          });
        }
      } catch (error) {
        if (isMounted) {
          setFormError(getApiErrorMessage(error, t("listing.loadError"), t));
        }
      } finally {
        if (isMounted) {
          setIsLoadingCategories(false);
        }
      }
    }

    loadCategories();

    return () => {
      isMounted = false;
    };
  }, [t]);

  useEffect(() => {
    if (!isEditMode) {
      return;
    }

    const normalizedInitialListing = normalizeListing(initialListing);
    if (normalizedInitialListing) {
      if (!canEditListing(normalizedInitialListing, dashboardUser)) {
        setFormError(t("listing.editForbidden"));
        return;
      }
      setValues((currentValues) => ({ ...currentValues, ...normalizedInitialListing }));
    }

    if (!listingId) {
      setFormError(t("listing.chooseEdit"));
      return;
    }

    let isMounted = true;

    async function loadListing() {
      try {
        setIsLoadingListing(true);
        setFormError("");

        const listing = await getListing(listingId);
        if (isMounted && listing) {
          if (!canEditListing(listing, dashboardUser)) {
            setFormError(t("listing.editForbidden"));
            return;
          }
          setValues((currentValues) => ({ ...currentValues, ...listing, images: [] }));
        }
      } catch (error) {
        if (isMounted) {
          setFormError(getApiErrorMessage(error, t("listing.loadError"), t));
        }
      } finally {
        if (isMounted) {
          setIsLoadingListing(false);
        }
      }
    }

    loadListing();

    return () => {
      isMounted = false;
    };
  }, [dashboardUser, initialListing, isEditMode, listingId, t]);

  const updateValue = (name, value) => {
    setValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        [name]: "",
      }));
    }

    if (formError) {
      setFormError("");
    }
  };

  const selectDropdownValue = (name, value) => {
    if (name === "categoryId") {
      const category = categories.find((item) => item.id === value);
      setValues((currentValues) => ({
        ...currentValues,
        categoryId: value,
        materialType: category?.name || currentValues.materialType,
      }));
    } else if (name === "city") {
      const nextAreas = getAreasForGovernorate(value);
      setValues((currentValues) => ({
        ...currentValues,
        city: value,
        area: nextAreas.includes(currentValues.area) ? currentValues.area : "",
      }));
    } else {
      updateValue(name, value);
    }
    setOpenDropdown("");
  };

  const updateNewCategory = (name, value) => {
    setNewCategory((currentCategory) => ({
      ...currentCategory,
      [name]: value,
    }));
    setCategoryMessage({ type: "", text: "" });
  };

  const handleAddCategory = async () => {
    const name = newCategory.name.trim();
    const description = newCategory.description.trim();

    if (!name) {
      setCategoryMessage({ type: "error", text: t("listing.categoryFieldsRequired") });
      return;
    }

    try {
      setIsAddingCategory(true);
      setCategoryMessage({ type: "", text: "" });

      const createdCategory = await createCategory({ name, description });
      const refreshedCategories = await getCategories();
      const nextCategory =
        refreshedCategories.find((category) => String(category.id) === String(createdCategory?.id)) ||
        createdCategory ||
        refreshedCategories.find((category) => category.name.toLowerCase() === name.toLowerCase());

      setCategories(refreshedCategories);

      if (nextCategory?.id) {
        setValues((currentValues) => ({
          ...currentValues,
          categoryId: nextCategory.id,
          materialType: nextCategory.name,
        }));
      }

      setNewCategory({ name: "", description: "" });
      setCategoryFormOpen(false);
      setCategoryMessage({ type: "success", text: t("listing.categoryAdded") });
    } catch (error) {
      const refreshedCategories = await getCategories().catch(() => []);
      const existingCategory = refreshedCategories.find(
        (category) => category.name.toLowerCase() === name.toLowerCase()
      );

      if (existingCategory?.id) {
        setCategories(refreshedCategories);
        setValues((currentValues) => ({
          ...currentValues,
          categoryId: existingCategory.id,
          materialType: existingCategory.name,
        }));
        setNewCategory({ name: "", description: "" });
        setCategoryFormOpen(false);
        setCategoryMessage({ type: "success", text: t("listing.categorySelected") });
        return;
      }

      setCategoryMessage({
        type: "error",
        text: getApiErrorMessage(error, t("listing.categoryAddError"), t),
      });
    } finally {
      setIsAddingCategory(false);
    }
  };

  const handleImageChange = (event) => {
    const selectedFiles = Array.from(event.target.files || []);

    if (selectedFiles.length === 0) {
      return;
    }

    setValues((currentValues) => ({
      ...currentValues,
      images: [...currentValues.images, ...selectedFiles],
    }));
    if (errors.images) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        images: "",
      }));
    }
    event.target.value = "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validateForm(values, t, isEditMode);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setSuccessMessage("");
      setFormError(t("listing.fixFields"));
      return;
    }

    if (isEditMode && !listingId) {
      setFormError(t("listing.chooseEdit"));
      setSuccessMessage("");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrors({});
      setFormError("");
      setSuccessMessage("");

      if (isEditMode) {
        await updateListing(listingId, values);
        await refreshUnreadNotifications?.();
        window.dispatchEvent(new Event("ecolink:notifications-refresh"));
        window.dispatchEvent(new Event("ecolink:listings-refresh"));
        setSuccessMessage(t("listing.updated"));
        window.setTimeout(() => navigate("/manage-listing"), 900);
      } else {
        const createdListing = await createListing(values);
        await refreshUnreadNotifications?.();
        window.dispatchEvent(new Event("ecolink:notifications-refresh"));
        window.dispatchEvent(new Event("ecolink:listings-refresh"));
        setValues(createdListing ? { ...initialValues, materialType: createdListing.materialType } : initialValues);
        setSuccessMessage(t("listing.published"));
      }
    } catch (error) {
      setFormError(
        getApiErrorMessage(
          error,
          isEditMode ? t("listing.updateError") : t("listing.publishError"),
          t
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBusy = isSubmitting || isLoadingListing || isLoadingCategories;

  return (
    <form className="listing-form" onSubmit={handleSubmit} noValidate>
      {isLoadingListing && <p className="listing-info">{t("listing.loadingDetails")}</p>}

      <ListingSection number="1" title={t("listing.materialDetails")}>
        <div className="listing-grid listing-grid-three">
          <div className="listing-field">
            <span>{t("listing.materialType")}</span>
            <DashboardDropdown
              id="listing-material-type"
              label={t("listing.materialType")}
              options={categories.map((category) => ({
                value: category.id,
                label: getCategoryLabel(category, optionLabel),
              }))}
              value={values.categoryId}
              isOpen={openDropdown === "materialType"}
              onToggle={() =>
                setOpenDropdown((current) => (current === "materialType" ? "" : "materialType"))
              }
              onSelect={(option) => selectDropdownValue("categoryId", option)}
              onClose={() => setOpenDropdown("")}
            />
            <FieldError>
              {errors.categoryId ||
                (isLoadingCategories
                  ? t("listing.loadingCategories")
                  : categories.length === 0
                    ? t("errors.categoriesRequired")
                    : "")}
            </FieldError>
            <button
              type="button"
              className="listing-add-category-toggle"
              onClick={() => {
                setCategoryFormOpen((current) => !current);
                setCategoryMessage({ type: "", text: "" });
              }}
            >
              <i className="bi bi-plus-circle" aria-hidden="true" />
              {t("listing.addNewCategory")}
            </button>
          </div>

          <label className="listing-field">
            <span>{t("listing.materialName")}</span>
            <input
              type="text"
              value={values.materialName}
              onChange={(event) => updateValue("materialName", event.target.value)}
              aria-invalid={Boolean(errors.materialName)}
            />
            <FieldError>{errors.materialName}</FieldError>
          </label>

          <div className="listing-field">
            <span>{t("listing.condition")}</span>
            <DashboardDropdown
              id="listing-condition"
              label={t("listing.condition")}
              options={conditions.map((value) => ({ value, label: optionLabel(value) }))}
              value={values.condition}
              isOpen={openDropdown === "condition"}
              onToggle={() =>
                setOpenDropdown((current) => (current === "condition" ? "" : "condition"))
              }
              onSelect={(option) => selectDropdownValue("condition", option)}
              onClose={() => setOpenDropdown("")}
            />
            <FieldError />
          </div>
        </div>

        <label className="listing-field listing-field-full">
          <span>{t("listing.description")}</span>
          <textarea
            value={values.description}
            placeholder={t("listing.descriptionPlaceholder")}
            onChange={(event) => updateValue("description", event.target.value)}
            aria-invalid={Boolean(errors.description)}
          />
          <FieldError>{errors.description}</FieldError>
        </label>

        {categoryFormOpen && (
          <div className="listing-add-category-panel">
            <label className="listing-field">
              <span>{t("listing.categoryName")}</span>
              <input
                type="text"
                value={newCategory.name}
                onChange={(event) => updateNewCategory("name", event.target.value)}
                placeholder={t("listing.categoryNamePlaceholder")}
              />
            </label>

            <label className="listing-field">
              <span>{t("listing.categoryDescription")}</span>
              <input
                type="text"
                value={newCategory.description}
                onChange={(event) => updateNewCategory("description", event.target.value)}
                placeholder={t("listing.categoryDescriptionPlaceholder")}
              />
            </label>

            <button
              type="button"
              className="listing-add-category-button"
              onClick={handleAddCategory}
              disabled={isAddingCategory}
            >
              {isAddingCategory ? t("listing.addingCategory") : t("listing.saveCategory")}
            </button>
          </div>
        )}

        {categoryMessage.text && (
          <p className={`listing-category-message listing-category-message-${categoryMessage.type}`}>
            {categoryMessage.text}
          </p>
        )}
      </ListingSection>

      <ListingSection number="2" title={t("listing.pricingQuantity")}>
        <div className="listing-grid listing-pricing-grid">
          <label className="listing-field">
            <span>{t("listing.quantity")}</span>
            <input
              type="number"
              min="1"
              value={values.quantity}
              onChange={(event) => updateValue("quantity", event.target.value)}
              aria-invalid={Boolean(errors.quantity)}
            />
            <FieldError>{errors.quantity}</FieldError>
          </label>

          <div className="listing-field listing-unit-field">
            <span className="listing-hidden-label">{t("listing.unit")}</span>
            <DashboardDropdown
              id="listing-unit"
              label={t("listing.unit")}
              options={units.map((value) => ({ value, label: optionLabel(value) }))}
              value={values.unit}
              isOpen={openDropdown === "unit"}
              onToggle={() => setOpenDropdown((current) => (current === "unit" ? "" : "unit"))}
              onSelect={(option) => selectDropdownValue("unit", option)}
              onClose={() => setOpenDropdown("")}
            />
            <FieldError />
          </div>

          <label className="listing-field listing-price-field">
            <span>{t("listing.price")}</span>
            <input
              type="number"
              min="1"
              value={values.price}
              onChange={(event) => updateValue("price", event.target.value)}
              aria-invalid={Boolean(errors.price)}
            />
            <FieldError>{errors.price}</FieldError>
          </label>
        </div>
      </ListingSection>

      <ListingSection number="3" title={t("listing.pickupLocation")}>
        <div className="listing-grid listing-location-grid">
          <div className="listing-field">
            <span>{t("listing.governorate")}</span>
            <DashboardDropdown
              id="listing-city"
              label={t("listing.governorate")}
              options={EGYPT_GOVERNORATES.map((item) => ({
                value: item.value,
                label: optionLabel(item.value),
              }))}
              value={values.city}
              isOpen={openDropdown === "city"}
              onToggle={() => setOpenDropdown((current) => (current === "city" ? "" : "city"))}
              onSelect={(option) => selectDropdownValue("city", option)}
              onClose={() => setOpenDropdown("")}
            />
            <FieldError>{errors.city}</FieldError>
          </div>

          <div className="listing-field">
            <span>{t("listing.areaDistrict")}</span>
            <DashboardDropdown
              id="listing-area"
              label={t("listing.areaDistrict")}
              options={availableAreas.map((value) => ({ value, label: optionLabel(value) }))}
              value={values.area}
              isOpen={openDropdown === "area"}
              onToggle={() => setOpenDropdown((current) => (current === "area" ? "" : "area"))}
              onSelect={(option) => selectDropdownValue("area", option)}
              onClose={() => setOpenDropdown("")}
            />
            <FieldError>{errors.area}</FieldError>
          </div>
        </div>

        <label className="listing-field listing-address-field">
          <span>{t("listing.exactAddress")}</span>
          <input
            type="text"
            value={values.address}
            onChange={(event) => updateValue("address", event.target.value)}
          />
          <FieldError />
        </label>
      </ListingSection>

      <ListingSection number="4" title={t("listing.uploadImages")}>
        <label className="listing-upload-box">
          <input type="file" accept="image/*" multiple onChange={handleImageChange} />
          <i className="bi bi-cloud-arrow-up" aria-hidden="true" />
          <span>{t("listing.uploadHelp")}</span>
          <strong aria-hidden="true">+</strong>
        </label>

        {errors.images && <p className="listing-error listing-upload-error">{errors.images}</p>}

        {values.existingImages.length > 0 && values.images.length === 0 && (
          <p className="listing-upload-count">
            {tChoice("listing.existingImage", values.existingImages.length)}
          </p>
        )}

        {values.images.length > 0 && (
          <p className="listing-upload-count">
            {tChoice("listing.selectedImage", values.images.length)}
          </p>
        )}

        <label className="listing-check">
          <input
            type="checkbox"
            checked={values.requestVerification}
            onChange={(event) => updateValue("requestVerification", event.target.checked)}
          />
          <span>{t("listing.requestVerification")}</span>
        </label>
      </ListingSection>

      <div className="listing-form-status" aria-live="polite">
        {formError && <p className="listing-error">{formError}</p>}
        {successMessage && <p className="listing-success">{successMessage}</p>}
      </div>

      <div className={`listing-actions ${isEditMode ? "listing-actions-edit" : ""}`}>
        {isEditMode ? (
          <>
            <button type="submit" className="listing-primary-button" disabled={isBusy}>
              {isSubmitting ? t("listing.saving") : t("listing.saveEdits")}
            </button>
            <Link to="/manage-listing" className="listing-secondary-button">
              {t("common.cancel")}
            </Link>
          </>
        ) : (
          <button type="submit" className="listing-primary-button" disabled={isBusy}>
            {isSubmitting ? t("listing.publishing") : t("listing.publishListings")}
            {!isSubmitting && <i className="bi bi-chevron-right" aria-hidden="true" />}
          </button>
        )}
      </div>
    </form>
  );
}

