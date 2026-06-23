import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImSpinner2 } from "react-icons/im";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa";
import {
  findAuthToken,
  findAuthUser,
  findRefreshToken,
  loginUser,
  mergeAuthUsers,
  refreshStoredUserProfile,
  saveAuthUser,
} from "../utils/authApi";
import { useI18n } from "../i18n/i18nContext";
import "./Login.css";

const SOCIAL_ICON_PATH = "/assets/";

function createLoginSchema(t) {
  return z.object({
    email: z
      .string()
      .trim()
      .min(1, t("auth.emailRequired"))
      .email(t("auth.validEmail")),
    password: z.string().trim().min(1, t("auth.passwordRequired")),
  });
}

function FeedbackModal({ open, title, message, variant, onClose, okText }) {
  if (!open) return null;

  return (
    <div className="eco-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className={`eco-modal eco-modal-${variant}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-feedback-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="login-feedback-title" className="eco-modal-title">
          {title}
        </h3>
        <p className="eco-modal-message">{message}</p>
        <button type="button" className="eco-modal-button" onClick={onClose}>
          {okText}
        </button>
      </div>
    </div>
  );
}

function getValidationPopupMessage(fieldErrors, t) {
  if (fieldErrors.email) {
    return fieldErrors.email.message || t("auth.validEmail");
  }

  if (fieldErrors.password) {
    return fieldErrors.password.message || t("auth.passwordRequired");
  }

  return t("auth.checkEmailPassword");
}

function getFriendlyLoginError(error, t) {
  if (!error.response) {
    return t("auth.cannotReach");
  }

  return t("auth.loginFailed");
}

export default function Login() {
  const { t } = useI18n();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState({
    open: false,
    title: "",
    message: "",
    variant: "error",
  });
  const navigate = useNavigate();

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    resolver: zodResolver(createLoginSchema(t)),
    shouldFocusError: true,
  });

  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    setFocus,
    clearErrors,
    formState: { errors },
  } = form;

  const openPopup = (title, message, variant = "error") => {
    setFeedback({
      open: true,
      title,
      message,
      variant,
    });
  };

  const closePopup = () => {
    setFeedback({
      open: false,
      title: "",
      message: "",
      variant: "error",
    });
  };

  const validateBeforeSubmit = async () => {
    clearErrors();

    const values = getValues();
    const email = values.email.trim();
    const password = values.password.trim();

    if (!email) {
      setFocus("email");
      openPopup(t("auth.checkInfo"), t("auth.emailRequired"));
      return false;
    }

    if (!z.string().email().safeParse(email).success) {
      setFocus("email");
      openPopup(t("auth.checkInfo"), t("auth.validEmail"));
      return false;
    }

    if (!password) {
      setFocus("password");
      openPopup(t("auth.checkInfo"), t("auth.passwordRequired"));
      return false;
    }

    const isValid = await trigger();
    if (!isValid) {
      const fallbackMessage =
        errors.email?.message ||
        errors.password?.message ||
        t("auth.checkEmailPassword");
      openPopup(t("auth.checkInfo"), fallbackMessage);
      return false;
    }

    return true;
  };

  async function handleLog(values) {
    const canSubmit = await validateBeforeSubmit();
    if (!canSubmit || isLoading) return;

    try {
      setIsLoading(true);

      const data = await loginUser({
        email: values.email.trim(),
        password: values.password,
      });

      const userToken = findAuthToken(data);
      const refreshToken = findRefreshToken(data);
      let user = findAuthUser(data);

      if (!userToken) {
        throw new Error("We couldn't sign you in right now.");
      }

      localStorage.setItem("UserToken", userToken);
      if (refreshToken) {
        localStorage.setItem("RefreshToken", refreshToken);
      }
      if (user) {
        saveAuthUser(user);
      }

      try {
        user = await refreshStoredUserProfile(user);
      } catch {
        user = mergeAuthUsers(user);
        if (user) {
          saveAuthUser(user);
        }
      }

      navigate("/dashboard");
    } catch (error) {
      openPopup(t("auth.smallProblem"), getFriendlyLoginError(error, t), "error");
    } finally {
      setIsLoading(false);
    }
  }

  const onError = (errors) => {
    if (errors.email) {
      setFocus("email");
    } else if (errors.password) {
      setFocus("password");
    }

    openPopup(t("auth.checkInfo"), getValidationPopupMessage(errors, t));
  };

  return (
    <div className="login-page-wrapper">
      <FeedbackModal
        open={feedback.open}
        title={feedback.title}
        message={feedback.message}
        variant={feedback.variant}
        onClose={closePopup}
        okText={t("common.ok")}
      />
      <div className="map-background"></div>

      <div className="content-container">
        <header className="login-header-section">
          <h1 className="eco-welcome-title">{t("auth.welcomeBack")}</h1>
          <p className="eco-subtext">{t("auth.intro")}</p>
        </header>

        <main className="eco-login-card">
          <h2 className="form-title">{t("common.signIn")}</h2>

          <form className="login-form" onSubmit={handleSubmit(handleLog, onError)} noValidate>
            <div className="login-field">
              <label className="eco-label" htmlFor="login-email">
                {t("auth.email")}
              </label>
              <input
                {...register("email")}
                id="login-email"
                type="text"
                className="eco-input"
                placeholder={t("auth.enterEmail")}
                autoComplete="email"
                aria-invalid={Boolean(errors.email)}
              />
            </div>

            <div className="login-field">
              <label className="eco-label" htmlFor="login-password">
                {t("auth.password")}
              </label>
              <div className="password-input-group">
                <input
                  {...register("password")}
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  className="eco-input password-input"
                  placeholder={t("auth.enterPassword")}
                  autoComplete="current-password"
                  aria-invalid={Boolean(errors.password)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle-icon"
                  aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                >
                  {showPassword ? <FaRegEyeSlash /> : <FaRegEye />}
                </button>
              </div>
            </div>

            <div className="remember-forgot-wrapper">
              <div className="remember-me">
                <input className="eco-check" type="checkbox" id="rememberMe" />
                <label htmlFor="rememberMe">
                  {t("auth.rememberMe")}
                </label>
              </div>
              <Link to="/forgot-password" className="forgot-password-link">
                {t("auth.forgotPassword")}
              </Link>
            </div>

            <div className="btn-center-container">
              <button disabled={isLoading} type="submit" className="btn-eco">
                {isLoading ? (
                  <>
                    <ImSpinner2 className="login-spinner" />
                    {t("common.signingIn")}
                  </>
                ) : (
                  t("common.signIn")
                )}
              </button>
            </div>

            <div className="signup-prompt-wrap">
              <p className="already-have-account-text">
                {t("auth.dontHaveAccount")}{" "}
                <Link to="/register" className="eco-signup-link">
                  {t("common.createAccount")}
                </Link>
              </p>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
