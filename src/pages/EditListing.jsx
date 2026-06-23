import { useLocation, useParams, useSearchParams } from "react-router-dom";
import { SupplierProfile, SupplierSidebar } from "../components/SupplierDashboardLayout";
import ListingForm from "../components/ListingForm";
import { useI18n } from "../i18n/i18nContext";
import { getSupplierUser } from "../utils/supplierUser";
import "./Listing.css";

export default function EditListing() {
  const supplierUser = getSupplierUser();
  const { t } = useI18n();
  const location = useLocation();
  const { listingId: routeListingId } = useParams();
  const [searchParams] = useSearchParams();
  const listingId = routeListingId || searchParams.get("id") || location.state?.listingId || "";
  const initialListing = location.state?.listing || null;

  return (
    <main className="dashboard-shell listing-shell">
      <SupplierSidebar />

      <section className="listing-content">
        <header className="listing-topbar">
          <div>
            <p className="listing-greeting">{t("dashboard.welcome", { name: supplierUser.firstName })}</p>
            <h1>{t("listing.editTitle")}</h1>
            <p className="listing-subtitle">{t("listing.editSubtitle")}</p>
          </div>

          <SupplierProfile user={supplierUser} />
        </header>

        <ListingForm mode="edit" listingId={listingId} initialListing={initialListing} />
      </section>
    </main>
  );
}
