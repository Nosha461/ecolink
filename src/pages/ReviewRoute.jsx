import { Toaster } from "react-hot-toast";
import Feedback from "./Feedback";
import TranslatedStaticTextScope from "../components/TranslatedStaticTextScope";
import "./PageWrappers.css";

const reviewTranslations = {
  text: {
    "Rate Your Experience": "review.title",
    "Your feedback helps improve supplier performance and service quality": "review.subtitle",
    "Overall Rating": "review.overallRating",
    "How satisfied are you overall?": "review.overallDescription",
    "Quality of Material": "review.qualityRating",
    "Rate the quality of materials received": "review.qualityDescription",
    Communication: "review.communicationRating",
    "How was the communication with the supplier?": "review.communicationDescription",
    Poor: "review.poor",
    Excellent: "review.excellent",
    "would you recommend this supplier?": "review.recommendQuestion",
    Yes: "review.yes",
    No: "review.no",
    "Your Feedback (optional)": "review.feedbackOptional",
    "Your feedback is private and used only to improve our platform and supplier performance":
      "review.privacyNotice",
    Sending: "review.sending",
    "Sending...": "review.sending",
    "Update Review": "review.updateReview",
    Send: "common.send",
    "Your Recent Reviews": "review.recentReviews",
  },
  attributes: {
    placeholder: {
      "What did you like or dislike? Share your thoughts...": "review.feedbackPlaceholder",
    },
    title: {
      Edit: "common.edit",
      Delete: "review.delete",
    },
  },
};

export default function ReviewRoute() {
  return (
    <TranslatedStaticTextScope translations={reviewTranslations}>
      <Feedback />
      <Toaster position="top-center" />
    </TranslatedStaticTextScope>
  );
}
