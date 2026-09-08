// Static per-route <title> and meta-description text, keyed by the same
// path patterns used in App.tsx's <Route path="..."> definitions. Matched
// against the current location by <PageTitle /> using react-router's
// matchPath, so this map is the single place to update page titles/SEO copy.
// A handful of detail pages (blog/career/service) override this fallback
// once their real content loads — see their useDocumentTitle() calls.
export interface PageMetaEntry {
  title: string;
  description?: string;
}

export const pageMeta: Record<string, PageMetaEntry> = {
  // Public
  "/": {
    title: "Doorstep Car Service, Wash, Tyre & Battery Replacement",
    description:
      "Book general car service, car wash, tyre replacement, or battery replacement online. Carzzi picks up your car, services it with trained professionals, and delivers it back to your doorstep.",
  },
  "/about-us": {
    title: "About Us",
    description: "Learn about Carzzi's mission to bring reliable, transparent doorstep car care to every vehicle owner.",
  },
  "/careers": {
    title: "Careers",
    description: "Explore open roles at Carzzi and join our team building the future of doorstep car care.",
  },
  "/careers/:id": {
    title: "Career Opportunity",
    description: "View this open role at Carzzi and apply online.",
  },
  "/blog": {
    title: "Blog",
    description: "Car care tips, maintenance guides, and news from the Carzzi team.",
  },
  "/blog/:id": {
    title: "Blog",
    description: "Read the latest car care tips and updates from Carzzi.",
  },
  "/contact": {
    title: "Contact Us",
    description: "Get in touch with Carzzi for support, feedback, or partnership enquiries.",
  },
  "/faqs": {
    title: "Frequently Asked Questions",
    description: "Answers to common questions about booking, pricing, and Carzzi's doorstep car services.",
  },
  "/services": {
    title: "Our Services",
    description: "Browse Carzzi's full range of doorstep car services — general service, car wash, tyres, and battery replacement.",
  },
  "/services/:id": {
    title: "Service Details",
    description: "Details, pricing, and booking for this Carzzi service.",
  },
  "/reviews": {
    title: "Customer Reviews",
    description: "See what customers say about their experience with Carzzi's doorstep car services.",
  },
  "/terms": {
    title: "Terms & Conditions",
    description: "Read Carzzi's terms and conditions of service.",
  },
  "/privacy": {
    title: "Privacy Policy",
    description: "Read Carzzi's privacy policy on how we collect and use your data.",
  },
  "/account-deletion": {
    title: "Account Deletion",
    description: "Request deletion of your Carzzi account and associated data.",
  },
  "/track/:id": {
    title: "Track Your Service",
    description: "Live-track your Carzzi booking from pickup to delivery.",
  },

  // Auth
  "/login": { title: "Log In", description: "Log in to your Carzzi account to book and manage car services." },
  "/register": { title: "Sign Up", description: "Create a Carzzi account to book doorstep car services." },
  "/forgot-password": { title: "Forgot Password", description: "Reset the password for your Carzzi account." },
  "/reset-password": { title: "Reset Password", description: "Choose a new password for your Carzzi account." },

  // Common
  "/dashboard": { title: "Dashboard" },

  // Customer
  "/customer/dashboard": { title: "My Dashboard", description: "View your bookings, vehicles, and account at a glance." },
  "/notifications": { title: "Notifications" },
  "/bookings": { title: "My Bookings", description: "View and manage your Carzzi service bookings." },
  "/payments": { title: "My Payments", description: "View your Carzzi payment history and invoices." },
  "/payment": { title: "Payment" },
  "/payment/result": { title: "Payment Status" },
  "/payment/callback": { title: "Payment Status" },
  "/add-vehicle": { title: "Add Vehicle", description: "Add a new vehicle to your Carzzi account." },
  "/vehicles/:id": { title: "Vehicle Details" },
  "/dashboard/services": { title: "Book a Service", description: "Choose from Carzzi's doorstep car services and book online." },
  "/book-service": { title: "Book a Service", description: "Schedule your Carzzi car service pickup in a few taps." },
  "/chat/:id": { title: "Chat Support" },
  "/tires-battery": {
    title: "Tyre & Battery Replacement",
    description: "Book doorstep tyre replacement or battery replacement with Carzzi's verified technicians.",
  },
  "/car-wash": {
    title: "Car Wash at Your Doorstep",
    description: "Book a professional car wash at your doorstep with Carzzi.",
  },
  "/profile": { title: "My Profile" },
  "/support": { title: "Support", description: "Get help with your Carzzi bookings and account." },

  // Staff
  "/staff/dashboard": { title: "Staff Dashboard" },
  "/staff/notifications": { title: "Notifications" },
  "/staff/order/:id": { title: "Order Details" },
  "/staff/orders": { title: "My Orders" },
  "/staff/car-wash": { title: "Car Wash Orders" },
  "/staff/profile": { title: "My Profile" },

  // Admin
  "/admin/dashboard": { title: "Admin Dashboard" },
  "/admin/my-notifications": { title: "Notifications" },
  "/admin/customers": { title: "Customers" },
  "/admin/users/:id": { title: "Customer Details" },
  "/admin/vehicles": { title: "Vehicles" },
  "/admin/vehicles/:id": { title: "Vehicle Details" },
  "/admin/bookings": { title: "Bookings" },
  "/admin/bookings/:id": { title: "Booking Details" },
  "/admin/services": { title: "Manage Services" },
  "/admin/coupons": { title: "Coupons" },
  "/admin/staff": { title: "Staff" },
  "/admin/merchants": { title: "Merchants" },
  "/admin/merchants/:id": { title: "Merchant Details" },
  "/admin/approvals": { title: "Approvals" },
  "/admin/tracking": { title: "Live Tracking" },
  "/admin/payments": { title: "Payments" },
  "/admin/documents": { title: "Documents" },
  "/admin/stock": { title: "Stock" },
  "/admin/support": { title: "Support Tickets" },
  "/admin/feedback": { title: "Feedback" },
  "/admin/notifications": { title: "Notifications" },
  "/admin/reports": { title: "Reports" },
  "/admin/roles": { title: "Roles & Permissions" },
  "/admin/hero-images": { title: "Hero Images" },
  "/admin/faqs": { title: "Manage FAQs" },
  "/admin/careers/:id": { title: "Manage Career Posting" },
  "/admin/audit": { title: "Audit Log" },

  // Merchant
  "/merchant/dashboard": { title: "Merchant Dashboard" },
  "/merchant/notifications": { title: "Notifications" },
  "/merchant/orders": { title: "Orders" },
  "/merchant/order/:id": { title: "Order Details" },
  "/merchant/feedback": { title: "Feedback" },
  "/merchant/profile": { title: "My Profile" },
  "/merchant/services": { title: "Services" },
  "/merchant/bookings": { title: "Bookings" },
  "/merchant/vehicles": { title: "Vehicles" },
  "/merchant/users": { title: "Customers" },
};

export const notFoundMeta: PageMetaEntry = {
  title: "Page Not Found",
  description: "The page you're looking for doesn't exist or has moved.",
};
