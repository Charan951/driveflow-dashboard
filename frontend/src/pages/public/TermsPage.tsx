import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Scale, Car, Users, CreditCard, RefreshCw, Shield, Gavel } from 'lucide-react';

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
              TERMS & CONDITIONS
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Terms governing the use of the Carzzi platform
            </p>
          </div>

          {/* Content */}
          <div className="bg-card border border-border rounded-3xl p-8 md:p-12 space-y-10 shadow-sm">
            
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2 text-foreground">
                <FileText className="w-6 h-6 text-primary" />
                1. Introduction
              </h2>
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <p>
                  These Terms govern the use of the Carzzi platform operated by Hyper Mobility Services, Hyderabad, Telangana.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2 text-foreground">
                <Scale className="w-6 h-6 text-primary" />
                2. Nature of Service
              </h2>
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <p>
                  Carzzi is a technology platform connecting customers with authorized service partners. Carzzi does not perform servicing.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2 text-foreground">
                <Car className="w-6 h-6 text-primary" />
                3. Services
              </h2>
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <p>
                  Car servicing, pickup & drop, emergency services, detailing, battery/tyre replacement, towing.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2 text-foreground">
                <Users className="w-6 h-6 text-primary" />
                4. User Responsibilities
              </h2>
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <p>
                  Users must provide accurate information and must not engage in illegal activities, fake bookings, or misuse staff.
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
                  All payments are online. GST is applicable. Invoices may be issued by Carzzi or partners.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2 text-foreground">
                <RefreshCw className="w-6 h-6 text-primary" />
                6. Cancellation & Refund
              </h2>
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>More than 6 hours: Full refund</li>
                  <li>2–6 hours: Partial refund</li>
                  <li>Less than 2 hours: No refund</li>
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2 text-foreground">
                <Shield className="w-6 h-6 text-primary" />
                7. Liability
              </h2>
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <p>
                  Carzzi is responsible only during pickup and drop transit. Service partners are responsible during service.
                </p>
                <p>
                  Liability is limited to service amount OR insurance deductible/next premium increase (whichever is lower).
                </p>
                <p>
                  Claims must be reported within 24 hours with valid proof.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2 text-foreground">
                <Gavel className="w-6 h-6 text-primary" />
                8. Jurisdiction
              </h2>
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <p>
                  Medchal-Malkajgiri, Telangana.
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
