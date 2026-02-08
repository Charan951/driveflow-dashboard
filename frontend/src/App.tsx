import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Layouts
import AuthLayout from "./layouts/AuthLayout";
import CustomerLayout from "./layouts/CustomerLayout";
import StaffLayout from "./layouts/StaffLayout";
import MerchantLayout from "./layouts/MerchantLayout";
import PublicLayout from "./layouts/PublicLayout";

// Components
import PrivateRoute from "./components/PrivateRoute";
import PublicRoute from "./components/PublicRoute";

// Public Pages
import HomePage from "./pages/public/HomePage";
import LoginPage from "./pages/public/LoginPage";
import RegisterPage from "./pages/public/RegisterPage";
import AboutUs from "./pages/public/AboutUs";
import Careers from "./pages/public/Careers";
import Blog from "./pages/public/Blog";
import Contact from "./pages/public/Contact";
import FAQs from "./pages/public/FAQs";
import PublicServices from "./pages/public/PublicServices";
import PublicReviews from "./pages/public/PublicReviews";
import TermsPage from "./pages/public/TermsPage";
import PrivacyPage from "./pages/public/PrivacyPage";

// Customer Pages
import DashboardPage from "./pages/customer/DashboardPage";
import MyBookingsPage from "./pages/customer/MyBookingsPage";
import MyPaymentsPage from "./pages/customer/MyPaymentsPage";
import AddVehiclePage from "./pages/customer/AddVehiclePage";
import ServicesPage from "./pages/customer/ServicesPage";
import BookServicePage from "./pages/customer/BookServicePage";
import TrackServicePage from "./pages/customer/TrackServicePage";
import ChatPage from "./pages/customer/ChatPage";
import TiresBatteryPage from "./pages/customer/TiresBatteryPage";
import CarWashPage from "./pages/customer/CarWashPage";
import InsurancePage from "./pages/customer/InsurancePage";
import DocumentsPage from "./pages/customer/DocumentsPage";
import ProfilePage from "./pages/customer/ProfilePage";
import SupportPage from "./pages/customer/SupportPage";

// Staff Pages
import StaffDashboardPage from "./pages/staff/StaffDashboardPage";
import StaffOrderPage from "./pages/staff/StaffOrderPage";
import StaffLoginPage from "./pages/staff/StaffLoginPage";

import AdminLayout from "./layouts/AdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";

// Merchant Pages
import MerchantDashboard from "./pages/merchant/Dashboard";
import MerchantLoginPage from "./pages/merchant/MerchantLoginPage";
import MerchantOrders from "./pages/merchant/Orders";
import MerchantOrderDetail from "./pages/merchant/OrderDetail";
import MerchantStock from "./pages/merchant/Stock";
import MerchantFeedback from "./pages/merchant/Feedback";

// Admin Pages (Legacy/Shared)
import AdminServicesPage from "./pages/admin/AdminServicesPage";
import AdminBookingsPage from "./pages/admin/AdminBookingsPage";
import AdminBookingDetailPage from "./pages/admin/BookingDetailPage";
import AdminStaffPage from "./pages/admin/AdminStaffPage";
import AdminMerchantsPage from "./pages/admin/AdminMerchantsPage";
import AdminMerchantDetailPage from "./pages/admin/MerchantDetailPage";
import AdminApprovalsPage from "./pages/admin/AdminApprovalsPage";
import AdminTrackingPage from "./pages/admin/AdminTrackingPage";
import AdminPaymentsPage from "./pages/admin/AdminPaymentsPage";
import AdminDocumentsPage from "./pages/admin/AdminDocumentsPage";
import AdminInsurancePage from "./pages/admin/AdminInsurancePage";
import AdminStockPage from "./pages/admin/AdminStockPage";
import AdminSupportPage from "./pages/admin/AdminSupportPage";
import AdminFeedbackPage from "./pages/admin/AdminFeedbackPage";
import AdminNotificationsPage from "./pages/admin/AdminNotificationsPage";
import AdminReportsPage from "./pages/admin/AdminReportsPage";
import AdminRolesPage from "./pages/admin/AdminRolesPage";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";
import AdminAuditPage from "./pages/admin/AdminAuditPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminUserDetailPage from "./pages/admin/UserDetailPage";
import AdminVehiclesPage from "./pages/admin/AdminVehiclesPage";
import AdminVehicleDetailPage from "./pages/admin/VehicleDetailPage";

import NotFound from "./pages/public/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public Routes with Layout */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/about-us" element={<AboutUs />} />
            <Route path="/careers" element={<Careers />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/faqs" element={<FAQs />} />
            <Route path="/services" element={<PublicServices />} />
            <Route path="/reviews" element={<PublicReviews />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
          </Route>
          
          {/* Auth Routes - Wrapped in PublicRoute to redirect logged-in users */}
          <Route element={<PublicRoute />}>
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/merchant/login" element={<MerchantLoginPage />} />
              <Route path="/staff/login" element={<StaffLoginPage />} />
            </Route>
          </Route>

          {/* Customer Routes - Protected */}
          <Route element={<PrivateRoute allowedRoles={['customer']} />}>
            <Route element={<CustomerLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/bookings" element={<MyBookingsPage />} />
              <Route path="/payments" element={<MyPaymentsPage />} />
              <Route path="/add-vehicle" element={<AddVehiclePage />} />
              <Route path="/dashboard/services" element={<ServicesPage />} />
              <Route path="/book-service" element={<BookServicePage />} />
              <Route path="/track/:id" element={<TrackServicePage />} />
              <Route path="/chat/:id" element={<ChatPage />} />
              <Route path="/tires-battery" element={<TiresBatteryPage />} />
              <Route path="/car-wash" element={<CarWashPage />} />
              <Route path="/insurance" element={<InsurancePage />} />
              <Route path="/documents" element={<DocumentsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/support" element={<SupportPage />} />
            </Route>
          </Route>

          {/* Staff Routes - Protected */}
          <Route element={<PrivateRoute allowedRoles={['staff']} />}>
            <Route element={<StaffLayout />}>
              <Route path="/staff/dashboard" element={<StaffDashboardPage />} />
              <Route path="/staff/order/:id" element={<StaffOrderPage />} />
              <Route path="/staff/orders" element={<StaffDashboardPage />} />
            </Route>
          </Route>

          {/* Admin Routes - Protected */}
          <Route element={<PrivateRoute allowedRoles={['admin']} />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/customers" element={<AdminUsersPage />} />
              <Route path="/admin/users/:id" element={<AdminUserDetailPage />} />
              <Route path="/admin/vehicles" element={<AdminVehiclesPage />} />
              <Route path="/admin/vehicles/:id" element={<AdminVehicleDetailPage />} />
              <Route path="/admin/bookings" element={<AdminBookingsPage />} />
              <Route path="/admin/bookings/:id" element={<AdminBookingDetailPage />} />
              <Route path="/admin/services" element={<AdminServicesPage />} />
              
              <Route path="/admin/staff" element={<AdminStaffPage />} />
              <Route path="/admin/merchants" element={<AdminMerchantsPage />} />
              <Route path="/admin/merchants/:id" element={<AdminMerchantDetailPage />} />
              <Route path="/admin/approvals" element={<AdminApprovalsPage />} />
              <Route path="/admin/tracking" element={<AdminTrackingPage />} />
              <Route path="/admin/payments" element={<AdminPaymentsPage />} />
              <Route path="/admin/documents" element={<AdminDocumentsPage />} />
              <Route path="/admin/insurance" element={<AdminInsurancePage />} />
              <Route path="/admin/stock" element={<AdminStockPage />} />
              <Route path="/admin/support" element={<AdminSupportPage />} />
              <Route path="/admin/feedback" element={<AdminFeedbackPage />} />
              <Route path="/admin/notifications" element={<AdminNotificationsPage />} />
              <Route path="/admin/reports" element={<AdminReportsPage />} />
              <Route path="/admin/roles" element={<AdminRolesPage />} />
              <Route path="/admin/settings" element={<AdminSettingsPage />} />
              <Route path="/admin/audit" element={<AdminAuditPage />} />
            </Route>
          </Route>

          {/* Merchant Routes - Protected */}
          <Route element={<PrivateRoute allowedRoles={['merchant', 'admin']} />}>
            <Route element={<MerchantLayout />}>
              <Route path="/merchant/dashboard" element={<MerchantDashboard />} />
              <Route path="/merchant/orders" element={<MerchantOrders />} />
              <Route path="/merchant/order/:id" element={<MerchantOrderDetail />} />
              <Route path="/merchant/stock" element={<MerchantStock />} />
              <Route path="/merchant/feedback" element={<MerchantFeedback />} />
              
              <Route path="/merchant/services" element={<AdminServicesPage />} />
              <Route path="/merchant/bookings" element={<AdminBookingsPage />} />
              <Route path="/merchant/vehicles" element={<AdminVehiclesPage />} />
              <Route path="/merchant/users" element={<AdminUsersPage />} />
            </Route>
          </Route>

          {/* Catch All */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
