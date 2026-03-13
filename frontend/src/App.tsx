import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";

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
const HomePage = lazy(() => import("./pages/public/HomePage"));
const LoginPage = lazy(() => import("./pages/public/LoginPage"));
const RegisterPage = lazy(() => import("./pages/public/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("./pages/public/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/public/ResetPasswordPage"));
const AboutUs = lazy(() => import("./pages/public/AboutUs"));
const Careers = lazy(() => import("./pages/public/Careers"));
const Blog = lazy(() => import("./pages/public/Blog"));
const Contact = lazy(() => import("./pages/public/Contact"));
const FAQs = lazy(() => import("./pages/public/FAQs"));
const PublicServices = lazy(() => import("./pages/public/PublicServices"));
const PublicReviews = lazy(() => import("./pages/public/PublicReviews"));
const TermsPage = lazy(() => import("./pages/public/TermsPage"));
const PrivacyPage = lazy(() => import("./pages/public/PrivacyPage"));
const ServiceDetailsPage = lazy(() => import("./pages/public/ServiceDetailsPage"));

// Customer Pages
const DashboardPage = lazy(() => import("./pages/customer/DashboardPage"));
const MyBookingsPage = lazy(() => import("./pages/customer/MyBookingsPage"));
const MyPaymentsPage = lazy(() => import("./pages/customer/MyPaymentsPage"));
const PaymentPage = lazy(() => import("./pages/customer/PaymentPage"));
const AddVehiclePage = lazy(() => import("./pages/customer/AddVehiclePage"));
const ServicesPage = lazy(() => import("./pages/customer/ServicesPage"));
const BookServicePage = lazy(() => import("./pages/customer/BookServicePage"));
const TrackServicePage = lazy(() => import("./pages/customer/TrackServicePage"));
const ChatPage = lazy(() => import("./pages/customer/ChatPage"));
const TiresBatteryPage = lazy(() => import("./pages/customer/TiresBatteryPage"));
const CarWashPage = lazy(() => import("./pages/customer/CarWashPage"));
const InsurancePage = lazy(() => import("./pages/customer/InsurancePage"));
const DocumentsPage = lazy(() => import("./pages/customer/DocumentsPage"));
const ProfilePage = lazy(() => import("./pages/customer/ProfilePage"));
const SupportPage = lazy(() => import("./pages/customer/SupportPage"));

// Staff Pages
const StaffDashboardPage = lazy(() => import("./pages/staff/StaffDashboardPage"));
const StaffOrderPage = lazy(() => import("./pages/staff/StaffOrderPage"));
const StaffOrdersPage = lazy(() => import("./pages/staff/StaffOrdersPage"));
const StaffCarWashPage = lazy(() => import("./pages/staff/CarWashPage"));

// Admin Pages
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminServicesPage = lazy(() => import("./pages/admin/AdminServicesPage"));
const AdminBookingsPage = lazy(() => import("./pages/admin/AdminBookingsPage"));
const AdminBookingDetailPage = lazy(() => import("./pages/admin/BookingDetailPage"));
const AdminStaffPage = lazy(() => import("./pages/admin/AdminStaffPage"));
const AdminMerchantsPage = lazy(() => import("./pages/admin/AdminMerchantsPage"));
const AdminMerchantDetailPage = lazy(() => import("./pages/admin/MerchantDetailPage"));
const AdminApprovalsPage = lazy(() => import("./pages/admin/AdminApprovalsPage"));
const AdminTrackingPage = lazy(() => import("./pages/admin/AdminTrackingPage"));
const AdminPaymentsPage = lazy(() => import("./pages/admin/AdminPaymentsPage"));
const AdminDocumentsPage = lazy(() => import("./pages/admin/AdminDocumentsPage"));
const AdminInsurancePage = lazy(() => import("./pages/admin/AdminInsurancePage"));
const AdminStockPage = lazy(() => import("./pages/admin/AdminStockPage"));
const MyNotificationsPage = lazy(() => import("./pages/common/MyNotificationsPage"));
const AdminSupportPage = lazy(() => import("./pages/admin/AdminSupportPage"));
const AdminFeedbackPage = lazy(() => import("./pages/admin/AdminFeedbackPage"));
const AdminNotificationsPage = lazy(() => import("./pages/admin/AdminNotificationsPage"));
const AdminReportsPage = lazy(() => import("./pages/admin/AdminReportsPage"));
const AdminRolesPage = lazy(() => import("./pages/admin/AdminRolesPage"));
const AdminSettingsPage = lazy(() => import("./pages/admin/AdminSettingsPage"));
const AdminAuditPage = lazy(() => import("./pages/admin/AdminAuditPage"));
const AdminUsersPage = lazy(() => import("./pages/admin/AdminUsersPage"));
const AdminUserDetailPage = lazy(() => import("./pages/admin/UserDetailPage"));
const AdminVehiclesPage = lazy(() => import("./pages/admin/AdminVehiclesPage"));
const AdminVehicleDetailPage = lazy(() => import("./pages/admin/VehicleDetailPage"));

// Merchant Pages
const MerchantDashboard = lazy(() => import("./pages/merchant/Dashboard"));
const MerchantOrders = lazy(() => import("./pages/merchant/Orders"));
const MerchantOrderDetail = lazy(() => import("./pages/merchant/OrderDetail"));
const MerchantStock = lazy(() => import("./pages/merchant/Stock"));
const MerchantFeedback = lazy(() => import("./pages/merchant/Feedback"));
const MerchantProfilePage = lazy(() => import("./pages/merchant/MerchantProfilePage"));

const DashboardDispatcher = lazy(() => import("./pages/common/DashboardDispatcher"));
const NotFound = lazy(() => import("./pages/public/NotFound"));

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
              <Route path="/admin/audit" element={<AdminAuditPage />} />
            </Route>
          </Route>

          {/* Merchant Routes - Protected */}
          <Route element={<PrivateRoute allowedRoles={['merchant', 'admin']} />}>
            <Route element={<MerchantLayout />}>
              <Route path="/merchant/notifications" element={<MyNotificationsPage />} />
              <Route path="/merchant/orders" element={<MerchantOrders />} />
              <Route path="/merchant/order/:id" element={<MerchantOrderDetail />} />
              <Route path="/merchant/stock" element={<MerchantStock />} />
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
