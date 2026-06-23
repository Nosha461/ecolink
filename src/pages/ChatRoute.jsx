import Chat from "./Chat";
import { SupplierProfile, SupplierSidebar } from "../components/SupplierDashboardLayout";
import TranslatedStaticTextScope from "../components/TranslatedStaticTextScope";
import { useI18n } from "../i18n/i18nContext";
import { getSupplierUser } from "../utils/supplierUser";
import "./Dashboard.css";
import "./PageWrappers.css";

const chatTranslations = {
  text: {
    "Eco Chat": "chat.title",
    "Loading...": "common.loading",
    Send: "common.send",
    "Connecting to chat...": "chat.connecting",
    "Select a conversation to start chatting": "chat.selectConversation",
  },
  attributes: {
    placeholder: {
      Search: "common.search",
      "Type your message": "chat.typeMessage",
    },
    "aria-label": {
      "Back to listings": "common.backToListings",
    },
  },
};

export default function ChatRoute() {
  const dashboardUser = getSupplierUser();
  const { t } = useI18n();

  return (
    <main className="dashboard-shell dashboard-route-shell">
      <SupplierSidebar />
      <section className="dashboard-content dashboard-route-content chat-route-content">
        <header className="dashboard-topbar dashboard-route-topbar">
          <div>
            <h1>{t("chat.title")}</h1>
            <p>{t("chat.subtitle")}</p>
          </div>
          <SupplierProfile user={dashboardUser} />
        </header>

        <TranslatedStaticTextScope translations={chatTranslations}>
          <Chat />
        </TranslatedStaticTextScope>
      </section>
    </main>
  );
}
