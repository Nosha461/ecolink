import "./App.css";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Pricing from "./pages/Pricing";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Listing from "./pages/Listing";
import SearchListing from "./pages/SearchListing";
import ManageListing from "./pages/ManageListing";
import EditListing from "./pages/EditListing";
import Categories from "./pages/Categories";
import Notifications from "./pages/Notifications";
import Payment from "./pages/Payment";
import ChatRoute from "./pages/ChatRoute";
import ReviewRoute from "./pages/ReviewRoute";
import ListingDetailsRoute from "./pages/ListingDetailsRoute";
import Request from "./pages/Request";
import DealDetails from "./pages/DealDetails";
import Cart from "./pages/Cart";
import Profile from "./pages/Profile";

import ContactHeader from "./components/ContactHeader";
import ContactFooter from "./components/ContactFooter";

import Hero from "./components/Hero";
import Stats from "./components/Stats";
import About from "./components/About";
import HowItWorks from "./components/HowItWorks";
import Why from "./components/Why";
import CTA from "./components/CTA";

function HomePage() {
  return (
    <>
      <ContactHeader />
      <main>
        <Hero />
        <Stats />
        <About />
        <HowItWorks />
        <Why />
        <CTA />
      </main>
      <ContactFooter />
    </>
  );
}

function ContactPage() {
  return (
    <>
      <ContactHeader />
      <Contact />
      <ContactFooter />
    </>
  );
}

function LoginPage() {
  return (
    <>
      <ContactHeader />
      <Login />
      <ContactFooter />
    </>
  );
}

function RegisterPage() {
  return (
    <>
      <ContactHeader />
      <Register />
      <ContactFooter />
    </>
  );
}

function ForgotPasswordPage() {
  return (
    <>
      <ContactHeader />
      <ForgotPassword />
      <ContactFooter />
    </>
  );
}

function ResetPasswordPage() {
  return (
    <>
      <ContactHeader />
      <ResetPassword />
      <ContactFooter />
    </>
  );
}

function PricingPage() {
  return (
    <>
      <ContactHeader />
      <Pricing />
      <ContactFooter />
    </>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}

function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/forget-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/edit-profile" element={<Profile />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/listings" element={<Listing />} />
        <Route path="/search-listing" element={<SearchListing />} />
        <Route path="/search-listings" element={<SearchListing />} />
        <Route path="/listing-details/:id" element={<ListingDetailsRoute />} />
        <Route path="/listings/:id" element={<ListingDetailsRoute />} />
        <Route path="/manage-listing" element={<ManageListing />} />
        <Route path="/manage-listing/:listingId" element={<EditListing />} />
        <Route path="/edit-listing/:listingId" element={<EditListing />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/requests" element={<Request />} />
        <Route path="/deal-details/:orderId" element={<DealDetails />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/chat" element={<ChatRoute />} />
        <Route path="/reviews" element={<ReviewRoute />} />
        <Route path="/review" element={<ReviewRoute />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/payment/:orderId" element={<Payment />} />
      </Routes>
    </Router>
  );
}

export default App;
