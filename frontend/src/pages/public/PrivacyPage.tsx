import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, Eye, FileCheck, Database, Server, UserCheck, RefreshCw } from 'lucide-react';

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
            <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
              Privacy Policy
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Your privacy is critical to us.
            </p>
          </div>

          {/* Content */}
          <div className="bg-card border border-border rounded-3xl p-8 md:p-12 space-y-8 shadow-sm">
            
            <div className="text-muted-foreground leading-relaxed space-y-4 mb-8">
              <p>
                Likewise, we have built up this Policy with the end goal you should see how we gather, utilize, impart and reveal and make utilization of individual data. The following blueprints our privacy policy.
              </p>
            </div>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2 text-foreground">
                <Eye className="w-6 h-6 text-primary" />
                Information Collection Purpose
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Before or at the time of collecting personal information, we will identify the purposes for which information is being collected.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2 text-foreground">
                <Database className="w-6 h-6 text-primary" />
                Usage of Information
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We will gather and utilization of individual data singularly with the target of satisfying those reasons indicated by us and for other good purposes, unless we get the assent of the individual concerned or as required by law.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2 text-foreground">
                <Server className="w-6 h-6 text-primary" />
                Data Retention
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We will just hold individual data the length of essential for the satisfaction of those reasons.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2 text-foreground">
                <FileCheck className="w-6 h-6 text-primary" />
                Lawful Collection
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We will gather individual data by legal and reasonable means and, where fitting, with the information or assent of the individual concerned.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2 text-foreground">
                <RefreshCw className="w-6 h-6 text-primary" />
                Data Accuracy
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Personal information ought to be important to the reasons for which it is to be utilized, and, to the degree essential for those reasons, ought to be exact, finished, and updated.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2 text-foreground">
                <Shield className="w-6 h-6 text-primary" />
                Security Safeguards
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We will protect individual data by security shields against misfortune or burglary, and also unapproved access, divulgence, duplicating, use or alteration.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2 text-foreground">
                <UserCheck className="w-6 h-6 text-primary" />
                Transparency
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We will promptly provide customers with access to our policies and procedures for the administration of individual data.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2 text-foreground">
                <Lock className="w-6 h-6 text-primary" />
                Commitment
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We are focused on leading our business as per these standards with a specific end goal to guarantee that the privacy of individual data is secure and maintained.
              </p>
            </section>

            <div className="pt-8 border-t border-border">
              <p className="text-sm text-center text-muted-foreground">
                © {new Date().getFullYear()} VehicleCare. All Rights Reserved.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PrivacyPage;
