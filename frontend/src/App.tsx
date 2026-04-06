import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import React, { Suspense, lazy } from "react";

// Development testing
if (import.meta.env.DEV) {
  import("./utils/testRazorpay");
}

// Helper for lazy loading with retry on failure (useful for new deployments)
const lazyRetry = (componentImport: () => Promise<any>) => {
  return lazy(async () => {
    try {
      return await componentImport();
    } catch (error) {
      console.error('Lazy load error:', error);
      // Fallback: Reload the page once if it hasn't been reloaded in the last 10 seconds
      const lastReload = sessionStorage.getItem('last-chunk-reload');
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload) > 10000) {
        sessionStorage.setItem('last-chunk-reload', now.toString());
        window.location.reload();
      }
      throw error;
    }
  });
};

// Layouts
import AuthLayout from "./layouts/AuthLayout";
import CustomerLayout from "./layouts/CustomerLayout";
import StaffLayout from "./layouts/StaffLayout";
import MerchantLayout from "./layouts/MerchantLayout";
import PublicLayout from "./layouts/PublicLayout";
import AdminLayout from "./layouts/AdminLayout";

// Components
import PrivateRoute from "./components/PrivateRoute";
import PublicRoute from "./components/PublicRoute";
import SocketNotificationListener from "./components/SocketNotificationListener";
import { Skeleton } from "@/components/ui/skeleton";

// Loading Fallback Component
const PageLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 space-y-4">
    <Skeleton className="h-12 w-[250px]" />
    <Skeleton className="h-4 w-[200px]" />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-6xl mt-8">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-48 rounded-2xl" />
      ))}
    </div>
  </div>
);

// Public Pages
const HomePage = lazyRetry(() => import("./pages/public/HomePage"));
const LoginPage = lazyRetry(() => import("./pages/public/LoginPage"));
const RegisterPage = lazyRetry(() => import("./pages/public/RegisterPage"));
const ForgotPasswordPage = lazyRetry(() => import("./pages/public/ForgotPasswordPage"));
const ResetPasswordPage = lazyRetry(() => import("./pages/public/ResetPasswordPage"));
const AboutUs = lazyRetry(() => import("./pages/public/AboutUs"));
const Careers = lazyRetry(() => import("./pages/public/Careers"));
const Blog = lazyRetry(() => import("./pages/public/Blog"));
const Contact = lazyRetry(() => import("./pages/public/Contact"));
const FAQs = lazyRetry(() => import("./pages/public/FAQs"));
const PublicServices = lazyRetry(() => import("./pages/public/PublicServices"));
const PublicReviews = lazyRetry(() => import("./pages/public/PublicReviews"));
const TermsPage = lazyRetry(() => import("./pages/public/TermsPage"));
const PrivacyPage = lazyRetry(() => import("./pages/public/PrivacyPage"));
const ServiceDetailsPage = lazyRetry(() => import("./pages/public/ServiceDetailsPage"));

// Customer Pages
const DashboardPage = lazyRetry(() => import("./pages/customer/DashboardPage"));
const MyBookingsPage = lazyRetry(() => import("./pages/customer/MyBookingsPage"));
const MyPaymentsPage = lazyRetry(() => import("./pages/customer/MyPaymentsPage"));
const PaymentPage = lazyRetry(() => import("./pages/customer/PaymentPage"));
const AddVehiclePage = lazyRetry(() => import("./pages/customer/AddVehiclePage"));
const ServicesPage = lazyRetry(() => import("./pages/customer/ServicesPage"));
const BookServicePage = lazyRetry(() => import("./pages/customer/BookServicePage"));
const TrackServicePage = lazyRetry(() => import("./pages/customer/TrackServicePage"));
const ChatPage = lazyRetry(() => import("./pages/customer/ChatPage"));
const TiresBatteryPage = lazyRetry(() => import("./pages/customer/TiresBatteryPage"));
const CarWashPage = lazyRetry(() => import("./pages/customer/CarWashPage"));
const InsurancePage = lazyRetry(() => import("./pages/customer/InsurancePage"));
const DocumentsPage = lazyRetry(() => import("./pages/customer/DocumentsPage"));
const ProfilePage = lazyRetry(() => import("./pages/customer/ProfilePage"));
const SupportPage = lazyRetry(() => import("./pages/customer/SupportPage"));

// Staff Pages
const StaffDashboardPage = lazyRetry(() => import("./pages/staff/StaffDashboardPage"));
const StaffOrderPage = lazyRetry(() => import("./pages/staff/StaffOrderPage"));
const StaffOrdersPage = lazyRetry(() => import("./pages/staff/StaffOrdersPage"));
const StaffCarWashPage = lazyRetry(() => import("./pages/staff/CarWashPage"));
const StaffProfilePage = lazyRetry(() => import("./pages/staff/StaffProfilePage"));

// Admin Pages
const AdminDashboard = lazyRetry(() => import("./pages/admin/Dashboard"));
const AdminServicesPage = lazyRetry(() => import("./pages/admin/AdminServicesPage"));
const AdminBookingsPage = lazyRetry(() => import("./pages/admin/AdminBookingsPage"));
const AdminBookingDetailPage = lazyRetry(() => import("./pages/admin/BookingDetailPage"));
const AdminStaffPage = lazyRetry(() => import("./pages/admin/AdminStaffPage"));
const AdminMerchantsPage = lazyRetry(() => import("./pages/admin/AdminMerchantsPage"));
const AdminMerchantDetailPage = lazyRetry(() => import("./pages/admin/MerchantDetailPage"));
const AdminApprovalsPage = lazyRetry(() => import("./pages/admin/AdminApprovalsPage"));
const AdminTrackingPage = lazyRetry(() => import("./pages/admin/AdminTrackingPage"));
const AdminPaymentsPage = lazyRetry(() => import("./pages/admin/AdminPaymentsPage"));
const AdminDocumentsPage = lazyRetry(() => import("./pages/admin/AdminDocumentsPage"));
const AdminInsurancePage = lazyRetry(() => import("./pages/admin/AdminInsurancePage"));
const AdminStockPage = lazyRetry(() => import("./pages/admin/AdminStockPage"));
const MyNotificationsPage = lazyRetry(() => import("./pages/common/MyNotificationsPage"));
const AdminSupportPage = lazyRetry(() => import("./pages/admin/AdminSupportPage"));
const AdminFeedbackPage = lazyRetry(() => import("./pages/admin/AdminFeedbackPage"));
const AdminNotificationsPage = lazyRetry(() => import("./pages/admin/AdminNotificationsPage"));
const AdminReportsPage = lazyRetry(() => import("./pages/admin/AdminReportsPage"));
const AdminRolesPage = lazyRetry(() => import("./pages/admin/AdminRolesPage"));
const AdminSettingsPage = lazyRetry(() => import("./pages/admin/AdminSettingsPage"));
const AdminHeroImagesPage = lazyRetry(() => import("./pages/admin/AdminHeroImagesPage"));
const AdminAuditPage = lazyRetry(() => import("./pages/admin/AdminAuditPage"));
const AdminUsersPage = lazyRetry(() => import("./pages/admin/AdminUsersPage"));
const AdminUserDetailPage = lazyRetry(() => import("./pages/admin/UserDetailPage"));
const AdminVehiclesPage = lazyRetry(() => import("./pages/admin/AdminVehiclesPage"));
const AdminVehicleDetailPage = lazyRetry(() => import("./pages/admin/VehicleDetailPage"));

// Merchant Pages
const MerchantDashboard = lazyRetry(() => import("./pages/merchant/Dashboard"));
const MerchantOrders = lazyRetry(() => import("./pages/merchant/Orders"));
const MerchantOrderDetail = lazyRetry(() => import("./pages/merchant/OrderDetail"));
const MerchantStock = lazyRetry(() => import("./pages/merchant/Stock"));
const MerchantFeedback = lazyRetry(() => import("./pages/merchant/Feedback"));
const MerchantProfilePage = lazyRetry(() => import("./pages/merchant/MerchantProfilePage"));

const DashboardDispatcher = lazyRetry(() => import("./pages/common/DashboardDispatcher"));
const NotFound = lazyRetry(() => import("./pages/public/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SocketNotificationListener />
        <Suspense fallback={<PageLoader />}>
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
            <Route path="/services/:id" element={<ServiceDetailsPage />} />
          </Route>
          
          {/* Auth Routes - Wrapped in PublicRoute to redirect logged-in users */}
          <Route element={<PublicRoute />}>
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
            </Route>
          </Route>

          {/* Common Dashboard Route */}
          <Route element={<PrivateRoute allowedRoles={['admin', 'merchant', 'staff', 'customer']} />}>
            <Route path="/dashboard" element={<DashboardDispatcher />} />
          </Route>

          {/* Customer Routes - Protected */}
          <Route element={<PrivateRoute allowedRoles={['customer']} />}>
            <Route element={<CustomerLayout />}>
              <Route path="/notifications" element={<MyNotificationsPage />} />
              <Route path="/bookings" element={<MyBookingsPage />} />
              <Route path="/payments" element={<MyPaymentsPage />} />
              <Route path="/payment" element={<PaymentPage />} />
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
              <Route path="/staff/notifications" element={<MyNotificationsPage />} />
              <Route path="/staff/order/:id" element={<StaffOrderPage />} />
              <Route path="/staff/orders" element={<StaffOrdersPage />} />
              <Route path="/staff/car-wash" element={<StaffCarWashPage />} />
              <Route path="/staff/profile" element={<StaffProfilePage />} />
            </Route>
          </Route>

          {/* Admin Routes - Protected */}
          <Route element={<PrivateRoute allowedRoles={['admin']} />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin/my-notifications" element={<MyNotificationsPage />} />
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
              <Route path="/admin/hero-images" element={<AdminHeroImagesPage />} />
              <Route path="/admin/audit" element={<AdminAuditPage />} />
            </Route>
          </Route>

          {/* Merchant Routes - Protected */}
          <Route element={<PrivateRoute allowedRoles={['merchant', 'admin']} />}>
            <Route element={<MerchantLayout />}>
              <Route path="/merchant/notifications" element={<MyNotificationsPage />} />
              <Route path="/merchant/orders" element={<MerchantOrders />} />
              <Route path="/merchant/order/:id" element={<MerchantOrderDetail />} />
              <Route path="/merchant/feedback" element={<MerchantFeedback />} />
              <Route path="/merchant/profile" element={<MerchantProfilePage />} />
              
              <Route path="/merchant/services" element={<AdminServicesPage />} />
              <Route path="/merchant/bookings" element={<AdminBookingsPage />} />
              <Route path="/merchant/vehicles" element={<AdminVehiclesPage />} />
              <Route path="/merchant/users" element={<AdminUsersPage />} />
            </Route>
          </Route>

          {/* Catch All */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
