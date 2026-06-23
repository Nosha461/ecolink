import { useState } from "react";
import { useI18n } from "../i18n/i18nContext";
import { getApiErrorMessage } from "../utils/apiClient";
import { sendContactMessage } from "../utils/contactApi";
import "./Contact.css";

const CONTACT_ICON_PATH = "/assets/";
const CONTACT_DROPDOWN_ICON_PATH = "/assets/dashboard/";
const SUBJECT_OPTIONS = [
  { value: "Business Partnership", labelKey: "contact.businessPartnership" },
  { value: "General Inquiry", labelKey: "contact.generalInquiry" },
  { value: "Customer Support", labelKey: "contact.customerSupport" },
  { value: "Technical Support", labelKey: "contact.technicalSupport" },
];

function ContactDropdown({ label, options, value, isOpen, onToggle, onSelect, onClose }) {
  const { t } = useI18n();
  const selected = options.find((option) => option.value === value);

  return (
    <div
      className={`contact-dashboard-dropdown ${isOpen ? "open" : ""}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          onClose();
        }
      }}
    >
      <button
        type="button"
        className="contact-dashboard-dropdown-trigger"
        onClick={onToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{selected ? t(selected.labelKey) : label}</span>
        <img src={`${CONTACT_DROPDOWN_ICON_PATH}process.png`} alt="" aria-hidden="true" />
      </button>

      <div className="contact-dashboard-dropdown-menu" role="listbox" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={value === option.value ? "selected" : ""}
            onClick={() => onSelect(option.value)}
            role="option"
            aria-selected={value === option.value}
          >
            <span>{t(option.labelKey)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Contact() {
  const { t } = useI18n();
  const [isSubjectOpen, setIsSubjectOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: "", text: "" });
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "Business Partnership",
    message: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { name, email, subject, message } = formData;
    setStatusMessage({ type: "", text: "" });

    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setStatusMessage({ type: "error", text: t("contact.fillAll") });
      return;
    }

    const emailPattern = /^[^ ]+@[^ ]+\.[a-z]{2,}$/i;
    if (!emailPattern.test(email)) {
      setStatusMessage({ type: "error", text: t("contact.validEmail") });
      return;
    }

    try {
      setIsSubmitting(true);
      await sendContactMessage({ name, email, subject, message });
      setStatusMessage({ type: "success", text: t("contact.sent") });
      setFormData({
        name: "",
        email: "",
        subject: "Business Partnership",
        message: "",
      });
    } catch (error) {
      setStatusMessage({
        type: "error",
        text: getApiErrorMessage(error, t("contact.sendError"), t),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="contact-page">
      <section className="contact-hero">
        <div className="container">
          <div className="row justify-content-center text-center">
            <div className="col-xl-8 col-lg-9">
              <h1 className="hero-title">{t("contact.title")}</h1>
              <p className="hero-subtitle">{t("contact.subtitle")}</p>
            </div>
          </div>

          <div className="row justify-content-center contact-info-row text-center">
            <div className="col-lg-3 col-md-4 col-sm-6 mb-4 mb-md-0">
              <div className="info-item">
                <div className="info-icon">
                  <img src={`${CONTACT_ICON_PATH}location.png`} alt="" aria-hidden="true" />
                </div>
                <h3>{t("contact.location")}</h3>
                <p>{t("contact.cityCountry")}</p>
              </div>
            </div>

            <div className="col-lg-3 col-md-4 col-sm-6 mb-4 mb-md-0">
              <div className="info-item">
                <div className="info-icon">
                  <img src={`${CONTACT_ICON_PATH}phone-call.png`} alt="" aria-hidden="true" />
                </div>
                <h3>{t("contact.callUs")}</h3>
                <p>+20 XXX XXX XXXX</p>
              </div>
            </div>

            <div className="col-lg-3 col-md-4 col-sm-6">
              <div className="info-item">
                <div className="info-icon">
                  <img src={`${CONTACT_ICON_PATH}mail.png`} alt="" aria-hidden="true" />
                </div>
                <h3>{t("contact.emailUs")}</h3>
                <p>ecolink@gmail.com</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="message-section">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-xl-8 col-lg-9">
              <div className="form-visual-wrapper">
                <div className="leaves-cluster d-none d-md-block">
                  <img src="/assets/leafs.png" alt="" className="leaves-image" aria-hidden="true" />
                </div>

                <div className="contact-card">
                  <div className="contact-card-inner">
                    <div className="text-center">
                      <h2 className="form-title">{t("contact.sendMessage")}</h2>
                      <p className="form-subtitle">{t("contact.safeInfo")}</p>
                    </div>

                    <form onSubmit={handleSubmit} noValidate>
                      {statusMessage.text && (
                        <p className={`contact-alert contact-alert-${statusMessage.type}`} aria-live="polite">
                          {statusMessage.text}
                        </p>
                      )}

                      <div className="mb-4">
                        <label htmlFor="name" className="form-label custom-label">{t("contact.name")}</label>
                        <input
                          type="text"
                          className="form-control custom-input"
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                        />
                      </div>

                      <div className="mb-4">
                        <label htmlFor="email" className="form-label custom-label">{t("contact.email")}</label>
                        <input
                          type="email"
                          className="form-control custom-input"
                          id="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                        />
                      </div>

                      <div className="mb-4">
                        <label htmlFor="subject" className="form-label custom-label">{t("contact.subject")}</label>
                        <ContactDropdown
                          label={t("contact.subject")}
                          options={SUBJECT_OPTIONS}
                          value={formData.subject}
                          isOpen={isSubjectOpen}
                          onToggle={() => setIsSubjectOpen((current) => !current)}
                          onClose={() => setIsSubjectOpen(false)}
                          onSelect={(subject) => {
                            setFormData((prev) => ({ ...prev, subject }));
                            setIsSubjectOpen(false);
                          }}
                        />
                      </div>

                      <div className="mb-4">
                        <label htmlFor="message" className="form-label custom-label">{t("contact.message")}</label>
                        <textarea
                          className="form-control custom-textarea"
                          id="message"
                          name="message"
                          rows="6"
                          value={formData.message}
                          onChange={handleChange}
                        />
                      </div>

                      <div className="text-center">
                        <button type="submit" className="btn send-btn" disabled={isSubmitting}>
                          {isSubmitting ? t("contact.sending") : t("common.send")}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="row justify-content-center">
            <div className="col-xl-7 col-lg-8 col-md-10">
              <p className="bottom-note text-center">{t("contact.bottomNote")}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Contact;

