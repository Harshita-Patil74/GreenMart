import { Routes, Route, Navigate } from "react-router-dom";
import PublicLayout from "../layouts/PublicLayout.jsx";
import AuthLayout from "../layouts/AuthLayout.jsx";
import DashboardLayout from "../layouts/DashboardLayout.jsx";
import ProtectedRoute, { RoleRoute } from "../components/routing/ProtectedRoute.jsx";

import Home from "../pages/public/Home.jsx";
import Shop from "../pages/public/Shop.jsx";
import ProductDetail from "../pages/public/ProductDetail.jsx";
import Farmers from "../pages/public/Farmers.jsx";
import FarmerProfile from "../pages/public/FarmerProfile.jsx";
import FarmLocations from "../pages/public/FarmLocations.jsx";
import About from "../pages/public/About.jsx";
import Contact from "../pages/public/Contact.jsx";
import NotFound from "../pages/public/NotFound.jsx";

import Login from "../pages/auth/Login.jsx";
import Register from "../pages/auth/Register.jsx";
import ForgotPassword from "../pages/auth/ForgotPassword.jsx";
import ResetPassword from "../pages/auth/ResetPassword.jsx";

import Cart from "../pages/shared/Cart.jsx";
import Checkout from "../pages/shared/Checkout.jsx";
import OrderConfirmation from "../pages/shared/OrderConfirmation.jsx";
import TrackOrder from "../pages/shared/TrackOrder.jsx";
import OrderDetails from "../pages/shared/OrderDetails.jsx";
import Notifications from "../pages/shared/Notifications.jsx";

import CustomerDashboard from "../pages/customer/CustomerDashboard.jsx";
import MyOrders from "../pages/customer/MyOrders.jsx";
import Wishlist from "../pages/customer/Wishlist.jsx";
import Profile from "../pages/customer/Profile.jsx";
import SavedAddresses from "../pages/customer/SavedAddresses.jsx";
import Settings from "../pages/customer/Settings.jsx";

import FarmerDashboard from "../pages/farmer/FarmerDashboard.jsx";
import MyProducts from "../pages/farmer/MyProducts.jsx";
import ProductAddEdit from "../pages/farmer/ProductAddEdit.jsx";
import FarmerOrders from "../pages/farmer/FarmerOrders.jsx";
import Inventory from "../pages/farmer/Inventory.jsx";
import FarmerNotifications from "../pages/farmer/FarmerNotifications.jsx";
import FarmerProfilePage from "../pages/farmer/FarmerProfilePage.jsx";

import AdminDashboard from "../pages/admin/AdminDashboard.jsx";
import AdminProducts from "../pages/admin/AdminProducts.jsx";
import AdminOrders from "../pages/admin/AdminOrders.jsx";
import AdminUsers from "../pages/admin/AdminUsers.jsx";
import AdminFarmers from "../pages/admin/AdminFarmers.jsx";
import AdminInventory from "../pages/admin/AdminInventory.jsx";
import AdminReports from "../pages/admin/AdminReports.jsx";
import AdminSettings from "../pages/admin/AdminSettings.jsx";
import AdminAnalytics from "../pages/admin/AdminAnalytics.jsx";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Pages with Top Navbar matching Image 1 */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
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
        <Route path="/admin/login" element={<Login initialRole="admin" />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
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
            <Route path="/customer/orders" element={<MyOrders />} />
            <Route path="/customer/wishlist" element={<Wishlist />} />
            <Route path="/customer/profile" element={<Profile />} />
            <Route path="/customer/addresses" element={<SavedAddresses />} />
            <Route path="/customer/settings" element={<Settings />} />
          </Route>
          <Route element={<RoleRoute roles={["farmer", "admin"]} requireFarmerApproval />}>
            <Route path="/farmer/dashboard" element={<FarmerDashboard />} />
          </Route>
          <Route element={<RoleRoute role="farmer" requireFarmerApproval />}>
            <Route path="/farmer/products" element={<MyProducts />} />
            <Route path="/farmer/products/new" element={<ProductAddEdit />} />
            <Route path="/farmer/products/:id/edit" element={<ProductAddEdit />} />
            <Route path="/farmer/orders" element={<FarmerOrders />} />
            <Route path="/farmer/inventory" element={<Inventory />} />
            <Route path="/farmer/notifications" element={<FarmerNotifications />} />
            <Route path="/farmer/profile" element={<FarmerProfilePage />} />
          </Route>
          <Route element={<RoleRoute role="admin" />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/products" element={<AdminProducts />} />
            <Route path="/admin/orders" element={<AdminOrders />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/farmers" element={<AdminFarmers />} />
            <Route path="/admin/inventory" element={<AdminInventory />} />
            <Route path="/admin/analytics" element={<AdminAnalytics />} />
            <Route path="/admin/reports" element={<AdminReports />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
