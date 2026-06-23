import { useEffect, useState } from "react";
import { SupplierProfile, SupplierSidebar } from "../components/SupplierDashboardLayout";
import { useI18n } from "../i18n/i18nContext";
import { getApiErrorMessage } from "../utils/apiClient";
import { createCategory, getCategories } from "../utils/categoryApi";
import { getSupplierUser } from "../utils/supplierUser";
import "./Categories.css";
import "./Dashboard.css";

const initialForm = {
  name: "",
  description: "",
};

export default function Categories() {
  const { t } = useI18n();
  const dashboardUser = getSupplierUser();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      setMessage({ type: "", text: "" });
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      setCategories([]);
      setMessage({
        type: "error",
        text: getApiErrorMessage(error, t("categories.loadError"), t),
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadCategories();
  }, []);

  const updateField = (field, value) => {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const name = form.name.trim();
    const description = form.description.trim();

    if (!name) {
      setMessage({
        type: "error",
        text: t("categories.nameRequired"),
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setMessage({ type: "", text: "" });
      const createdCategory = await createCategory({ name, description });
      setForm(initialForm);
      setMessage({
        type: "success",
        text: t("categories.addSuccess"),
      });
      if (createdCategory) {
        setCategories((currentCategories) => [createdCategory, ...currentCategories]);
      } else {
        await loadCategories();
      }
    } catch (error) {
      const refreshedCategories = await getCategories().catch(() => []);
      const existingCategory = refreshedCategories.find(
        (category) => category.name.toLowerCase() === name.toLowerCase()
      );

      if (existingCategory) {
        setCategories(refreshedCategories);
        setForm(initialForm);
        setMessage({
          type: "success",
          text: t("categories.alreadyExists"),
        });
        return;
      }

      setMessage({
        type: "error",
        text: getApiErrorMessage(error, t("categories.addError"), t),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="dashboard-shell categories-shell">
      <SupplierSidebar />

      <section className="categories-content">
        <header className="dashboard-topbar categories-topbar">
          <div>
            <h1>{t("categories.title")}</h1>
            <p>{t("categories.subtitle")}</p>
          </div>

          <SupplierProfile user={dashboardUser} />
        </header>

        {message.text && (
          <p className={`categories-alert categories-alert-${message.type}`}>
            {message.text}
          </p>
        )}

        <section className="categories-layout">
          <form className="categories-form" onSubmit={handleSubmit}>
            <h2>{t("categories.addTitle")}</h2>

            <label>
              <span>{t("categories.name")}</span>
              <input
                type="text"
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder={t("categories.namePlaceholder")}
              />
            </label>

            <label>
              <span>{t("categories.description")}</span>
              <textarea
                value={form.description}
                onChange={(event) => updateField("description", event.target.value)}
                placeholder={t("categories.descriptionPlaceholder")}
              />
            </label>

            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("categories.adding") : t("categories.addButton")}
            </button>
          </form>

          <section className="categories-list" aria-live="polite">
            <div className="categories-list-header">
              <h2>{t("categories.listTitle")}</h2>
              {isLoading && <span>{t("common.loading")}</span>}
            </div>

            {!isLoading && categories.length === 0 ? (
              <p className="categories-empty">
                {t("categories.empty")}
              </p>
            ) : (
              <div className="categories-grid">
                {categories.map((category) => (
                  <article className="category-row" key={category._id}>
                    <div>
                      <h3>{category.name}</h3>
                      {category.description && <p>{category.description}</p>}
                    </div>
                    <code>{category._id}</code>
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>
      </section>
    </main>
  );
}
