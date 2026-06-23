import { SupplierProfile, SupplierSidebar } from "../components/SupplierDashboardLayout";
import ListingForm from "../components/ListingForm";
import { useI18n } from "../i18n/i18nContext";
import { getSupplierUser } from "../utils/supplierUser";
import "./Dashboard.css";
import "./Listing.css";

export default function Listing() {
  const supplierUser = getSupplierUser();
  const { t } = useI18n();

  return (
    <main className="dashboard-shell listing-shell">
      <SupplierSidebar />

      <section className="listing-content">
        <header className="listing-topbar">
          <div>
            <p className="listing-greeting">{t("dashboard.welcome", { name: supplierUser.firstName })}</p>
            <h1>{t("listing.createTitle")}</h1>
            <p className="listing-subtitle">{t("listing.createSubtitle")}</p>
          </div>

          <SupplierProfile user={supplierUser} />
        </header>

        <ListingForm mode="create" />
      </section>
    </main>
  );
}

