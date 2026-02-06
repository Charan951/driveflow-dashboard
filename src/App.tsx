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

// Public Pages
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import StaffLoginPage from "./pages/StaffLoginPage";
import MerchantLoginPage from "./pages/MerchantLoginPage";

// Customer Pages
import DashboardPage from "./pages/DashboardPage";
import AddVehiclePage from "./pages/AddVehiclePage";
import ServicesPage from "./pages/ServicesPage";
import BookServicePage from "./pages/BookServicePage";
import TrackServicePage from "./pages/TrackServicePage";
import ChatPage from "./pages/ChatPage";
import TiresBatteryPage from "./pages/TiresBatteryPage";
import CarWashPage from "./pages/CarWashPage";
import InsurancePage from "./pages/InsurancePage";
import DocumentsPage from "./pages/DocumentsPage";
import ProfilePage from "./pages/ProfilePage";
import SupportPage from "./pages/SupportPage";

// Staff Pages
import StaffDashboardPage from "./pages/StaffDashboardPage";
import StaffOrderPage from "./pages/StaffOrderPage";

// Merchant Pages
import MerchantDashboardPage from "./pages/MerchantDashboardPage";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          
          {/* Auth Routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/staff/login" element={<StaffLoginPage />} />
            <Route path="/merchant/login" element={<MerchantLoginPage />} />
          </Route>

          {/* Customer Routes */}
          <Route element={<CustomerLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/add-vehicle" element={<AddVehiclePage />} />
            <Route path="/services" element={<ServicesPage />} />
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

          {/* Staff Routes */}
          <Route element={<StaffLayout />}>
            <Route path="/staff/dashboard" element={<StaffDashboardPage />} />
            <Route path="/staff/order/:id" element={<StaffOrderPage />} />
            <Route path="/staff/orders" element={<StaffDashboardPage />} />
          </Route>

          {/* Merchant Routes */}
          <Route element={<MerchantLayout />}>
            <Route path="/merchant/dashboard" element={<MerchantDashboardPage />} />
            <Route path="/merchant/orders" element={<MerchantDashboardPage />} />
            <Route path="/merchant/reviews" element={<MerchantDashboardPage />} />
          </Route>

          {/* Catch All */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
