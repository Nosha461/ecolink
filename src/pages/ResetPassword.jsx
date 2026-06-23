import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa";
import { ImSpinner2 } from "react-icons/im";
import { getApiErrorMessage } from "../utils/apiClient";
import { requestPasswordReset, resetPassword, verifyPasswordResetCode } from "../utils/authApi";
import { useI18n } from "../i18n/i18nContext";
import "./PasswordReset.css";

function createResetPasswordSchema(t) {
  return z
    .object({
      email: z.string().trim().min(1, t("auth.emailRequired")).email(t("auth.validEmail")),
      code: z
        .string()
        .trim()
        .min(1, t("passwordReset.codeRequired"))
        .regex(/^\d{4,8}$/, t("passwordReset.codeFormat")),
      password: z
        .string()
        .trim()
        .min(1, t("passwordReset.newPasswordRequired"))
        .min(6, t("passwordReset.passwordMinLength")),
      confirmPassword: z.string().trim().min(1, t("auth.confirmPasswordRequired")),
    })
    .refine((values) => values.password.trim() === values.confirmPassword.trim(), {
      message: t("auth.passwordsMatch"),
      path: ["confirmPassword"],
    });
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useI18n();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: searchParams.get("email") || "",
      code: "",
      password: "",
      confirmPassword: "",
    },
    resolver: zodResolver(createResetPasswordSchema(t)),
  });

  const onSubmit = async (values) => {
    try {
      setIsSubmitting(true);
      setStatus({ type: "", message: "" });
      await verifyPasswordResetCode({
        email: values.email.trim(),
        code: values.code.trim(),
      });
      await resetPassword({
        email: values.email.trim(),
        password: values.password.trim(),
        confirmPassword: values.confirmPassword.trim(),
      });
      setStatus({ type: "success", message: t("passwordReset.resetSuccess") });
      window.setTimeout(() => navigate("/login"), 1100);
    } catch (error) {
      setStatus({
        type: "error",
        message: getApiErrorMessage(error, t("passwordReset.resetError"), t),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    const email = getValues("email")?.trim() || "";

    if (!z.string().email().safeParse(email).success) {
      setStatus({ type: "error", message: t("auth.validEmail") });
      return;
    }

    try {
      setIsResending(true);
      setStatus({ type: "", message: "" });
      await requestPasswordReset(email);
      setStatus({ type: "success", message: t("passwordReset.codeResent") });
    } catch (error) {
      setStatus({
        type: "error",
        message: getApiErrorMessage(error, t("passwordReset.resendError"), t),
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <main className="password-reset-page">
      <div className="password-reset-map" aria-hidden="true" />

      <section className="password-reset-card" aria-labelledby="reset-password-title">
        <p className="password-reset-kicker">{t("passwordReset.resetKicker")}</p>
        <h1 id="reset-password-title">{t("passwordReset.resetTitle")}</h1>
        <p className="password-reset-copy">{t("passwordReset.resetCopy")}</p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <label className="password-reset-field" htmlFor="reset-email">
            <span>{t("auth.email")}</span>
            <input
              {...register("email")}
              id="reset-email"
              type="email"
              placeholder="example@email.com"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
            />
          </label>
          {errors.email && <p className="password-reset-error">{errors.email.message}</p>}

          <label className="password-reset-field" htmlFor="reset-code">
            <span>{t("passwordReset.verificationCode")}</span>
            <input
              {...register("code")}
              id="reset-code"
              type="text"
              inputMode="numeric"
              placeholder="123456"
              autoComplete="one-time-code"
              aria-invalid={Boolean(errors.code)}
            />
          </label>
          {errors.code && <p className="password-reset-error">{errors.code.message}</p>}

          <button
            className="password-reset-secondary"
            type="button"
            onClick={handleResendCode}
            disabled={isResending}
          >
            {isResending ? t("passwordReset.resending") : t("passwordReset.resendCode")}
          </button>

          <label className="password-reset-field" htmlFor="reset-password">
            <span>{t("passwordReset.newPassword")}</span>
            <div className="password-reset-input-wrap">
              <input
                {...register("password")}
                id="reset-password"
                type={showPassword ? "text" : "password"}
                placeholder="********"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.password)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
              >
                {showPassword ? <FaRegEyeSlash /> : <FaRegEye />}
              </button>
            </div>
          </label>
          {errors.password && <p className="password-reset-error">{errors.password.message}</p>}

          <label className="password-reset-field" htmlFor="reset-confirm-password">
            <span>{t("auth.confirmPassword")}</span>
            <div className="password-reset-input-wrap">
              <input
                {...register("confirmPassword")}
                id="reset-confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="********"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.confirmPassword)}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((current) => !current)}
                aria-label={
                  showConfirmPassword ? t("auth.hideConfirmPassword") : t("auth.showConfirmPassword")
                }
              >
                {showConfirmPassword ? <FaRegEyeSlash /> : <FaRegEye />}
              </button>
            </div>
          </label>
          {errors.confirmPassword && <p className="password-reset-error">{errors.confirmPassword.message}</p>}

          <div className="password-reset-status" aria-live="polite">
            {status.message && (
              <p className={status.type === "success" ? "password-reset-success" : "password-reset-error"}>
                {status.message}
              </p>
            )}
          </div>

          <button className="password-reset-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <ImSpinner2 className="password-reset-spinner" />
                {t("passwordReset.saving")}
              </>
            ) : (
              t("passwordReset.updatePassword")
            )}
          </button>
        </form>

        <Link className="password-reset-link" to="/login">
          {t("passwordReset.backToLogin")}
        </Link>
      </section>
    </main>
  );
}
