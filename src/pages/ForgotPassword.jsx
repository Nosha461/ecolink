import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImSpinner2 } from "react-icons/im";
import { getApiErrorMessage } from "../utils/apiClient";
import { requestPasswordReset } from "../utils/authApi";
import { useI18n } from "../i18n/i18nContext";
import "./PasswordReset.css";

function createForgotPasswordSchema(t) {
  return z.object({
    email: z.string().trim().min(1, t("auth.emailRequired")).email(t("auth.validEmail")),
  });
}

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: { email: "" },
    resolver: zodResolver(createForgotPasswordSchema(t)),
  });

  const onSubmit = async (values) => {
    try {
      setIsSubmitting(true);
      setStatus({ type: "", message: "" });
      await requestPasswordReset(values.email.trim());
      setStatus({ type: "success", message: t("passwordReset.forgotSuccess") });
      window.setTimeout(() => {
        navigate(`/reset-password?email=${encodeURIComponent(values.email.trim())}`);
      }, 900);
    } catch (error) {
      setStatus({
        type: "error",
        message: getApiErrorMessage(error, t("passwordReset.forgotError"), t),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="password-reset-page">
      <div className="password-reset-map" aria-hidden="true" />

      <section className="password-reset-card" aria-labelledby="forgot-password-title">
        <p className="password-reset-kicker">{t("passwordReset.forgotKicker")}</p>
        <h1 id="forgot-password-title">{t("passwordReset.forgotTitle")}</h1>
        <p className="password-reset-copy">{t("passwordReset.forgotCopy")}</p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <label className="password-reset-field" htmlFor="forgot-email">
            <span>{t("auth.email")}</span>
            <input
              {...register("email")}
              id="forgot-email"
              type="email"
              placeholder="example@email.com"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
            />
          </label>
          {errors.email && <p className="password-reset-error">{errors.email.message}</p>}

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
                {t("passwordReset.sending")}
              </>
            ) : (
              t("passwordReset.sendReset")
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
