import React, { useEffect, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { subscribeToPush, isPushSupported } from './push/push';
import { useModal } from './components/CustomModal';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LiveSupportWidget from './components/LiveSupportWidget';
import OnboardingCheck from './components/OnboardingCheck';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import HomePage from './pages/HomePage';
import ItemsPage from './pages/ItemsPage';
import NearMePage from './pages/NearMePage';
import AboutPage from './pages/AboutPage';
import TermsPage from './pages/TermsPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import ContactPage from './pages/ContactPage';
import CategoriesPage from './pages/CategoriesPage';
import HelpPage from './pages/HelpPage';
import FeedbackPage from './pages/FeedbackPage';
import BuyingGuidePage from './pages/BuyingGuidePage';
import SafetyGuidelinesPage from './pages/SafetyGuidelinesPage';
import ItemDetailPage from './pages/ItemDetailPage';
import PostItemPage from './pages/PostItemPage';
import MyItemsPage from './pages/MyItemsPage';
import NotificationsPage from './pages/NotificationsPage';
import ProfilePage from './pages/ProfilePage';
import PublicProfilePage from './pages/PublicProfilePage';
import FavoritesPage from './pages/FavoritesPage';
import RecentlyViewedPage from './pages/RecentlyViewedPage';
import SearchHistoryPage from './pages/SearchHistoryPage';
import SellerDashboardPage from './pages/SellerDashboardPage';
import ActivityLogPage from './pages/ActivityLogPage';
import SettingsPage from './pages/SettingsPage';
import ChatListPage from './pages/ChatListPage';
import ChatThreadPage from './pages/ChatThreadPage';
import AdminSupportChatPage from './pages/AdminSupportChatPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminItemsPage from './pages/admin/AdminItemsPage';
import AdminReportsPage from './pages/admin/AdminReportsPage';
import AdminInsightsPage from './pages/admin/AdminInsightsPage';
import AdminSupportPage from './pages/admin/AdminSupportPage';
import AdminAnnouncementsPage from './pages/admin/AdminAnnouncementsPage';
import AdminAdvertisementsPage from './pages/admin/AdminAdvertisementsPage';
import AdminSubscriptionSettingsPage from './pages/admin/AdminSubscriptionSettingsPage';
import AdminAppVersionsPage from './pages/admin/AdminAppVersionsPage';
import MyProfilePage from './pages/MyProfilePage';
import MyAdvertisementsPage from './pages/MyAdvertisementsPage';
import CreateAdvertisementPage from './pages/CreateAdvertisementPage';
import AnalyticsPage from './pages/AnalyticsPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import OnboardingPage from './pages/OnboardingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import GoogleCallbackPage from './pages/GoogleCallbackPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import NotFoundPage from './pages/NotFoundPage';
import AdvertisePage from './pages/AdvertisePage';
import PricingPage from './pages/PricingPage';
import AffiliatePage from './pages/AffiliatePage';

export default function App() {
  const { user } = useAuth();
  const location = useLocation();
  const modal = useModal();

  useEffect(() => {
    if (user && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      subscribeToPush();
    }
  }, [user]);

  // When the app is installed (PWA on mobile), ask to enable notifications so
  // alerts show up in the device notification bar.
  useEffect(() => {
    function onAppInstalled() {
      if (
        user &&
        isPushSupported() &&
        typeof Notification !== 'undefined' &&
        Notification.permission === 'default'
      ) {
        modal
          .confirm(
            'Turn on notifications to get instant alerts when someone reacts to, messages or buys your items — right in your notification bar?',
            { title: 'Enable notifications', confirmText: 'Enable', cancelText: 'Not now' }
          )
          .then((ok) => {
            if (ok) subscribeToPush();
          });
      }
    }
    window.addEventListener('appinstalled', onAppInstalled);
    return () => window.removeEventListener('appinstalled', onAppInstalled);
  }, [user]);

  // Check if current route is an admin page
  const isAdminPage = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen flex flex-col">
      <OnboardingCheck />
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/onboarding" element={
            <ProtectedRoute>
              <OnboardingPage />
            </ProtectedRoute>
          } />
          <Route path="/" element={<HomePage />} />
          <Route path="/items" element={<ItemsPage />} />
          <Route path="/items/near-me" element={<NearMePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/feedback" element={<FeedbackPage />} />
          <Route path="/buying-guide" element={<BuyingGuidePage />} />
          <Route path="/safety-guidelines" element={<SafetyGuidelinesPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/advertise" element={<AdvertisePage />} />
          <Route path="/item/:id" element={<ItemDetailPage />} />
          <Route path="/user/:id" element={<PublicProfilePage />} />
          <Route
            path="/post"
            element={
              <ProtectedRoute>
                <PostItemPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-profile"
            element={
              <ProtectedRoute>
                <MyProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-ads"
            element={
              <ProtectedRoute>
                <MyAdvertisementsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/advertisements/create"
            element={
              <ProtectedRoute>
                <CreateAdvertisementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <AnalyticsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/affiliate"
            element={
              <ProtectedRoute>
                <AffiliatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payment/success"
            element={
              <ProtectedRoute>
                <PaymentSuccessPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-items"
            element={
              <ProtectedRoute>
                <MyItemsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/favorites"
            element={
              <ProtectedRoute>
                <FavoritesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recently-viewed"
            element={
              <ProtectedRoute>
                <RecentlyViewedPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/search-history"
            element={
              <ProtectedRoute>
                <SearchHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/seller-dashboard"
            element={
              <ProtectedRoute>
                <SellerDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/activity-log"
            element={
              <ProtectedRoute>
                <ActivityLogPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <ChatListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat/:id"
            element={
              <ProtectedRoute>
                <ChatThreadPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <AdminRoute>
                <AdminUsersPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/items"
            element={
              <AdminRoute>
                <AdminItemsPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <AdminRoute>
                <AdminReportsPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/insights"
            element={
              <AdminRoute>
                <AdminInsightsPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/support"
            element={
              <AdminRoute>
                <AdminSupportPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/support-chat"
            element={
              <AdminRoute>
                <AdminSupportChatPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/support-chat/:chatId"
            element={
              <AdminRoute>
                <AdminSupportChatPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/announcements"
            element={
              <AdminRoute>
                <AdminAnnouncementsPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/advertisements"
            element={
              <AdminRoute>
                <AdminAdvertisementsPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/subscription-settings"
            element={
              <AdminRoute>
                <AdminSubscriptionSettingsPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/app-versions"
            element={
              <AdminRoute>
                <AdminAppVersionsPage />
              </AdminRoute>
            }
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      {!isAdminPage && <Footer />}
      {!isAdminPage && <LiveSupportWidget />}
    </div>
  );
}
