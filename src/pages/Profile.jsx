import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SupplierProfile, SupplierSidebar } from "../components/SupplierDashboardLayout";
import { useI18n } from "../i18n/i18nContext";
import {
  fetchCurrentUser,
  updateUserProfile,
  uploadProfilePicture,
} from "../utils/authApi";
import {
  DEFAULT_PROFILE_IMAGE,
  getStoredUser,
  getSupplierUser,
  saveStoredUser,
} from "../utils/supplierUser";
import "./Profile.css";

const INITIAL_FORM = {
  firstName: "",
  lastName: "",
};

function getStoredPhone(user) {
  return (
    user?.phoneNumber ||
    user?.phone ||
    user?.mobileNumber ||
    user?.mobile ||
    user?.phone_number ||
    ""
  );
}

function splitName(fullName) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  const [firstName = "", ...lastNameParts] = parts;
  return {
    firstName,
    lastName: lastNameParts.join(" "),
  };
}

function normalizeProfileUser(user) {
  if (!user || typeof user !== "object") {
    return null;
  }

  const splitFullName = splitName(user.fullName || user.name);

  return {
    ...user,
    firstName: user.firstName || splitFullName.firstName || "",
    lastName: user.lastName || splitFullName.lastName || "",
  };
}

function mergeProfileUser(nextUser, previousUser = getStoredUser()) {
  const normalizedNextUser = normalizeProfileUser(nextUser);
  const normalizedPreviousUser = normalizeProfileUser(previousUser);

  if (!normalizedNextUser) {
    return normalizedPreviousUser;
  }

  return {
    ...(normalizedPreviousUser || {}),
    ...normalizedNextUser,
    phoneNumber:
      normalizedNextUser.phoneNumber ||
      normalizedNextUser.phone ||
      normalizedNextUser.mobileNumber ||
      normalizedNextUser.mobile ||
      normalizedNextUser.phone_number ||
      normalizedPreviousUser?.phoneNumber ||
      normalizedPreviousUser?.phone ||
      normalizedPreviousUser?.mobileNumber ||
      normalizedPreviousUser?.mobile ||
      normalizedPreviousUser?.phone_number ||
      "",
  };
}

function getDisplayPhone(user, fallback) {
  return getStoredPhone(user) || fallback;
}

function getFriendlyProfileError(error, t) {
  if (!error?.response) {
    return t("profile.connectionError");
  }

  const status = Number(error.response.status);

  if (status === 401 || status === 403) {
    return t("errors.loginRequired");
  }

  if (status === 413) {
    return t("profile.imageTooLarge");
  }

  if (status >= 400 && status < 500) {
    return t("profile.validationError");
  }

  return t("profile.updateError");
}

export default function Profile() {
  const { t } = useI18n();
  const [profileUser, setProfileUser] = useState(() => normalizeProfileUser(getStoredUser()));
  const [form, setForm] = useState(() => {
    const storedUser = normalizeProfileUser(getStoredUser());
    return storedUser
      ? {
          firstName: storedUser.firstName,
          lastName: storedUser.lastName,
        }
      : INITIAL_FORM;
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const dashboardUser = getSupplierUser();
  const currentProfileImage = dashboardUser.image;
  const displayEmail = profileUser?.email || t("profile.notProvided");
  const displayPhone = getDisplayPhone(profileUser, t("profile.notProvided"));
  const displayRole = dashboardUser.role || t("common.unknownRole");

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        setIsLoading(true);
        setErrorMessage("");
        const currentUser = mergeProfileUser(await fetchCurrentUser());

        if (!isMounted) {
          return;
        }

        if (currentUser) {
          saveStoredUser(currentUser);
          setProfileUser(currentUser);
          setForm({
            firstName: currentUser.firstName,
            lastName: currentUser.lastName,
          });
        }
      } catch {
        if (isMounted && !getStoredUser()) {
          setErrorMessage(t("profile.loadError"));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [t]);

  useEffect(() => {
    if (!selectedImage) {
      setPreviewUrl("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(selectedImage);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedImage]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
    setStatusMessage("");
    setErrorMessage("");
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0] || null;

    if (!file) {
      setSelectedImage(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setSelectedImage(null);
      setErrorMessage(t("profile.imageTypeError"));
      return;
    }

    setSelectedImage(file);
    setStatusMessage("");
    setErrorMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();

    if (!firstName || !lastName) {
      setErrorMessage(t("profile.nameRequired"));
      return;
    }

    try {
      setIsSaving(true);
      setStatusMessage("");
      setErrorMessage("");

      const currentUser = normalizeProfileUser(profileUser || getStoredUser());
      const profilePayload = {};

      const nameChanged =
        firstName !== (currentUser?.firstName || "") ||
        lastName !== (currentUser?.lastName || "");

      if (nameChanged) {
        profilePayload.firstName = firstName;
        profilePayload.lastName = lastName;
      }

      let updatedUser = currentUser;

      if (Object.keys(profilePayload).length > 0) {
        updatedUser = mergeProfileUser(await updateUserProfile(profilePayload), {
          ...(currentUser || {}),
          firstName,
          lastName,
        });
      }

      let photoUploadFailed = false;

      if (selectedImage) {
        try {
          updatedUser = mergeProfileUser(await uploadProfilePicture(selectedImage), updatedUser);
        } catch {
          photoUploadFailed = true;
        }
      }

      let refreshedUser = mergeProfileUser(updatedUser, {
        ...(getStoredUser() || {}),
        firstName,
        lastName,
      });

      try {
        refreshedUser = mergeProfileUser(await fetchCurrentUser(), refreshedUser);
      } catch {
        refreshedUser = mergeProfileUser(refreshedUser, getStoredUser());
      }

      if (selectedImage && !photoUploadFailed) {
        refreshedUser = {
          ...refreshedUser,
          _profileImageUpdatedAt: Date.now(),
        };
      }

      const nextUser = saveStoredUser(refreshedUser);

      setProfileUser(nextUser);
      setForm({
        firstName: nextUser.firstName || firstName,
        lastName: nextUser.lastName || lastName,
      });
      if (!photoUploadFailed) {
        setSelectedImage(null);
      }
      setStatusMessage(photoUploadFailed ? t("profile.updateSuccessPhotoFailed") : t("profile.updateSuccess"));
    } catch (error) {
      setErrorMessage(getFriendlyProfileError(error, t));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="dashboard-shell profile-shell">
      <SupplierSidebar />

      <section className="dashboard-content profile-content">
        <header className="dashboard-topbar">
          <div>
            <p className="profile-eyebrow">{t("profile.eyebrow")}</p>
            <h1>{t("profile.title")}</h1>
            <p>{t("profile.subtitle")}</p>
          </div>

          <SupplierProfile user={dashboardUser} />
        </header>

        <section className="profile-panel" aria-label={t("profile.formTitle")}>
          <div className="profile-preview">
            <div className="profile-avatar-wrap">
              <img
                src={previewUrl || currentProfileImage}
                alt={dashboardUser.fullName}
                className="profile-avatar"
                onError={(event) => {
                  event.currentTarget.src = DEFAULT_PROFILE_IMAGE;
                }}
              />
            </div>
            <div>
              <h2>{dashboardUser.fullName}</h2>
              <p>{displayRole}</p>
            </div>
          </div>

          <form className="profile-form" onSubmit={handleSubmit}>
            <div className="profile-section-heading">
              <h2>{t("profile.formTitle")}</h2>
              <p>{t("profile.formSubtitle")}</p>
            </div>

            {isLoading && <p className="profile-info">{t("profile.loading")}</p>}
            {statusMessage && <p className="profile-success">{statusMessage}</p>}
            {errorMessage && <p className="profile-error">{errorMessage}</p>}

            <div className="profile-grid">
              <label className="profile-field" htmlFor="firstName">
                <span>{t("profile.firstName")}<b aria-hidden="true">*</b></span>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={form.firstName}
                  onChange={handleChange}
                  autoComplete="given-name"
                  disabled={isSaving}
                />
              </label>

              <label className="profile-field" htmlFor="lastName">
                <span>{t("profile.lastName")}<b aria-hidden="true">*</b></span>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={form.lastName}
                  onChange={handleChange}
                  autoComplete="family-name"
                  disabled={isSaving}
                />
              </label>

              <label className="profile-field" htmlFor="profileEmail">
                <span>{t("profile.email")}</span>
                <input id="profileEmail" type="email" value={displayEmail} readOnly />
              </label>

              <label className="profile-field" htmlFor="profilePhone">
                <span>{t("profile.phone")}</span>
                <input id="profilePhone" type="text" value={displayPhone} readOnly />
              </label>
            </div>

            <div className="profile-upload-row">
              <div>
                <h3>{t("profile.photoTitle")}</h3>
                <p>{t("profile.photoHelp")}</p>
                {selectedImage && <small>{selectedImage.name}</small>}
              </div>

              <label className="profile-upload-button" htmlFor="profilePicture">
                <i className="bi bi-camera" aria-hidden="true" />
                <span>{t("profile.choosePhoto")}</span>
                <input
                  id="profilePicture"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={isSaving}
                />
              </label>
            </div>

            <div className="profile-actions">
              <Link to="/dashboard" className="profile-secondary-action">
                {t("profile.backToDashboard")}
              </Link>
              <button type="submit" className="profile-save-button" disabled={isSaving}>
                {isSaving ? t("profile.saving") : t("profile.save")}
              </button>
            </div>
          </form>
        </section>
      </section>
    </main>
  );
}
