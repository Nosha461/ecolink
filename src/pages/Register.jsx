import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImSpinner2 } from "react-icons/im";
import {
  FaRegEye,
  FaRegEyeSlash,
} from "react-icons/fa";
import {
  findAuthToken,
  findAuthUser,
  findRefreshToken,
  registerUser,
  resendOtp,
  storeAuthSession,
  verifyOtp,
} from "../utils/authApi";
import { API_ENDPOINTS } from "../utils/apiConfig";
import { useI18n } from "../i18n/i18nContext";
import "./Register.css";

const SIGNUP_ICON_PATH = "/assets/dashboard/";
const SOCIAL_ICON_PATH = "/assets/";
const PENDING_OTP_STORAGE_KEY = "EcoLinkPendingOtp";
const OTP_LENGTH = 6;

function createRegisterSchema(t) {
  return z
    .object({
    fullName: z
      .string()
      .trim()
      .min(1, t("auth.fullNameRequired"))
      .refine(
        (value) => value.split(/\s+/).filter(Boolean).length >= 2,
        t("auth.fullNameRequired")
      ),
    phone: z
      .string()
      .trim()
      .min(1, t("auth.validPhone"))
      .refine(
        (value) => /^[0-9+\s()-]{8,20}$/.test(value),
        t("auth.validPhone")
      ),
    email: z
      .string()
      .trim()
      .min(1, t("auth.emailRequired"))
      .email(t("auth.validEmail")),
    password: z
      .string()
      .trim()
      .min(1, t("auth.passwordRequired"))
      .min(
        8,
        t("auth.strongPassword")
      )
      .refine(
        (value) => /[A-Za-z]/.test(value) && /\d/.test(value),
        t("auth.strongPassword")
      ),
    confirmPassword: z.string().trim().min(1, t("auth.confirmPasswordRequired")),
    location: z.string().optional(),
    role: z.enum(["buyer", "seller"]),
    agreeToTerms: z
      .boolean()
      .refine(
        (value) => value,
        t("auth.agreeTerms")
      ),
  })
  .refine((values) => values.password.trim() === values.confirmPassword.trim(), {
    message: t("auth.passwordsMatch"),
    path: ["confirmPassword"],
  });
}

const CITY_OPTIONS = ["Cairo", "Giza", "Alexandria", "Mansoura", "Tanta"];

function SignupDropdown({ label, options, value, isOpen, onToggle, onSelect, onClose }) {
  const { optionLabel } = useI18n();

  return (
    <div
      className={`signup-dashboard-dropdown ${isOpen ? "open" : ""}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          onClose();
        }
      }}
    >
      <button
        type="button"
        className="signup-dashboard-dropdown-trigger"
        onClick={onToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{value ? optionLabel(value) : label}</span>
        <img src={`${SIGNUP_ICON_PATH}process.png`} alt="" aria-hidden="true" />
      </button>

      <div className="signup-dashboard-dropdown-menu" role="listbox" aria-label={label}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={value === option ? "selected" : ""}
            onClick={() => onSelect(option)}
            role="option"
            aria-selected={value === option}
          >
            <span>{optionLabel(option)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function getBackendMessage(data) {
  if (!data) return "";

  if (typeof data === "string") return data.trim();
  if (typeof data.message === "string" && data.message.trim()) return data.message.trim();
  if (typeof data.error === "string" && data.error.trim()) return data.error.trim();
  if (typeof data.msg === "string" && data.msg.trim()) return data.msg.trim();

  if (Array.isArray(data.errors) && data.errors.length > 0) {
    const firstError = data.errors[0];
    if (typeof firstError === "string") return firstError;
    if (typeof firstError?.msg === "string") return firstError.msg;
    if (typeof firstError?.message === "string") return firstError.message;
  }

  return "";
}

function includesAny(value, patterns) {
  return patterns.some((pattern) => value.includes(pattern));
}

function getFriendlyApiError(error, t) {
  if (!error.response) {
    return t("auth.cannotReach");
  }

  const backendMessage = getBackendMessage(error.response.data);
  const normalizedMessage = backendMessage.toLowerCase();

  if (
    includesAny(normalizedMessage, [
      "user already exists",
      "account already exists",
      "duplicate key",
    ])
  ) {
    return t("auth.accountContactRegistered");
  }

  if (
    includesAny(normalizedMessage, [
      "email already registered",
      "this email is already registered",
      "email already exists",
      "email exists",
      "email is already in use",
      "email already in use",
      "duplicate email",
    ]) &&
    !normalizedMessage.includes("phone")
  ) {
    return t("auth.emailRegistered");
  }

  if (
    includesAny(normalizedMessage, [
      "phone already registered",
      "phone already exists",
      "phone number already exists",
      "phonenumber already exists",
      "phone is already in use",
      "phone already in use",
    ]) ||
    (normalizedMessage.includes("duplicate key") && normalizedMessage.includes("phone"))
  ) {
    return t("auth.phoneRegistered");
  }

  if (includesAny(normalizedMessage, ["password", "weak password"])) {
    return t("auth.strongPassword");
  }

  if (includesAny(normalizedMessage, ["invalid email", "email must be valid"])) {
    return t("auth.validEmail");
  }

  if (includesAny(normalizedMessage, ["full name", "firstname", "lastname", "first name", "last name"])) {
    return t("auth.fullNameRequired");
  }

  if (includesAny(normalizedMessage, ["invalid phone", "phone number", "phonenumber"])) {
    return t("auth.validPhone");
  }

  if (includesAny(normalizedMessage, ["role", "buyer", "seller"])) {
    return t("auth.roleRequired");
  }

  if (
    normalizedMessage.includes("invalid input") ||
    normalizedMessage.includes("expected true") ||
    normalizedMessage.includes("zod") ||
    normalizedMessage.includes("validation")
  ) {
    return t("auth.checkTryAgain");
  }

  return t("auth.createFailed");
}

function getFriendlyOtpError(error, t) {
  if (!error.response) {
    return t("auth.cannotReach");
  }

  const backendMessage = getBackendMessage(error.response.data);
  const normalizedMessage = backendMessage.toLowerCase();

  if (normalizedMessage.includes("expired")) {
    return t("auth.otpExpired");
  }

  if (
    normalizedMessage.includes("invalid otp") ||
    normalizedMessage.includes("invalid code") ||
    normalizedMessage.includes("wrong")
  ) {
    return t("auth.otpInvalid");
  }

  return t("auth.otpVerifyFailed");
}

function findAuthData(data) {
  return data?.data || data?.user || data || {};
}

function findUser(data) {
  const authData = findAuthData(data);
  return findAuthUser(data) || authData.user || authData.profile || data?.user || null;
}

function findToken(data) {
  return findAuthToken(data);
}

const getRefreshToken = findRefreshToken;

function getRequiresOtp(data) {
  const authData = findAuthData(data);
  const user = findUser(data);
  const backendMessage = getBackendMessage(data).toLowerCase();

  return Boolean(
    authData.requiresOtpVerification ||
      authData.requiresOTPVerification ||
      authData.requiresVerification ||
      authData.otpRequired ||
      authData.requiresOtp ||
      authData.isVerified === false ||
      data?.requiresOtpVerification ||
      data?.otpRequired ||
      data?.isVerified === false ||
      user?.isVerified === false ||
      (backendMessage.includes("otp") && backendMessage.includes("sent")) ||
      (backendMessage.includes("verification") && backendMessage.includes("sent"))
  );
}

function getOtpLength(data) {
  const authData = findAuthData(data);
  const length = Number(authData.otpLength || data?.otpLength || OTP_LENGTH);
  return Number.isFinite(length) && length > 0 ? length : OTP_LENGTH;
}

function getEndpointFromResponse(data, keys) {
  const authData = findAuthData(data);
  const endpoint = keys
    .map((key) => authData[key] || data?.[key])
    .find((value) => typeof value === "string" && value.trim());

  return endpoint || "";
}

function persistAuthSession(data) {
  const userToken = findToken(data);
  const refreshToken = getRefreshToken(data);
  const user = findUser(data);

  if (userToken) {
    localStorage.setItem("UserToken", userToken);
  }

  if (refreshToken) {
    localStorage.setItem("RefreshToken", refreshToken);
  }

  if (user) {
    localStorage.setItem("User", JSON.stringify(user));
  }

  return Boolean(userToken);
}

function FeedbackModal({ open, title, message, variant, onClose, okText }) {
  if (!open) return null;

  return (
    <div className="eco-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className={`eco-modal eco-modal-${variant}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="signup-feedback-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="signup-feedback-title" className="eco-modal-title">
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
  const fieldOrder = [
    "fullName",
    "phone",
    "email",
    "password",
    "confirmPassword",
    "agreeToTerms",
  ];

  const firstErrorField = fieldOrder.find((field) => fieldErrors[field]);
  if (!firstErrorField) {
    return t("auth.checkTryAgain");
  }

  return fieldErrors[firstErrorField]?.message || t("auth.checkTryAgain");
}

export default function Register() {
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpInfoKey, setOtpInfoKey] = useState("");
  const [pendingOtp, setPendingOtp] = useState(null);
  const [feedback, setFeedback] = useState({
    open: false,
    title: "",
    message: "",
    variant: "error",
    redirectOnClose: false,
    redirectPath: "",
  });
  const navigate = useNavigate();

  const form = useForm({
    defaultValues: {
      fullName: "",
      phone: "",
      email: "",
      password: "",
      confirmPassword: "",
      location: "Cairo",
      role: "buyer",
      agreeToTerms: false,
    },
    resolver: zodResolver(createRegisterSchema(t)),
    shouldFocusError: true,
  });

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    getFieldState,
    getValues,
    setValue,
    setFocus,
    clearErrors,
    formState: { errors },
  } = form;

  const selectedRole = watch("role");
  const selectedCity = watch("location");

  useEffect(() => {
    try {
      const savedPendingOtp = JSON.parse(sessionStorage.getItem(PENDING_OTP_STORAGE_KEY) || "null");
      if (savedPendingOtp?.email) {
        setPendingOtp(savedPendingOtp);
      }
    } catch {
      sessionStorage.removeItem(PENDING_OTP_STORAGE_KEY);
    }
  }, []);

  const openPopup = (title, message, variant = "error", redirectOnClose = false, redirectPath = "") => {
    setFeedback({
      open: true,
      title,
      message,
      variant,
      redirectOnClose,
      redirectPath,
    });
  };

  const closePopup = () => {
    const redirectPath = feedback.redirectPath || (feedback.redirectOnClose ? "/login" : "");

    setFeedback({
      open: false,
      title: "",
      message: "",
      variant: "error",
      redirectOnClose: false,
      redirectPath: "",
    });

    if (redirectPath) {
      navigate(redirectPath);
    }
  };

  const startOtpStep = (data, fallbackEmail) => {
    const user = findUser(data);
    const email = user?.email || fallbackEmail;
    const nextPendingOtp = {
      email,
      delivery: findAuthData(data).otpDelivery || data?.otpDelivery || "email",
      otpLength: getOtpLength(data),
      verifyEndpoint: getEndpointFromResponse(
        data,
        ["verifyEndpoint", "verificationEndpoint", "otpVerifyEndpoint"]
      ) || API_ENDPOINTS.auth.verifyEmail,
      resendEndpoint: getEndpointFromResponse(
        data,
        ["resendEndpoint", "resendOtpEndpoint", "otpResendEndpoint"]
      ) || API_ENDPOINTS.auth.resendOtp,
    };

    setPendingOtp(nextPendingOtp);
    setOtpCode("");
    setOtpError("");
    setOtpInfoKey("auth.otpSent");
    sessionStorage.setItem(PENDING_OTP_STORAGE_KEY, JSON.stringify(nextPendingOtp));
  };

  const clearOtpStep = () => {
    setPendingOtp(null);
    setOtpCode("");
    setOtpError("");
    setOtpInfoKey("");
    sessionStorage.removeItem(PENDING_OTP_STORAGE_KEY);
  };

  const handleOtpChange = (event) => {
    const nextValue = event.target.value.replace(/\D/g, "").slice(0, pendingOtp?.otpLength || OTP_LENGTH);
    setOtpCode(nextValue);
    setOtpError("");
  };

  const focusFirstValidationError = () => {
    const fieldOrder = [
      "fullName",
      "phone",
      "email",
      "password",
      "confirmPassword",
      "agreeToTerms",
    ];

    const firstInvalidField = fieldOrder.find((field) => getFieldState(field).invalid);
    if (firstInvalidField) {
      setFocus(firstInvalidField);
    }
  };

  const validateBeforeSubmit = async () => {
    clearErrors();

    const values = getValues();

    if (values.fullName.trim().split(/\s+/).filter(Boolean).length < 2) {
      setFocus("fullName");
      openPopup(
        t("auth.checkInfo"),
        t("auth.fullNameRequired")
      );
      return false;
    }

    if (!values.phone.trim() || !/^[0-9+\s()-]{8,20}$/.test(values.phone.trim())) {
      setFocus("phone");
      openPopup(t("auth.checkInfo"), t("auth.validPhone"));
      return false;
    }

    if (!values.email.trim()) {
      setFocus("email");
      openPopup(t("auth.checkInfo"), t("auth.emailRequired"));
      return false;
    }

    if (!z.string().email().safeParse(values.email.trim()).success) {
      setFocus("email");
      openPopup(t("auth.checkInfo"), t("auth.validEmail"));
      return false;
    }

    if (!values.password.trim()) {
      setFocus("password");
      openPopup(t("auth.checkInfo"), t("auth.passwordRequired"));
      return false;
    }

    if (!values.confirmPassword.trim()) {
      setFocus("confirmPassword");
      openPopup(t("auth.checkInfo"), t("auth.confirmPasswordRequired"));
      return false;
    }

    if (
      values.password.trim().length < 8 ||
      !/[A-Za-z]/.test(values.password.trim()) ||
      !/\d/.test(values.password.trim())
    ) {
      setFocus("password");
      openPopup(
        t("auth.checkInfo"),
        t("auth.strongPassword")
      );
      return false;
    }

    if (values.password.trim() !== values.confirmPassword.trim()) {
      setFocus("confirmPassword");
      openPopup(
        t("auth.checkInfo"),
        t("auth.passwordsMatch")
      );
      return false;
    }

    if (!values.agreeToTerms) {
      setFocus("agreeToTerms");
      openPopup(
        t("auth.checkInfo"),
        t("auth.agreeTerms")
      );
      return false;
    }

    const isValid = await trigger();
    if (!isValid) {
      focusFirstValidationError();
      const fallbackMessage =
        errors.fullName?.message ||
        errors.phone?.message ||
        errors.email?.message ||
        errors.password?.message ||
        errors.confirmPassword?.message ||
        errors.agreeToTerms?.message ||
        t("auth.checkTryAgain");
      openPopup(t("auth.checkInfo"), fallbackMessage);
      return false;
    }

    return true;
  };

  const onInvalidSubmit = (fieldErrors) => {
    const values = getValues();

    if (
      values.password.trim() &&
      values.confirmPassword.trim() &&
      values.password.trim() !== values.confirmPassword.trim()
    ) {
      setFocus("confirmPassword");
      openPopup(
        t("auth.checkInfo"),
        t("auth.passwordsMatch")
      );
      return;
    }

    focusFirstValidationError();
    openPopup(t("auth.checkInfo"), getValidationPopupMessage(fieldErrors, t));
  };

  const onSubmit = async (values) => {
    const canSubmit = await validateBeforeSubmit();
    if (!canSubmit) return;

    setIsLoading(true);

    const [firstName, ...lastNameParts] = values.fullName.trim().split(/\s+/);
    const phoneNumber = values.phone.replace(/\D/g, "");

    const payload = {
      firstName,
      lastName: lastNameParts.join(" "),
      email: values.email.trim(),
      password: values.password.trim(),
      confirmPassword: values.confirmPassword.trim(),
      phoneNumber,
      role: values.role,
    };

    try {
      const response = await registerUser(payload);

      if (!(response?.status >= 200 && response?.status < 300)) {
        throw new Error(t("auth.unexpectedSignup"));
      }

      if (getRequiresOtp(response.data)) {
        startOtpStep(response.data, payload.email);
        return;
      }

      openPopup(
        t("auth.accountCreated"),
        t("auth.canLogin"),
        "success",
        true
      );
    } catch (error) {
      openPopup(t("auth.smallProblem"), getFriendlyApiError(error, t), "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    if (!pendingOtp?.email || isVerifyingOtp) return;

    const otpLength = pendingOtp.otpLength || OTP_LENGTH;

    if (!otpCode.trim()) {
      setOtpError(t("auth.otpRequired"));
      return;
    }

    if (!new RegExp(`^\\d{${otpLength}}$`).test(otpCode.trim())) {
      setOtpError(t("auth.otpFormat", { length: otpLength }));
      return;
    }

    try {
      setIsVerifyingOtp(true);
      setOtpError("");
      setOtpInfoKey("");

      if (!pendingOtp.verifyEndpoint) {
        setOtpError(t("auth.otpEndpointMissing"));
        return;
      }

      const data = await verifyOtp(pendingOtp.verifyEndpoint, {
        email: pendingOtp.email,
        code: otpCode.trim(),
        otp: otpCode.trim(),
      });

      const hasSession = storeAuthSession(data) || persistAuthSession(data);
      clearOtpStep();
      openPopup(
        t("auth.accountVerified"),
        hasSession ? t("auth.verifiedDashboard") : t("auth.verifiedLogin"),
        "success",
        !hasSession,
        hasSession ? "/dashboard" : ""
      );
    } catch (error) {
      setOtpError(getFriendlyOtpError(error, t));
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (!pendingOtp?.email || isResendingOtp) return;

    if (!pendingOtp.resendEndpoint) {
      setOtpError(t("auth.resendUnavailable"));
      return;
    }

    try {
      setIsResendingOtp(true);
      setOtpError("");
      setOtpInfoKey("");

      const data = await resendOtp(pendingOtp.resendEndpoint, {
        email: pendingOtp.email,
      });
      startOtpStep(data, pendingOtp.email);
      setOtpInfoKey("auth.otpResent");
    } catch (error) {
      setOtpError(getFriendlyOtpError(error, t));
    } finally {
      setIsResendingOtp(false);
    }
  };

  return (
    <section className="eco-signup-container">
      <FeedbackModal
        open={feedback.open}
        title={feedback.title}
        message={feedback.message}
        variant={feedback.variant}
        onClose={closePopup}
        okText={t("common.ok")}
      />

      <div className="eco-map-background" aria-hidden="true" />

      <div className="eco-signup-content">
        <header className="eco-header">
          <h1 className="eco-welcome">{t("auth.welcomeBack")}</h1>
          <p className="eco-subtext">{t("auth.intro")}</p>
        </header>

        <main className="eco-card-shell">
          <div className="eco-card">
            {pendingOtp ? (
              <div className="eco-otp-panel">
                <div className="eco-otp-icon" aria-hidden="true">
                  <img src={`${SIGNUP_ICON_PATH}tick.png`} alt="" />
                </div>
                <h2 className="eco-title eco-otp-title">{t("auth.verifyAccount")}</h2>
                <p className="eco-otp-copy">
                  {t("auth.otpSentTo", { email: pendingOtp.email })}
                </p>

                <form className="eco-form eco-otp-form" onSubmit={handleVerifyOtp} noValidate>
                  <div className="eco-field eco-otp-field">
                    <label className="eco-label" htmlFor="account-otp">
                      {t("auth.otpCode")}<span className="eco-required">*</span>
                    </label>
                    <input
                      id="account-otp"
                      value={otpCode}
                      onChange={handleOtpChange}
                      className="eco-input eco-input-tall eco-otp-input"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder={t("auth.otpPlaceholder", { length: pendingOtp.otpLength || OTP_LENGTH })}
                      aria-invalid={Boolean(otpError)}
                    />
                    <p className="eco-otp-help">
                      {t("auth.otpHelp", { length: pendingOtp.otpLength || OTP_LENGTH })}
                    </p>
                    {otpError ? <p className="eco-field-error">{otpError}</p> : null}
                    {otpInfoKey ? (
                      <p className="eco-status eco-status-success">{t(otpInfoKey)}</p>
                    ) : null}
                  </div>

                  <div className="eco-otp-actions">
                    <button disabled={isVerifyingOtp} className="eco-btn-submit" type="submit">
                      {isVerifyingOtp ? <ImSpinner2 className="animate-spin" /> : t("auth.verifyOtp")}
                    </button>
                    <button
                      type="button"
                      className="eco-otp-link-button"
                      onClick={handleResendOtp}
                      disabled={isResendingOtp || !pendingOtp.resendEndpoint}
                    >
                      {isResendingOtp ? t("auth.resendingOtp") : t("auth.resendOtp")}
                    </button>
                  </div>

                  <button type="button" className="eco-otp-secondary" onClick={clearOtpStep}>
                    {t("auth.backToRegister")}
                  </button>
                </form>
              </div>
            ) : (
            <>
            <h2 className="eco-title">{t("auth.signupAs")}</h2>

            <div className="eco-role-grid">
              <label
                className={`eco-role-card ${
                  selectedRole === "buyer" ? "active" : ""
                }`}
              >
                <input
                  {...register("role")}
                  type="radio"
                  value="buyer"
                  className="eco-role-input"
                />
                <span className="eco-role-icon">
                  <img src={`${SIGNUP_ICON_PATH}investor.png`} alt="" aria-hidden="true" />
                </span>
                <span className="eco-role-name">{t("common.buyer")}</span>
                <span className="eco-role-text">{t("auth.findMaterials")}</span>
              </label>

              <label
                className={`eco-role-card ${
                  selectedRole === "seller" ? "active" : ""
                }`}
              >
                <input
                  {...register("role")}
                  type="radio"
                  value="seller"
                  className="eco-role-input"
                />
                <span className="eco-role-icon">
                  <img src={`${SIGNUP_ICON_PATH}delivery-man.png`} alt="" aria-hidden="true" />
                </span>
                <span className="eco-role-name">{t("common.supplier")}</span>
                <span className="eco-role-text">{t("auth.sellWaste")}</span>
              </label>
            </div>

            <form
              onSubmit={handleSubmit(onSubmit, onInvalidSubmit)}
              noValidate
              className="eco-form"
            >
              <div className="eco-field">
                <label className="eco-label" htmlFor="fullName">
                  {t("auth.fullName")}<span className="eco-required">*</span>
                </label>
                <input
                  {...register("fullName")}
                  id="fullName"
                  placeholder={t("auth.enterFullName")}
                  className="eco-input eco-input-tall"
                  type="text"
                />
              </div>

              <div className="eco-field">
                <label className="eco-label" htmlFor="phone">
                  {t("auth.phoneNumber")}<span className="eco-required">*</span>
                </label>
                <div className="eco-input-with-icon">
                  <span className="eco-leading-icon" aria-hidden="true">
                    <span className="eco-flag-egypt">
                      <span className="eco-flag-egypt-mark" />
                    </span>
                  </span>
                  <input
                    {...register("phone")}
                    id="phone"
                    placeholder="01167548726"
                    className="eco-input eco-input-compact eco-input-has-icon"
                    type="tel"
                  />
                </div>
              </div>

              <div className="eco-field">
                <label className="eco-label" htmlFor="email">
                  {t("auth.email")}
                </label>
                <input
                  {...register("email")}
                  id="email"
                  placeholder="MMHYV@gmail.com"
                  className="eco-input eco-input-compact"
                  type="email"
                />
              </div>

              <div className="eco-field">
                <label className="eco-label" htmlFor="password">
                  {t("auth.password")}<span className="eco-required">*</span>
                </label>
                <div className="eco-password-wrap">
                  <input
                    {...register("password")}
                    id="password"
                    placeholder="********"
                    className="eco-input eco-input-compact eco-password-input"
                    type={showPassword ? "text" : "password"}
                  />
                  <button
                    type="button"
                    className="eco-password-toggle"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                  >
                    {showPassword ? <FaRegEyeSlash /> : <FaRegEye />}
                  </button>
                </div>
              </div>

              <div className="eco-field">
                <label className="eco-label" htmlFor="confirmPassword">
                  {t("auth.confirmPassword")}<span className="eco-required">*</span>
                </label>
                <div className="eco-password-wrap">
                  <input
                    {...register("confirmPassword")}
                    id="confirmPassword"
                    placeholder="********"
                    className="eco-input eco-input-compact eco-password-input"
                    type={showConfirmPassword ? "text" : "password"}
                  />
                  <button
                    type="button"
                    className="eco-password-toggle"
                    onClick={() =>
                      setShowConfirmPassword((current) => !current)
                    }
                    aria-label={
                      showConfirmPassword
                        ? t("auth.hideConfirmPassword")
                        : t("auth.showConfirmPassword")
                    }
                  >
                    {showConfirmPassword ? <FaRegEyeSlash /> : <FaRegEye />}
                  </button>
                </div>
              </div>

              <div className="eco-field eco-location-field">
                <label className="eco-label" htmlFor="location">
                  {t("auth.location")}<span className="eco-required">*</span>
                </label>
                <input type="hidden" id="location" {...register("location")} />
                <SignupDropdown
                  label={t("auth.location")}
                  options={CITY_OPTIONS}
                  value={selectedCity}
                  isOpen={isLocationOpen}
                  onToggle={() => setIsLocationOpen((current) => !current)}
                  onClose={() => setIsLocationOpen(false)}
                  onSelect={(city) => {
                    setValue("location", city, { shouldDirty: true });
                    setIsLocationOpen(false);
                  }}
                />
              </div>

              <label className="eco-terms">
                <input
                  {...register("agreeToTerms")}
                  type="checkbox"
                  className="eco-terms-input"
                />
                <span>{t("auth.terms")}</span>
              </label>

              <div className="eco-footer-actions">
                <button disabled={isLoading} className="eco-btn-submit" type="submit">
                  {isLoading ? <ImSpinner2 className="animate-spin" /> : t("common.createAccount")}
                </button>

                <div className="eco-divider">{t("auth.continueWith")}</div>

                <div className="social-icons-row">
                  <img className="social-icon" src={`${SOCIAL_ICON_PATH}google.png`} alt="Google" />
                  <img className="social-icon" src={`${SOCIAL_ICON_PATH}communication.png`} alt="Communication" />
                  <img className="social-icon" src={`${SOCIAL_ICON_PATH}apple-logo.png`} alt="Apple" />
                </div>

                <p className="eco-login-prompt">
                  {t("auth.alreadyHaveAccount")}
                  <Link to="/login" className="eco-link">
                    {" "}
                    {t("common.signIn")}
                  </Link>
                </p>
              </div>
            </form>
            </>
            )}
          </div>
        </main>
      </div>
    </section>
  );
}

