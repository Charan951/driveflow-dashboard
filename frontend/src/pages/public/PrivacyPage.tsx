import React from 'react';
import { motion } from 'framer-motion';
import {
  Database,
  Share2,
  Car,
  Lock,
  UserCheck,
  Cookie,
  RefreshCw,
  Mail,
  CreditCard,
} from 'lucide-react';

const PrivacyPage = () => {
  return (
    <div className="min-h-screen bg-background pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-extrabold text-primary tracking-tight">
              PRIVACY POLICY & REFUND POLICY
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Your data and refund rights
            </p>
            <p className="text-sm text-muted-foreground">
              Effective Date: August 6, 2026
            </p>
          </div>

          {/* Content */}
          <div className="bg-card border border-border rounded-3xl p-8 md:p-12 space-y-10 shadow-sm">

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2 text-foreground">
                1. PRIVACY POLICY
              </h2>
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <p>
                  At Carzzi, we value your privacy and are committed to protecting your personal
                  information. This Privacy Policy explains how we collect, use, store, share, and protect
                  your information when you access or use the Carzzi website, mobile application, and
                  related services ("Platform"). This Policy is intended to comply with applicable laws,
                  including the Digital Personal Data Protection Act, 2023 (India).
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-xl font-semibold flex items-center gap-2 text-foreground">
                <Database className="w-6 h-6 text-primary" />
                1.1 Information We Collect
              </h3>
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <p>We may collect the following information:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Name, mobile number, email address, and contact details.</li>
                  <li>Vehicle registration number, make, model, and service history.</li>
                  <li>Booking details and service preferences.</li>
                  <li>Payment transaction information.</li>
                  <li>Device, browser, IP address, and usage information.</li>
                  <li>Location information where required for pickup and delivery services.</li>
                  <li>Communications with our customer support team.</li>
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-xl font-semibold flex items-center gap-2 text-foreground">
                1.2 How We Use Your Information
              </h3>
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <p>Your information is used to:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Process bookings and provide requested services.</li>
                  <li>Coordinate with authorized workshops and service partners.</li>
                  <li>Facilitate payments and generate invoices.</li>
                  <li>Communicate booking confirmations, reminders, and service updates.</li>
                  <li>Improve our Platform and customer experience.</li>
                  <li>Detect and prevent fraud or misuse.</li>
                  <li>Comply with applicable legal and regulatory obligations.</li>
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-xl font-semibold flex items-center gap-2 text-foreground">
                <Share2 className="w-6 h-6 text-primary" />
                1.3 Sharing of Information
              </h3>
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <p>Carzzi may share your information only when necessary with:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Authorized service centers and workshop partners.</li>
                  <li>Payment gateway providers.</li>
                  <li>Logistics and pickup/delivery partners.</li>
                  <li>Technology and cloud service providers.</li>
                  <li>Government authorities or regulatory bodies where required by law.</li>
                </ul>
                <p>We do <strong className="text-foreground">not</strong> sell or rent your personal information to third parties.</p>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-xl font-semibold flex items-center gap-2 text-foreground">
                <Car className="w-6 h-6 text-primary" />
                1.4 Vehicle Information
              </h3>
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <p>
                  Where legally permitted and appropriately authorized, Carzzi may verify or access
                  vehicle-related information through government-approved systems or authorized data
                  providers solely for providing requested services, regulatory compliance, or identity
                  verification.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-xl font-semibold flex items-center gap-2 text-foreground">
                <Lock className="w-6 h-6 text-primary" />
                1.5 Data Security
              </h3>
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <p>
                  Carzzi implements appropriate technical and organizational measures to safeguard your
                  personal information against unauthorized access, disclosure, alteration, or destruction.
                  Although we take reasonable precautions, no electronic system is completely secure.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-xl font-semibold flex items-center gap-2 text-foreground">
                <UserCheck className="w-6 h-6 text-primary" />
                1.6 Your Rights
              </h3>
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <p>Subject to applicable law, you may:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Request access to your personal information.</li>
                  <li>Request correction or updating of inaccurate information.</li>
                  <li>Request deletion of your personal information where legally permissible.</li>
                  <li>Withdraw consent where processing is based on consent.</li>
                  <li>Contact us regarding any privacy-related concerns.</li>
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-xl font-semibold flex items-center gap-2 text-foreground">
                <Cookie className="w-6 h-6 text-primary" />
                1.7 Cookies
              </h3>
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <p>
                  Carzzi may use cookies and similar technologies to improve website functionality,
                  remember your preferences, analyze website traffic, and enhance user experience. You
                  may control cookie preferences through your browser settings.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-xl font-semibold flex items-center gap-2 text-foreground">
                <RefreshCw className="w-6 h-6 text-primary" />
                1.8 Policy Updates
              </h3>
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <p>
                  We may revise this Privacy Policy from time to time. Any updates will be published on
                  this page with the revised Effective Date. Continued use of the Platform after such
                  updates constitutes acceptance of the revised Policy.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-xl font-semibold flex items-center gap-2 text-foreground">
                <Mail className="w-6 h-6 text-primary" />
                1.9 Contact Us
              </h3>
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <p>
                  If you have any questions, requests, or concerns regarding this Privacy Policy or your
                  personal information, please contact us:
                </p>
                <p>
                  <strong className="text-foreground">Carzzi</strong>
                  <br />
                  Website: <span className="text-foreground">www.carzzi.com</span>
                  <br />
                  Email: <span className="text-foreground">support@carzzi.com</span>
                </p>
                <p>
                  By using the Carzzi Platform, you consent to the collection, use, and processing of your
                  information in accordance with this Privacy Policy.
                </p>
              </div>
            </section>

            <section className="space-y-4 pt-8 border-t border-border">
              <h2 className="text-2xl font-semibold flex items-center gap-2 text-foreground">
                <CreditCard className="w-6 h-6 text-primary" />
                2. REFUND POLICY
              </h2>
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>More than 6 hours before service: Full refund</li>
                  <li>2 to 6 hours before service: Partial refund</li>
                  <li>Less than 2 hours before service: No refund</li>
                </ul>
                <p>
                  Refunds are processed within 5–7 business days.
                </p>
              </div>
            </section>

            <div className="pt-8 border-t border-border">
              <p className="text-sm text-center text-muted-foreground">
                © {new Date().getFullYear()} Carzzi. All Rights Reserved.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PrivacyPage;
