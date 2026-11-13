import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import PublicLayout from "../layouts/PublicLayout.jsx";
import AuthLayout from "../layouts/AuthLayout.jsx";
import DashboardLayout from "../layouts/DashboardLayout.jsx";
import ProtectedRoute, { RoleRoute } from "../components/routing/ProtectedRoute.jsx";

const Home = lazy(() => import("../pages/public/Home.jsx"));
const Unsubscribe = lazy(() => import("../pages/public/Unsubscribe.jsx"));
const Shop = lazy(() => import("../pages/public/Shop.jsx"));
const ProductDetail = lazy(() => import("../pages/public/ProductDetail.jsx"));
const Farmers = lazy(() => import("../pages/public/Farmers.jsx"));
const FarmerProfile = lazy(() => import("../pages/public/FarmerProfile.jsx"));
const FarmLocations = lazy(() => import("../pages/public/FarmLocations.jsx"));
const About = lazy(() => import("../pages/public/About.jsx"));
const Contact = lazy(() => import("../pages/public/Contact.jsx"));
const NotFound = lazy(() => import("../pages/public/NotFound.jsx"));

const Login = lazy(() => import("../pages/auth/Login.jsx"));
const Register = lazy(() => import("../pages/auth/Register.jsx"));
const ForgotPassword = lazy(() => import("../pages/auth/ForgotPassword.jsx"));
const ResetPassword = lazy(() => import("../pages/auth/ResetPassword.jsx"));
const ActivateAccount = lazy(() => import("../pages/auth/ActivateAccount.jsx"));

const Cart = lazy(() => import("../pages/shared/Cart.jsx"));
const Checkout = lazy(() => import("../pages/shared/Checkout.jsx"));
const OrderConfirmation = lazy(() => import("../pages/shared/OrderConfirmation.jsx"));
const TrackOrder = lazy(() => import("../pages/shared/TrackOrder.jsx"));
const OrderDetails = lazy(() => import("../pages/shared/OrderDetails.jsx"));
const Notifications = lazy(() => import("../pages/shared/Notifications.jsx"));

const CustomerDashboard = lazy(() => import("../pages/customer/CustomerDashboard.jsx"));
const CustomerOffers = lazy(() => import("../pages/customer/CustomerOffers.jsx"));
const MyOrders = lazy(() => import("../pages/customer/MyOrders.jsx"));
const MyNewsletters = lazy(() => import("../pages/customer/MyNewsletters.jsx"));
const NewsletterDetail = lazy(() => import("../pages/customer/NewsletterDetail.jsx"));
const NewsletterPreferences = lazy(() => import("../pages/shared/NewsletterPreferences.jsx"));
const SubscriptionCheckout = lazy(() => import("../pages/customer/SubscriptionCheckout.jsx"));
const Wishlist = lazy(() => import("../pages/customer/Wishlist.jsx"));
const Profile = lazy(() => import("../pages/customer/Profile.jsx"));
const SavedAddresses = lazy(() => import("../pages/customer/SavedAddresses.jsx"));
const Settings = lazy(() => import("../pages/customer/Settings.jsx"));

const FarmerDashboard = lazy(() => import("../pages/farmer/FarmerDashboard.jsx"));
const MyProducts = lazy(() => import("../pages/farmer/MyProducts.jsx"));
const ProductAddEdit = lazy(() => import("../pages/farmer/ProductAddEdit.jsx"));
const FarmerOrders = lazy(() => import("../pages/farmer/FarmerOrders.jsx"));
const InventoryManagement = lazy(() => import("../pages/farmer/Inventory.jsx"));
const FarmerNotifications = lazy(() => import("../pages/farmer/FarmerNotifications.jsx"));
const FarmerProfilePage = lazy(() => import("../pages/farmer/FarmerProfilePage.jsx"));
const SalesManagement = lazy(() => import("../pages/farmer/SalesManagement.jsx"));
const MyCrops = lazy(() => import("../pages/farmer/MyCrops.jsx"));
const HarvestManagement = lazy(() => import("../pages/farmer/HarvestManagement.jsx"));
const FarmerOffers = lazy(() => import("../pages/farmer/FarmerOffers.jsx"));

const AdminDashboard = lazy(() => import("../pages/admin/AdminDashboard.jsx"));
const AdminNotifications = lazy(() => import("../pages/admin/AdminNotifications.jsx"));
const AdminProducts = lazy(() => import("../pages/admin/AdminProducts.jsx"));
const AdminOrders = lazy(() => import("../pages/admin/AdminOrders.jsx"));
const AdminUsers = lazy(() => import("../pages/admin/AdminUsers.jsx"));
const AdminFarmers = lazy(() => import("../pages/admin/AdminFarmers.jsx"));
const AdminInventory = lazy(() => import("../pages/admin/AdminInventory.jsx"));
const AdminReports = lazy(() => import("../pages/admin/AdminReports.jsx"));
const AdminNewsletter = lazy(() => import("../pages/admin/AdminNewsletter.jsx"));
const AdminAnalytics = lazy(() => import("../pages/admin/AdminAnalytics.jsx"));
const AdminOffers = lazy(() => import("../pages/admin/AdminOffers.jsx"));
const AdminSettings = lazy(() => import("../pages/admin/AdminSettings.jsx"));

export default function AppRoutes() {
  return (
    <Suspense fallback={<div className="gm-container py-8 text-sm text-gray-500" role="status">Loading GreenMart...</div>}>
    <Routes>
      {/* Public Pages with Top Navbar matching Image 1 */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
            <Route path="/newsletter/unsubscribe" element={<Unsubscribe />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/farmers" element={<Farmers />} />
        <Route path="/farmers/:id" element={<FarmerProfile />} />
        <Route path="/farm-locations" element={<FarmLocations />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
      </Route>

      {/* Auth Pages with Centered Card on Farm Background */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/admin/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/activate-account" element={<ActivateAccount />} />
      </Route>

      {/* Customer commerce pages and role-protected dashboards share the sidebar layout. */}
      <Route element={<DashboardLayout />}>
        <Route path="/shop" element={<Shop />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/track-order/:id" element={<TrackOrder />} />
        <Route path="/track-order" element={<TrackOrder />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<RoleRoute roles={["customer", "farmer", "admin"]} />}>
            <Route path="/customer/dashboard" element={<CustomerDashboard />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/order-confirmation/:id" element={<OrderConfirmation />} />
            <Route path="/orders/:id" element={<OrderDetails />} />
          </Route>
            <Route element={<RoleRoute role="customer" />}>
            <Route path="/customer/offers" element={<CustomerOffers />} />
            <Route path="/customer/orders" element={<MyOrders />} />
            <Route path="/customer/subscription-checkout" element={<SubscriptionCheckout />} />
            <Route path="/customer/newsletters" element={<MyNewsletters />} />
            <Route path="/customer/newsletters/:campaignId" element={<NewsletterDetail />} />
            <Route path="/customer/newsletter-preferences" element={<NewsletterPreferences />} />
            <Route path="/customer/wishlist" element={<Wishlist />} />
            <Route path="/customer/profile" element={<Profile />} />
            <Route path="/customer/addresses" element={<SavedAddresses />} />
            <Route path="/customer/settings" element={<Settings />} />
          </Route>
          <Route element={<RoleRoute roles={["farmer", "admin"]} requireFarmerApproval />}>
            <Route path="/farmer/dashboard" element={<FarmerDashboard />} />
          </Route>
          <Route element={<RoleRoute role="farmer" requireFarmerApproval />}>
            <Route path="/farmer/offers" element={<FarmerOffers />} />
            <Route path="/farmer/products" element={<MyProducts />} />
            <Route path="/farmer/products/new" element={<ProductAddEdit />} />
            <Route path="/farmer/products/:id/edit" element={<ProductAddEdit />} />
            <Route path="/farmer/orders" element={<FarmerOrders />} />
            <Route path="/farmer/inventory-management" element={<InventoryManagement />} />
            <Route path="/farmer/inventory" element={<InventoryManagement />} />
            <Route path="/farmer/inventory-management/adjustments" element={<InventoryManagement />} />
            <Route path="/farmer/inventory/history" element={<InventoryManagement />} />
            <Route path="/farmer/crops" element={<MyCrops />} />
            <Route path="/farmer/my-crops" element={<MyCrops />} />
            <Route path="/farmer/harvests" element={<HarvestManagement />} />
            <Route path="/farmer/harvest-management" element={<HarvestManagement />} />
            <Route path="/farmer/sales" element={<SalesManagement />} />
            <Route path="/farmer/notifications" element={<FarmerNotifications />} />
            <Route path="/farmer/profile" element={<FarmerProfilePage />} />
            <Route path="/farmer/profile/:id" element={<FarmerProfilePage />} />
          </Route>
          <Route element={<RoleRoute role="admin" />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/notifications" element={<AdminNotifications />} />
            <Route path="/admin/products" element={<AdminProducts />} />
            <Route path="/admin/orders" element={<AdminOrders />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/farmers" element={<AdminFarmers />} />
            <Route path="/admin/inventory" element={<AdminInventory />} />
            <Route path="/admin/analytics" element={<AdminAnalytics />} />
            <Route path="/admin/reports" element={<AdminReports />} />
            <Route path="/admin/offers" element={<AdminOffers />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/newsletter" element={<AdminNewsletter />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
  );
}
