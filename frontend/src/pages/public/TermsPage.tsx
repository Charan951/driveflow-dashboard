import React from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  UserCheck,
  Users,
  Car,
  CreditCard,
  Truck,
  ClipboardList,
  Copyright,
  Lock,
  AlertTriangle,
  XCircle,
  Settings,
  Gavel,
  Mail,
} from 'lucide-react';

const TermsPage = () => {
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
              TERMS OF USE
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Terms governing the use of the Carzzi platform
            </p>
            <p className="text-sm text-muted-foreground">
              Effective Date: August 6, 2026
            </p>
          </div>

          {/* Content */}
          <div className="bg-card border border-border rounded-3xl p-8 md:p-12 space-y-10 shadow-sm">

            <section className="space-y-4">
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <p>
                  Welcome to Carzzi ("Carzzi", "we", "our", or "us"). These Terms of Use ("Terms") govern
                  your access to and use of the Carzzi website, mobile application, and all related services
                  (collectively, the "Platform"). By accessing or using the Platform, you acknowledge that you
                  have read, understood, and agreed to be bound by these Terms. If you do not agree with
                  these Terms, please discontinue use of the Platform.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2 text-foreground">
                <FileText className="w-6 h-6 text-primary" />
                1. About Carzzi
              </h2>
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <p>
                  Carzzi is a technology-enabled platform that connects vehicle owners with authorized
                  service centers and automotive service providers for vehicle servicing, repairs, detailing,
                  battery replacement, tyre replacement, roadside assistance, and other related automotive
                  services.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2 text-foreground">
                <UserCheck className="w-6 h-6 text-primary" />
                2. Eligibility
              </h2>
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <p>To use the Platform, you must:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Be at least 18 years of age.</li>
                  <li>Have the legal capacity to enter into a binding agreement.</li>
                  <li>Provide accurate, complete, and up-to-date information.</li>
                </ul>
                <p>You are responsible for ensuring that all information submitted to Carzzi is accurate.</p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2 text-foreground">
                <Users className="w-6 h-6 text-primary" />
                3. User Accounts
              </h2>
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <p>
                  You may be required to create an account to access certain services. You are responsible
                  for maintaining the confidentiality of your login credentials and for all activities carried
                  out through your account. Carzzi reserves the right to suspend or terminate any account
                  involved in fraudulent, abusive, or unlawful activities.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2 text-foreground">
                <Car className="w-6 h-6 text-primary" />
                4. Bookings and Services
              </h2>
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <p>
                  Bookings made through Carzzi are subject to service availability, workshop capacity, and
                  confirmation.
                </p>
                <p>
                  Service estimates, prices, timelines, and quotations are indicative and may change after
                  vehicle inspection or based on additional work approved by the customer.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2 text-foreground">
                <CreditCard className="w-6 h-6 text-primary" />
                5. Payments
              </h2>
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <p>
                  Payments may be made using approved online payment methods or any other payment
                  option provided by Carzzi.
                </p>
                <p>
                  Applicable taxes, convenience fees, and service charges will be displayed before payment
                  confirmation. Refunds, where applicable, shall be processed according to Carzzi's
                  Cancellation and Refund Policy.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2 text-foreground">
                <Truck className="w-6 h-6 text-primary" />
                6. Pickup and Delivery
              </h2>
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <p>Where pickup and delivery services are offered, customers agree to:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Make the vehicle available at the scheduled location and time.</li>
                  <li>Remove all valuables from the vehicle.</li>
                  <li>Ensure the vehicle is legally owned or that they have authorization to request service.</li>
                  <li>Provide accurate pickup and delivery information.</li>
                </ul>
                <p>Carzzi is not responsible for valuables left inside the vehicle.</p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2 text-foreground">
                <ClipboardList className="w-6 h-6 text-primary" />
                7. User Responsibilities
              </h2>
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <p>Users agree to:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Provide accurate personal and vehicle information.</li>
                  <li>Use the Platform only for lawful purposes.</li>
                  <li>Cooperate during inspections and servicing.</li>
                  <li>Not misuse, interfere with, or attempt unauthorized access to the Platform.</li>
                  <li>Comply with all applicable laws and regulations.</li>
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2 text-foreground">
                <Copyright className="w-6 h-6 text-primary" />
                8. Intellectual Property
              </h2>
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <p>
                  All software, content, trademarks, logos, graphics, text, images, and other materials
                  available on the Platform are owned by or licensed to Carzzi and are protected under
                  applicable intellectual property laws.
                </p>
                <p>
                  No content may be copied, reproduced, distributed, modified, or used without prior
                  written permission from Carzzi.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2 text-foreground">
                <Lock className="w-6 h-6 text-primary" />
                9. Privacy
              </h2>
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <p>
                  Your use of the Platform is also governed by the Carzzi Privacy Policy, which explains how
                  your information is collected, used, stored, and protected.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2 text-foreground">
                <AlertTriangle className="w-6 h-6 text-primary" />
                10. Limitation of Liability
              </h2>
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <p>
                  Carzzi operates as a technology platform facilitating automotive services. While we strive
                  to ensure high-quality service, we do not guarantee uninterrupted availability of the
                  Platform or services.
                </p>
                <p>
                  To the maximum extent permitted by law, Carzzi shall not be liable for any indirect,
                  incidental, consequential, special, or punitive damages arising out of the use of the
                  Platform or services.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2 text-foreground">
                <XCircle className="w-6 h-6 text-primary" />
                11. Suspension and Termination
              </h2>
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <p>Carzzi may suspend or terminate access to the Platform without prior notice if:</p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>These Terms are violated.</li>
                  <li>Fraudulent or unlawful activity is detected.</li>
                  <li>Such action is required under applicable law.</li>
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2 text-foreground">
                <Settings className="w-6 h-6 text-primary" />
                12. Changes to the Platform
              </h2>
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <p>
                  Carzzi reserves the right to modify, update, suspend, or discontinue any feature,
                  functionality, or service available on the Platform at any time.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2 text-foreground">
                <Gavel className="w-6 h-6 text-primary" />
                13. Governing Law
              </h2>
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <p>These Terms shall be governed by the laws of India.</p>
                <p>
                  Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the
                  competent courts located in Hyderabad, Telangana.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2 text-foreground">
                <Mail className="w-6 h-6 text-primary" />
                14. Contact Us
              </h2>
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <p>If you have any questions regarding these Terms, please contact us:</p>
                <p>
                  <strong className="text-foreground">Carzzi</strong>
                  <br />
                  Website: <span className="text-foreground">www.carzzi.com</span>
                  <br />
                  Email: <span className="text-foreground">support@carzzi.com</span>
                </p>
                <p>
                  By using the Carzzi Platform, you acknowledge that you have read, understood, and
                  agreed to these Terms of Use.
                </p>
              </div>
            </section>

            <div className="pt-8 border-t border-border">
              <p className="text-sm text-center text-muted-foreground">
                 © {new Date().getFullYear()} Carzzi. All rights reserved.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TermsPage;
