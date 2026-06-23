import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SupplierProfile, SupplierSidebar } from "../components/SupplierDashboardLayout";
import { useI18n } from "../i18n/i18nContext";
import { getSupplierUser } from "../utils/supplierUser";
import {
  getDashboardStats,
  listUsers,
  blockUser,
  unblockUser,
  deleteUser,
  listListings,
  deleteListing,
  listCommissions,
  listCompletedDeals,
  listPayments,
} from "../utils/adminApi";
import { resolveUploadedImageUrl } from "../utils/listingApi";
import "./Dashboard.css";
import "./AdminDashboard.css";

const adminWorkflow = [
  { key: "login", image: "/assets/quality-assurance.png", status: "completed" },
  { key: "verify", image: "/assets/good-feedback.png", status: "completed" },
  { key: "load", image: "/assets/loading.png", status: "completed" },
  { key: "review", image: "/assets/procurement.png", status: "active" },
  { key: "action", image: "/assets/healthy.png", status: "pending" },
  { key: "notify", image: "/assets/chat.png", status: "pending" },
];

function getAdminListingImage(item) {
  const image =
    (Array.isArray(item?.images) ? item.images[0] : item?.images) ||
    item?.image ||
    item?.imageUrl ||
    item?.thumbnail ||
    item?.photo;

  return resolveUploadedImageUrl(image, item);
}

function getAdminListingId(item) {
  return item?._id || item?.id || item?.listingId || item?.wasteId || "";
}

function isVisibleAdminListing(item) {
  const status = String(item?.status || "").trim().toLowerCase();
  return status !== "archived" && status !== "removed" && status !== "deleted";
}

export default function AdminDashboard() {
  const { t, optionLabel } = useI18n();
  const navigate = useNavigate();

  const adminUser = {
    ...getSupplierUser(),
    role: "Admin",
    fullName: getSupplierUser().fullName === "EcoLink User" ? t("adminDashboard.adminName") : getSupplierUser().fullName,
    firstName: getSupplierUser().firstName === "EcoLink" ? t("adminDashboard.adminFirstName") : getSupplierUser().firstName,
  };

  // State Management
  const [stats, setStats] = useState({ totalUsers: 0, totalListings: 0, completedDeals: 0 });
  const [activeModule, setActiveModule] = useState("users");

  // Lists
  const [users, setUsers] = useState([]);
  const [listings, setListings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [deals, setDeals] = useState([]);

  // Pagination for each
  const [userPage, setUserPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [userFilterBlocked, setUserFilterBlocked] = useState("all"); // 'all', 'blocked', 'active'

  const [listingPage, setListingPage] = useState(1);
  const [listingTotalPages, setListingTotalPages] = useState(1);

  const [paymentPage, setPaymentPage] = useState(1);
  const [paymentTotalPages, setPaymentTotalPages] = useState(1);

  const [commissionPage, setCommissionPage] = useState(1);
  const [commissionTotalPages, setCommissionTotalPages] = useState(1);
  const [commissionSummary, setCommissionSummary] = useState({ totalCommissions: 0, totalCommissionAmount: 0, totalPaymentVolume: 0 });

  const [dealPage, setDealPage] = useState(1);
  const [dealTotalPages, setDealTotalPages] = useState(1);

  // Loading, Errors, and Actions Feedback
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Confirmation Dialogue State
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    title: "",
    message: "",
    onConfirm: null,
  });

  // Load General Overview Stats
  const loadStats = async () => {
    try {
      const res = await getDashboardStats();
      if (res?.success && res?.data) {
        setStats(res.data);
      } else if (res?.totalUsers !== undefined) {
        setStats(res);
      }
    } catch (err) {
      console.error(t("adminDashboard.console.loadStatsError"), err);
    }
  };

  // Specific loading functions
  const loadUsers = async (page = userPage, isBlocked = userFilterBlocked) => {
    setLoading(true);
    setError("");
    try {
      const filterBlocked = isBlocked === "blocked" ? true : isBlocked === "active" ? false : undefined;
      const res = await listUsers({ page, limit: 10, isBlocked: filterBlocked });
      if (res?.success) {
        setUsers(res.data || []);
        setUserTotalPages(res.pagination?.pages || 1);
        setUserPage(res.pagination?.page || 1);
      } else {
        setUsers([]);
      }
    } catch {
      setError(t("adminDashboard.console.usersLoadError"));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadListings = async (page = listingPage) => {
    setLoading(true);
    setError("");
    try {
      const res = await listListings({ page, limit: 10 });
      if (res?.success) {
        setListings((res.data || []).filter(isVisibleAdminListing));
        setListingTotalPages(res.pagination?.pages || 1);
        setListingPage(res.pagination?.page || 1);
      } else {
        setListings([]);
      }
    } catch {
      setError(t("adminDashboard.console.listingsLoadError"));
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPayments = async (page = paymentPage) => {
    setLoading(true);
    setError("");
    try {
      const res = await listPayments({ page, limit: 10 });
      if (res?.success) {
        setPayments(res.data || []);
        setPaymentTotalPages(res.pagination?.pages || 1);
        setPaymentPage(res.pagination?.page || 1);
      } else {
        setPayments([]);
      }
    } catch {
      setError(t("adminDashboard.console.paymentsLoadError"));
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCommissions = async (page = commissionPage) => {
    setLoading(true);
    setError("");
    try {
      const res = await listCommissions({ page, limit: 10 });
      if (res?.success && res.data) {
        setCommissions(res.data.commissions || []);
        setCommissionTotalPages(res.data.pagination?.pages || res.pagination?.pages || 1);
        setCommissionPage(res.data.pagination?.page || res.pagination?.page || 1);
        setCommissionSummary({
          totalCommissions: res.data.totalCommissions ?? 0,
          totalCommissionAmount: res.data.totalCommissionAmount ?? 0,
          totalPaymentVolume: res.data.totalPaymentVolume ?? 0,
        });
      } else {
        setCommissions([]);
      }
    } catch {
      setError(t("adminDashboard.console.commissionsLoadError"));
      setCommissions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCompletedDeals = async (page = dealPage) => {
    setLoading(true);
    setError("");
    try {
      const res = await listCompletedDeals({ page, limit: 10 });
      if (res?.success) {
        setDeals(res.data || []);
        setDealTotalPages(res.pagination?.pages || 1);
        setDealPage(res.pagination?.page || 1);
      } else {
        setDeals([]);
      }
    } catch {
      setError(t("adminDashboard.console.dealsLoadError"));
      setDeals([]);
    } finally {
      setLoading(false);
    }
  };

  // Reload triggers
  useEffect(() => {
    loadStats();
    // Pre-load commission summary to render dynamic total EGP card on hero
    listCommissions({ page: 1, limit: 1 }).then(res => {
      if (res?.success && res.data) {
        setCommissionSummary(prev => ({
          ...prev,
          totalCommissionAmount: res.data.totalCommissionAmount ?? 0
        }));
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeModule === "users") {
      loadUsers(userPage, userFilterBlocked);
    } else if (activeModule === "listings") {
      loadListings(listingPage);
    } else if (activeModule === "payments") {
      loadPayments(paymentPage);
    } else if (activeModule === "commissions") {
      loadCommissions(commissionPage);
    } else if (activeModule === "deals") {
      loadCompletedDeals(dealPage);
    }
  }, [activeModule, userPage, userFilterBlocked, listingPage, paymentPage, commissionPage, dealPage]);

  // Timed dismiss notifications
  useEffect(() => {
    if (successMessage) {
      const t = setTimeout(() => setSuccessMessage(""), 5000);
      return () => clearTimeout(t);
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(""), 6000);
      return () => clearTimeout(t);
    }
  }, [error]);

  // Admin Actions Handling
  const triggerBlockUser = (userId, fullName) => {
    setConfirmModal({
      open: true,
      title: t("adminDashboard.console.blockUserTitle"),
      message: t("adminDashboard.console.blockUserConfirm", { name: fullName }),
      onConfirm: async () => {
        setActionLoading(true);
        setConfirmModal(prev => ({ ...prev, open: false }));
        try {
          const res = await blockUser(userId);
          if (res?.success) {
            setSuccessMessage(res.message || t("adminDashboard.console.blockUserSuccess"));
            loadUsers(userPage, userFilterBlocked);
            loadStats();
          }
        } catch (err) {
          setError(err?.response?.data?.message || t("adminDashboard.console.blockUserError"));
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  const triggerUnblockUser = (userId, fullName) => {
    setConfirmModal({
      open: true,
      title: t("adminDashboard.console.unblockUserTitle"),
      message: t("adminDashboard.console.unblockUserConfirm", { name: fullName }),
      onConfirm: async () => {
        setActionLoading(true);
        setConfirmModal(prev => ({ ...prev, open: false }));
        try {
          const res = await unblockUser(userId);
          if (res?.success) {
            setSuccessMessage(res.message || t("adminDashboard.console.unblockUserSuccess"));
            loadUsers(userPage, userFilterBlocked);
            loadStats();
          }
        } catch (err) {
          setError(err?.response?.data?.message || t("adminDashboard.console.unblockUserError"));
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  const triggerDeleteUser = (userId, fullName) => {
    setConfirmModal({
      open: true,
      title: t("adminDashboard.console.deleteUserTitle"),
      message: t("adminDashboard.console.deleteUserConfirm", { name: fullName }),
      onConfirm: async () => {
        setActionLoading(true);
        setConfirmModal(prev => ({ ...prev, open: false }));
        try {
          const res = await deleteUser(userId);
          if (res?.success) {
            setSuccessMessage(res.message || t("adminDashboard.console.deleteUserSuccess"));
            loadUsers(userPage, userFilterBlocked);
            loadStats();
          }
        } catch (err) {
          setError(err?.response?.data?.message || t("adminDashboard.console.deleteUserError"));
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  const triggerDeleteListing = (listingId, title) => {
    setConfirmModal({
      open: true,
      title: t("adminDashboard.console.removeListingTitle"),
      message: t("adminDashboard.console.removeListingConfirm", { title }),
      onConfirm: async () => {
        setActionLoading(true);
        setConfirmModal(prev => ({ ...prev, open: false }));
        try {
          const res = await deleteListing(listingId);
          if (res?.success) {
            setSuccessMessage(res.message || t("adminDashboard.console.removeListingSuccess"));
            loadListings(listingPage);
            loadStats();
          }
        } catch (err) {
          setError(err?.response?.data?.message || t("adminDashboard.console.removeListingError"));
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  const handleModuleCardSelect = (moduleKey, href) => {
    if (href) {
      navigate(href);
      return;
    }
    setActiveModule(moduleKey);
    const consoleElement = document.getElementById("admin-queue");
    if (consoleElement) {
      consoleElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleManualRefresh = () => {
    loadStats();
    if (activeModule === "users") loadUsers(userPage, userFilterBlocked);
    if (activeModule === "listings") loadListings(listingPage);
    if (activeModule === "payments") loadPayments(paymentPage);
    if (activeModule === "commissions") loadCommissions(commissionPage);
    if (activeModule === "deals") loadCompletedDeals(dealPage);
  };

  // Pagination Renderer Helper
  const renderPagination = (currentPage, totalPages, setPage) => {
    if (totalPages <= 1) return null;
    return (
      <div className="admin-pagination">
        <button
          type="button"
          disabled={currentPage === 1}
          onClick={() => setPage(p => Math.max(1, p - 1))}
        >
          &larr; {t("common.prev")}
        </button>
        <span>{t("common.pageOf", { page: currentPage, total: totalPages })}</span>
        <button
          type="button"
          disabled={currentPage === totalPages}
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
        >
          {t("common.next")} &rarr;
        </button>
      </div>
    );
  };

  // Interactive Dynamic Modules Definitions
  const adminModules = [
    { key: "users", image: "/assets/quality-assurance.png", module: "users" },
    { key: "listings", image: "/assets/recycling.png", module: "listings" },
    { key: "payments", image: "/assets/procurement.png", module: "payments" },
    { key: "commissions", image: "/assets/planet-earth.png", module: "commissions" },
    { key: "deals", image: "/assets/worksheet.png", module: "deals" },
    { key: "notifications", image: "/assets/chat.png", href: "/notifications" },
  ];

  const adminStatsCards = [
    { key: "users", image: "/assets/quality-assurance.png", value: stats.totalUsers?.toLocaleString() || "3", tone: "green" },
    { key: "listings", image: "/assets/recycling.png", value: stats.totalListings?.toLocaleString() || "0", tone: "mint" },
    { key: "requests", image: "/assets/worksheet.png", value: stats.completedDeals?.toLocaleString() || "0", tone: "amber" },
    { key: "reports", image: "/assets/good-feedback.png", value: commissionSummary.totalCommissionAmount ? `${commissionSummary.totalCommissionAmount?.toLocaleString()} EGP` : "400M EGP", tone: "red" },
  ];

  return (
    <main className="dashboard-shell admin-dashboard-shell">
      <SupplierSidebar />

      <section className="dashboard-content admin-dashboard-content">
        <header className="dashboard-topbar admin-dashboard-topbar">
          <div>
            <span className="admin-eyebrow">{t("adminDashboard.eyebrow")}</span>
            <h1>{t("adminDashboard.title")}</h1>
            <p>{t("adminDashboard.subtitle")}</p>
          </div>

          <SupplierProfile user={adminUser} />
        </header>

        {/* Global Notifications and Action Feedback toasts */}
        {successMessage && (
          <div className="admin-toast admin-toast-success" role="alert">
            <i className="bi bi-check-circle-fill"></i>
            <span>{successMessage}</span>
          </div>
        )}
        {error && (
          <div className="admin-toast admin-toast-error" role="alert">
            <i className="bi bi-exclamation-triangle-fill"></i>
            <span>{error}</span>
          </div>
        )}
        {actionLoading && (
          <div className="admin-toast admin-toast-info">
            <span className="admin-spinner-inline"></span>
            <span>{t("adminDashboard.console.toastExecuting")}</span>
          </div>
        )}

        <section className="admin-hero-panel" aria-label={t("adminDashboard.overview")}>
          <div className="admin-hero-copy">
            <h2>{t("adminDashboard.flowTitle")}</h2>
            <p>{t("adminDashboard.flowSubtitle")}</p>
            <div className="admin-hero-actions">
              <a href="#admin-queue">{t("adminDashboard.reviewQueue")}</a>
              <a href="#admin-modules">{t("adminDashboard.manageModules")}</a>
            </div>
          </div>

          <div className="admin-flow-card">
            {adminWorkflow.map((step, index) => (
              <article className={`admin-flow-step admin-flow-step-${step.status}`} key={step.key}>
                <span className="admin-flow-icon">
                  <img src={step.image} alt="" aria-hidden="true" />
                </span>
                <div>
                  <strong>{t(`adminDashboard.workflow.${step.key}.title`)}</strong>
                  <p>{t(`adminDashboard.workflow.${step.key}.body`)}</p>
                </div>
                {index < adminWorkflow.length - 1 && <span className="admin-flow-line" aria-hidden="true" />}
              </article>
            ))}
          </div>
        </section>

        <section className="admin-stats-grid" aria-label={t("adminDashboard.metrics")}>
          {adminStatsCards.map((stat) => (
            <article className={`admin-stat-card admin-stat-card-${stat.tone}`} key={stat.key}>
              <span>
                <img src={stat.image} alt="" aria-hidden="true" />
              </span>
              <div>
                <strong>{stat.value}</strong>
                <p>{t(`adminDashboard.stats.${stat.key}`)}</p>
              </div>
            </article>
          ))}
        </section>

        <div className="admin-dashboard-grid">
          {/* Main Moderation & Ledger Center */}
          <section className="admin-panel" id="admin-queue">
            <div className="admin-panel-heading">
              <div>
                <h2>
                  {activeModule === "users" && t("adminDashboard.console.userDirectory")}
                  {activeModule === "listings" && t("adminDashboard.console.listingModeration")}
                  {activeModule === "payments" && t("adminDashboard.console.paymentAudit")}
                  {activeModule === "commissions" && t("adminDashboard.console.commissionFees")}
                  {activeModule === "deals" && t("adminDashboard.console.completedDeals")}
                </h2>
                <p>
                  {activeModule === "users" && t("adminDashboard.console.userDesc")}
                  {activeModule === "listings" && t("adminDashboard.console.listingDesc")}
                  {activeModule === "payments" && t("adminDashboard.console.paymentDesc")}
                  {activeModule === "commissions" && t("adminDashboard.console.commissionDesc")}
                  {activeModule === "deals" && t("adminDashboard.console.completedDesc")}
                </p>
              </div>
              <button type="button" onClick={handleManualRefresh}>
                {t("adminDashboard.refresh") || "Refresh"}
              </button>
            </div>

            {/* Sub-tabs header for premium immediate navigation inside panel */}
            <div className="admin-sub-tabs">
              <button
                type="button"
                className={activeModule === "users" ? "active" : ""}
                onClick={() => { setActiveModule("users"); setUserPage(1); }}
              >
                {t("adminDashboard.console.users")}
              </button>
              <button
                type="button"
                className={activeModule === "listings" ? "active" : ""}
                onClick={() => { setActiveModule("listings"); setListingPage(1); }}
              >
                {t("adminDashboard.console.listings")}
              </button>
              <button
                type="button"
                className={activeModule === "payments" ? "active" : ""}
                onClick={() => { setActiveModule("payments"); setPaymentPage(1); }}
              >
                {t("adminDashboard.console.payments")}
              </button>
              <button
                type="button"
                className={activeModule === "commissions" ? "active" : ""}
                onClick={() => { setActiveModule("commissions"); setCommissionPage(1); }}
              >
                {t("adminDashboard.console.commissions")}
              </button>
              <button
                type="button"
                className={activeModule === "deals" ? "active" : ""}
                onClick={() => { setActiveModule("deals"); setDealPage(1); }}
              >
                {t("adminDashboard.console.deals")}
              </button>
            </div>

            {/* List/Table Dynamic Content */}
            <div className="admin-dynamic-content" style={{ marginTop: "24px" }}>
              {loading ? (
                <div className="admin-loading-container">
                  <div className="admin-spinner"></div>
                  <p>{t("adminDashboard.console.retrieving")}</p>
                </div>
              ) : (
                <>
                  {activeModule === "users" && (
                    <div className="admin-table-container">
                      <div className="admin-table-filter">
                        <label htmlFor="user-status-filter">{t("adminDashboard.console.statusFilter")}</label>
                        <select
                          id="user-status-filter"
                          value={userFilterBlocked}
                          onChange={(e) => { setUserFilterBlocked(e.target.value); setUserPage(1); }}
                        >
                          <option value="all">{t("adminDashboard.console.allUsers")}</option>
                          <option value="active">{t("adminDashboard.console.activeOnly")}</option>
                          <option value="blocked">{t("adminDashboard.console.blockedOnly")}</option>
                        </select>
                      </div>
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>{t("adminDashboard.console.userDetails")}</th>
                            <th>{t("adminDashboard.console.email")}</th>
                            <th>{t("adminDashboard.console.phone")}</th>
                            <th>{t("adminDashboard.console.roles")}</th>
                            <th>{t("adminDashboard.console.blockedStatus")}</th>
                            <th>{t("adminDashboard.console.actions")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.length === 0 ? (
                            <tr>
                              <td colSpan="6" className="text-center">{t("adminDashboard.console.noUsers")}</td>
                            </tr>
                          ) : (
                            users.map((user) => (
                              <tr key={user.id || user._id}>
                                <td>
                                  <div className="admin-user-cell">
                                    <strong>{user.fullName || `${user.firstName} ${user.lastName}`}</strong>
                                    {user.isAdmin && <span className="admin-role-badge-admin">{t("common.admin")}</span>}
                                  </div>
                                </td>
                                <td>{user.email}</td>
                                <td>{user.phoneNumber || "-"}</td>
                                <td>
                                  {user.roles?.map((role) => (
                                    <span key={role._id} className={`admin-role-badge-pill ${role.isActive ? 'active' : 'inactive'}`}>
                                      {optionLabel(role.type)}
                                    </span>
                                  )) || optionLabel(user.activeRole) || "-"}
                                </td>
                                <td>
                                  <span className={`admin-blocked-pill ${user.isBlocked ? 'blocked' : 'active'}`}>
                                    {user.isBlocked ? t("adminDashboard.console.blocked") : t("adminDashboard.console.active")}
                                  </span>
                                </td>
                                <td>
                                  <div className="admin-action-row">
                                    {user.isBlocked ? (
                                      <button
                                        type="button"
                                        className="btn-action btn-unblock"
                                        onClick={() => triggerUnblockUser(user.id || user._id, user.fullName || user.email)}
                                      >
                                        {t("adminDashboard.console.unblock")}
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        className="btn-action btn-block"
                                        onClick={() => triggerBlockUser(user.id || user._id, user.fullName || user.email)}
                                      >
                                        {t("adminDashboard.console.block")}
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      className="btn-action btn-delete"
                                      onClick={() => triggerDeleteUser(user.id || user._id, user.fullName || user.email)}
                                    >
                                      {t("adminDashboard.console.delete")}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                      {renderPagination(userPage, userTotalPages, setUserPage)}
                    </div>
                  )}

                  {activeModule === "listings" && (
                    <div className="admin-table-container">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>{t("adminDashboard.console.wasteTitle")}</th>
                            <th>{t("adminDashboard.console.category")}</th>
                            <th>{t("adminDashboard.console.quantity")}</th>
                            <th>{t("adminDashboard.console.price")}</th>
                            <th>{t("adminDashboard.console.factoryUser")}</th>
                            <th>{t("adminDashboard.console.actions")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {listings.length === 0 ? (
                            <tr>
                              <td colSpan="6" className="text-center">{t("adminDashboard.console.noListings")}</td>
                            </tr>
                          ) : (
                            listings.map((item) => (
                              <tr key={getAdminListingId(item)}>
                                <td>
                                  <div className="admin-item-cell">
                                    {getAdminListingImage(item) && (
                                      <img src={getAdminListingImage(item)} alt="" className="admin-item-preview" />
                                    )}
                                    <strong>{item.title}</strong>
                                  </div>
                                </td>
                                <td>{item.category?.name || item.category || t("adminDashboard.console.generalCategory")}</td>
                                <td>{item.quantity?.toLocaleString()} {optionLabel(item.unit)}</td>
                                <td>{item.price?.toLocaleString()} {item.currency}</td>
                                <td>
                                  <strong>{item.factory?.name || t("adminDashboard.console.factoryPartner")}</strong>
                                  <div style={{ fontSize: "11px", color: "#667085" }}>{item.factory?.user?.email}</div>
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    className="btn-action btn-delete"
                                    onClick={() => triggerDeleteListing(getAdminListingId(item), item.title)}
                                    disabled={!getAdminListingId(item)}
                                  >
                                    {t("adminDashboard.console.remove")}
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                      {renderPagination(listingPage, listingTotalPages, setListingPage)}
                    </div>
                  )}

                  {activeModule === "payments" && (
                    <div className="admin-table-container">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>{t("adminDashboard.console.transactionId")}</th>
                            <th>{t("adminDashboard.console.method")}</th>
                            <th>{t("adminDashboard.console.amountPaid")}</th>
                            <th>{t("adminDashboard.console.paymentStatus")}</th>
                            <th>{t("adminDashboard.console.buyer")}</th>
                            <th>{t("adminDashboard.console.seller")}</th>
                            <th>{t("adminDashboard.console.wasteTitle")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payments.length === 0 ? (
                            <tr>
                              <td colSpan="7" className="text-center">{t("adminDashboard.console.noPayments")}</td>
                            </tr>
                          ) : (
                            payments.map((p) => (
                              <tr key={p._id}>
                                <td><code>{p.transactionId || p._id}</code></td>
                                <td><span className="admin-pay-method-badge">{p.method}</span></td>
                                <td><strong>{p.amount?.toLocaleString()} {p.currency}</strong></td>
                                <td>
                                  <span className={`admin-payment-status-badge ${p.status}`}>
                                    {p.status}
                                  </span>
                                </td>
                                <td>{p.order?.buyer?.name || "-"}</td>
                                <td>{p.order?.seller?.name || "-"}</td>
                                <td>
                                  <strong>{p.order?.waste?.title || t("payment.orderSummary")}</strong>
                                  <div style={{ fontSize: "11px", color: "#667085" }}>
                                    {t("adminDashboard.console.quantityAtPrice", {
                                      quantity: p.order?.quantity || 0,
                                      price: p.order?.unitPrice?.toLocaleString() || 0,
                                    })}
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                      {renderPagination(paymentPage, paymentTotalPages, setPaymentPage)}
                    </div>
                  )}

                  {activeModule === "commissions" && (
                    <div className="admin-table-container">
                      <div className="admin-commissions-grid">
                        <div className="commissions-stat-box">
                          <span>{t("adminDashboard.console.totalVol")}</span>
                          <strong>{commissionSummary.totalPaymentVolume?.toLocaleString()} EGP</strong>
                        </div>
                        <div className="commissions-stat-box">
                          <span>{t("adminDashboard.console.commRev")}</span>
                          <strong>{commissionSummary.totalCommissionAmount?.toLocaleString()} EGP</strong>
                        </div>
                        <div className="commissions-stat-box">
                          <span>{t("adminDashboard.console.commCount")}</span>
                          <strong>{commissionSummary.totalCommissions} {t("adminDashboard.console.collected")}</strong>
                        </div>
                      </div>
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>{t("adminDashboard.console.commissionId")}</th>
                            <th>{t("adminDashboard.console.orderId")}</th>
                            <th>{t("adminDashboard.console.amount")}</th>
                            <th>{t("adminDashboard.console.rate")}</th>
                            <th>{t("adminDashboard.console.collectedComm")}</th>
                            <th>{t("adminDashboard.console.dateCollected")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {commissions.length === 0 ? (
                            <tr>
                              <td colSpan="6" className="text-center">{t("adminDashboard.console.noCommissions")}</td>
                            </tr>
                          ) : (
                            commissions.map((c) => (
                              <tr key={c._id}>
                                <td><code>{c._id}</code></td>
                                <td><code>{c.order?._id || c.order}</code></td>
                                <td>{c.paymentAmount?.toLocaleString() || c.order?.totalAmount?.toLocaleString()} {c.currency}</td>
                                <td>{((c.rate || 0.1) * 100).toFixed(1)}%</td>
                                <td><strong>{c.amount?.toLocaleString()} {c.currency}</strong></td>
                                <td>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "-"}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                      {renderPagination(commissionPage, commissionTotalPages, setCommissionPage)}
                    </div>
                  )}

                  {activeModule === "deals" && (
                    <div className="admin-table-container">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>{t("adminDashboard.console.dealId")}</th>
                            <th>{t("adminDashboard.console.orderId")}</th>
                            <th>{t("adminDashboard.console.deliveryStatus")}</th>
                            <th>{t("adminDashboard.console.payRef")}</th>
                            <th>{t("adminDashboard.console.compDate")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {deals.length === 0 ? (
                            <tr>
                              <td colSpan="5" className="text-center">{t("adminDashboard.console.noDeals")}</td>
                            </tr>
                          ) : (
                            deals.map((d) => (
                              <tr key={d._id}>
                                <td><code>{d._id}</code></td>
                                <td><code>{d.order}</code></td>
                                <td>
                                  <span className="admin-status admin-status-completed">
                                    {d.status}
                                  </span>
                                </td>
                                <td><code>{d.payment || t("requests.status.available")}</code></td>
                                <td>{d.completedAt ? new Date(d.completedAt).toLocaleString() : new Date(d.createdAt).toLocaleString()}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                      {renderPagination(dealPage, dealTotalPages, setDealPage)}
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          {/* Module Links & Direct Navigation panel */}
          <section className="admin-panel admin-modules-panel" id="admin-modules">
            <div className="admin-panel-heading">
              <div>
                <h2>{t("adminDashboard.modulesTitle")}</h2>
                <p>{t("adminDashboard.modulesSubtitle")}</p>
              </div>
            </div>

            <div className="admin-module-grid">
              {adminModules.map((module) => (
                <button
                  type="button"
                  key={module.key}
                  onClick={() => handleModuleCardSelect(module.module, module.href)}
                  className={`admin-module-card ${activeModule === module.module ? 'active' : ''}`}
                  style={{ border: activeModule === module.module ? "1.5px solid #006c35" : "", cursor: "pointer", width: "100%", textAlign: "left", background: "none" }}
                >
                  <img src={module.image} alt="" aria-hidden="true" />
                  <span>{t(`adminDashboard.modules.${module.key}`)}</span>
                  <i className="bi bi-chevron-right" aria-hidden="true" />
                </button>
              ))}
            </div>
          </section>
        </div>

        <section className="admin-audit-panel" id="admin-reports">
          <div>
            <h2>{t("adminDashboard.auditTitle")}</h2>
            <p>{t("adminDashboard.auditSubtitle")}</p>
          </div>
          <Link to="/notifications">{t("adminDashboard.openNotifications")}</Link>
        </section>
      </section>

      {/* Confirmation Modal */}
      {confirmModal.open && (
        <div className="admin-modal-overlay" onClick={() => setConfirmModal(prev => ({ ...prev, open: false }))}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="admin-modal-title">{confirmModal.title}</h3>
            <p className="admin-modal-message">{confirmModal.message}</p>
            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-modal-btn admin-modal-btn-cancel"
                onClick={() => setConfirmModal(prev => ({ ...prev, open: false }))}
              >
                {t("adminDashboard.console.cancel")}
              </button>
              <button
                type="button"
                className="admin-modal-btn admin-modal-btn-confirm"
                onClick={confirmModal.onConfirm}
              >
                {t("adminDashboard.console.confirmAction")}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
