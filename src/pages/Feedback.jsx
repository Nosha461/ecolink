import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SupplierProfile, SupplierSidebar } from "../components/SupplierDashboardLayout";
import { getSupplierUser } from "../utils/supplierUser";
import { createReview, deleteReview, getReviews, updateReview } from "../utils/reviewApi";
import { toast } from "react-hot-toast";
import { useI18n } from "../i18n/i18nContext";
import { getApiErrorMessage } from "../utils/apiClient";
import "./Feedback.css";

const RatingSection = ({ image, title, description, rating, onRate, t }) => {
  return (
    <div className="feedback-rating-section">
      <div className="feedback-rating-header">
        <div className="feedback-rating-icon">
          <img src={image} alt="" aria-hidden="true" />
        </div>
        <div className="feedback-rating-text">
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
      <div className="feedback-stars-container">
        <div className="feedback-stars">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className={`star-btn ${star <= rating ? "active" : ""}`}
              onClick={() => onRate(star)}
            >
              <i className={star <= rating ? "bi bi-star-fill" : "bi bi-star"}></i>
            </button>
          ))}
        </div>
        <div className="feedback-stars-labels">
          <span className="star-label">{t("review.poor")}</span>
          <span className="star-label">{t("review.excellent")}</span>
        </div>
      </div>
    </div>
  );
};

export default function Feedback() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const dashboardUser = getSupplierUser();
  const [searchParams] = useSearchParams();
  const [ratings, setRatings] = useState({
    overall: 4,
    quality: 3,
    communication: 2,
  });
  const [recommend, setRecommend] = useState(null);
  const [comment, setComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [editingReviewId, setEditingReviewId] = useState(null);
  const wasteId = searchParams.get("wasteId") || searchParams.get("listingId") || "";
  const factoryId =
    searchParams.get("factoryId") ||
    searchParams.get("supplierId") ||
    searchParams.get("reviewedFactoryId") ||
    "";
  const reviewId = searchParams.get("reviewId") || searchParams.get("rewiewId") || "";

  const fetchReviews = useCallback(async () => {
    try {
      const data = await getReviews({ reviewId, wasteId, factoryId });
      setReviews(data || []);
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("review.loadError"), t));
    }
  }, [factoryId, reviewId, t, wasteId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleRate = (category, value) => {
    setRatings((prev) => ({ ...prev, [category]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!wasteId && !factoryId && !editingReviewId) {
      toast.error(t("review.chooseSupplier"));
      return;
    }

    setIsLoading(true);

    const payload = {
      wasteId,
      factoryId,
      rating: ratings.overall,
      comment: comment || (recommend === "yes" ? "Recommended" : "Not recommended"),
    };

    try {
      if (editingReviewId) {
        await updateReview(editingReviewId, {
          rating: payload.rating,
          comment: payload.comment,
        });
        toast.success(t("review.updateSuccess"));
      } else {
        await createReview(payload);
        toast.success(t("review.sentSuccess"));
        window.setTimeout(() => navigate("/requests"), 900);
      }
      
      setComment("");
      setRecommend(null);
      setEditingReviewId(null);
      fetchReviews();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("review.submitError"), t));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (review) => {
    setEditingReviewId(review._id);
    setRatings((prev) => ({ ...prev, overall: review.rating }));
    setComment(review.comment);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t("review.deleteConfirm"))) return;

    try {
      await deleteReview(id);
      toast.success(t("review.deleteSuccess"));
      fetchReviews();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("review.deleteError"), t));
    }
  };

  return (
    <main className="dashboard-shell">
      <SupplierSidebar />

      <section className="dashboard-content">
        <header className="dashboard-topbar">
          <div>
            <h1>{t("review.title")}</h1>
            <p>{t("review.subtitle")}</p>
          </div>

          <SupplierProfile user={dashboardUser} />
        </header>

        <div className="feedback-container">
          <div className="feedback-left">
            <RatingSection
              image="/assets/good-feedback.png"
              title={t("review.overallRating")}
              description={t("review.overallDescription")}
              rating={ratings.overall}
              onRate={(v) => handleRate("overall", v)}
              t={t}
            />
            <RatingSection
              image="/assets/quality-assurance.png"
              title={t("review.qualityRating")}
              description={t("review.qualityDescription")}
              rating={ratings.quality}
              onRate={(v) => handleRate("quality", v)}
              t={t}
            />
            <RatingSection
              image="/assets/chat.png"
              title={t("review.communicationRating")}
              description={t("review.communicationDescription")}
              rating={ratings.communication}
              onRate={(v) => handleRate("communication", v)}
              t={t}
            />
          </div>

          <div className="feedback-right">
            <div className="feedback-card">
              <h3>{t("review.recommendQuestion")}</h3>
              {!wasteId && !factoryId && !editingReviewId && (
                <p className="feedback-route-note">{t("review.availableAfterPayment")}</p>
              )}
              <div className="recommend-options">
                <label className={`recommend-option ${recommend === "yes" ? "active" : ""}`}>
                  <input
                    type="radio"
                    name="recommend"
                    value="yes"
                    checked={recommend === "yes"}
                    onChange={() => setRecommend("yes")}
                  />
                  <div className="radio-circle"></div>
                  <span>{t("review.yes")}</span>
                </label>
                <label className={`recommend-option ${recommend === "no" ? "active" : ""}`}>
                  <input
                    type="radio"
                    name="recommend"
                    value="no"
                    checked={recommend === "no"}
                    onChange={() => setRecommend("no")}
                  />
                  <div className="radio-circle"></div>
                  <span>{t("review.no")}</span>
                </label>
              </div>

              <h3>{t("review.feedbackOptional")}</h3>
              <textarea
                placeholder={t("review.feedbackPlaceholder")}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />

              <div className="privacy-notice">
                <img src="/assets/quality-assurance.png" alt="" aria-hidden="true" />
                <p>{t("review.privacyNotice")}</p>
              </div>

              <button 
                type="submit" 
                className="feedback-send-btn"
                disabled={isLoading}
                onClick={handleSubmit}
              >
                {isLoading && <img src="/assets/loading.png" alt="" aria-hidden="true" />}
                {isLoading ? t("review.sending") : editingReviewId ? t("review.updateReview") : t("common.send")}
              </button>
            </div>
          </div>
        </div>

        {reviews.length > 0 && (
          <section className="reviews-list-section">
            <h2>{t("review.recentReviews")}</h2>
            <div className="reviews-grid">
              {reviews.map((review) => (
                <div key={review._id} className="review-item-card">
                  <div className="review-item-header">
                    <div className="review-item-stars">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <i key={s} className={`bi ${s <= review.rating ? "bi-star-fill" : "bi-star"}`}></i>
                      ))}
                    </div>
                    <div className="review-item-actions">
                      <button onClick={() => handleEdit(review)} className="edit-btn" title={t("common.edit")}>
                        <i className="bi bi-pencil-square"></i>
                      </button>
                      <button onClick={() => handleDelete(review._id)} className="delete-btn" title={t("review.delete")}>
                        <i className="bi bi-trash-fill"></i>
                      </button>
                    </div>
                  </div>
                  <p className="review-item-comment">{review.comment}</p>
                  <span className="review-item-date">{new Date(review.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
