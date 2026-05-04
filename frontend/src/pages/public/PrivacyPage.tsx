import React from 'react';
import { motion } from 'framer-motion';
import { Database, Eye, UserCheck, Share2, Clock, Shield, RefreshCw, CreditCard } from 'lucide-react';

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
          </div>

          {/* Content */}
          <div className="bg-card border border-border rounded-3xl p-8 md:p-12 space-y-10 shadow-sm">
            
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2 text-foreground">
                <Database className="w-6 h-6 text-primary" />
                2. PRIVACY POLICY
              </h2>
            </section>

            <section className="space-y-4">
              <h3 className="text-xl font-semibold flex items-center gap-2 text-foreground">
                2.1 Data Collected
              </h3>
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <p>
                  Personal information, location data, vehicle details, service images, and analytics data.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-xl font-semibold flex items-center gap-2 text-foreground">
                2.2 Usage
              </h3>
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <p>
                  Used for service delivery, analytics, and fraud prevention.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-xl font-semibold flex items-center gap-2 text-foreground">
                <Eye className="w-6 h-6 text-primary" />
                2.3 Consent
              </h3>
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <p>
                  Users consent to tracking, OTP communication, and data usage.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-xl font-semibold flex items-center gap-2 text-foreground">
                <Share2 className="w-6 h-6 text-primary" />
                2.4 Sharing
              </h3>
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <p>
                  Data may be shared with partners, payment gateways, and authorities.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-xl font-semibold flex items-center gap-2 text-foreground">
                <Clock className="w-6 h-6 text-primary" />
                2.5 Retention
              </h3>
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <p>
                  Data retained for 90 days after deletion.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-xl font-semibold flex items-center gap-2 text-foreground">
                <UserCheck className="w-6 h-6 text-primary" />
                2.6 Rights
              </h3>
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <p>
                  Users can access, correct, or delete their data.
                </p>
              </div>
            </section>

            <section className="space-y-4 pt-8 border-t border-border">
              <h2 className="text-2xl font-semibold flex items-center gap-2 text-foreground">
                <CreditCard className="w-6 h-6 text-primary" />
                3. REFUND POLICY
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
