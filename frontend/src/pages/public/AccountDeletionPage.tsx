import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trash2, Mail, ShieldCheck, Clock, ArrowRight } from 'lucide-react';

const AccountDeletionPage = () => {
  return (
    <div className="min-h-screen bg-background pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-destructive/10 text-destructive mb-2">
              <Trash2 className="w-7 h-7" />
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
              Account Deletion Request
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Learn how to request permanent deletion of your Carzzi account and
              associated personal data.
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 md:p-10 space-y-8 shadow-sm">
            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                How to raise a deletion request
              </h2>
              <ol className="list-decimal list-inside space-y-3 text-muted-foreground leading-relaxed">
                <li>
                  Send an email to{' '}
                  <a
                    href="mailto:support@carzzi.com?subject=Account%20Deletion%20Request"
                    className="text-primary font-medium hover:underline"
                  >
                    support@carzzi.com
                  </a>{' '}
                  from the email address linked to your Carzzi account.
                </li>
                <li>
                  Use the subject line:{' '}
                  <span className="text-foreground font-medium">
                    Account Deletion Request
                  </span>
                </li>
                <li>
                  Include your full name, registered mobile number, and a clear
                  statement that you want your account and personal data deleted.
                </li>
                <li>
                  Our team will verify your identity and process the request.
                </li>
              </ol>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                What happens next
              </h2>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed ml-1">
                <li>
                  We typically process verified deletion requests within{' '}
                  <span className="text-foreground font-medium">7–14 business days</span>.
                </li>
                <li>
                  After deletion, you will no longer be able to sign in with that
                  account.
                </li>
                <li>
                  Some records may be retained where required by law (for example,
                  invoices or tax-related transaction data) for a limited period.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                Contact
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Carzzi</strong>
                <br />
                Email:{' '}
                <a
                  href="mailto:support@carzzi.com"
                  className="text-primary hover:underline"
                >
                  support@carzzi.com
                </a>
                <br />
                Website:{' '}
                <span className="text-foreground">www.carzzi.com</span>
              </p>
            </section>

            <div className="pt-4 border-t border-border flex flex-col sm:flex-row gap-3">
              <a
                href="mailto:support@carzzi.com?subject=Account%20Deletion%20Request"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                Email deletion request
                <ArrowRight className="w-4 h-4" />
              </a>
              <Link
                to="/privacy"
                className="inline-flex items-center justify-center px-5 py-3 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-muted/60 transition-colors"
              >
                View Privacy Policy
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AccountDeletionPage;
