import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Scale, AlertTriangle, Link as LinkIcon, Globe, Edit, Shield, Gavel } from 'lucide-react';

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
            <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
              Web Site Terms and Conditions of Use
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              General Terms and Conditions applicable to Use of a Web Site.
            </p>
          </div>

          {/* Content */}
          <div className="bg-card border border-border rounded-3xl p-8 md:p-12 space-y-10 shadow-sm">
            
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2 text-foreground">
                <FileText className="w-6 h-6 text-primary" />
                1. Terms
              </h2>
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <p>
                  By accessing this web site, you are agreeing to be bound by these web site Terms and Conditions of Use, applicable laws and regulations and their compliance. If you disagree with any of the stated terms and conditions, you are prohibited from using or accessing this site. The materials contained in this site are secured by relevant copyright and trade mark law.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2 text-foreground">
                <Scale className="w-6 h-6 text-primary" />
                2. Use License
              </h2>
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <p>
                  Permission is allowed to temporarily download one duplicate of the materials (data or programming) on VehicleCare’s site for individual and non-business use only. This is the just a permit of license and not an exchange of title, and under this permit you may not:
                </p>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>modify or copy the materials;</li>
                  <li>use the materials for any commercial use , or for any public presentation (business or non-business);</li>
                  <li>attempt to decompile or rebuild any product or material contained on VehicleCare’s site;</li>
                  <li>remove any copyright or other restrictive documentations from the materials; or</li>
                  <li>transfer the materials to someone else or even “mirror” the materials on other server.</li>
                </ul>
                <p>
                  This permit might consequently be terminated if you disregard any of these confinements and may be ended by VehicleCare whenever deemed. After permit termination or when your viewing permit is terminated, you must destroy any downloaded materials in your ownership whether in electronic or printed form.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2 text-foreground">
                <AlertTriangle className="w-6 h-6 text-primary" />
                3. Disclaimer
              </h2>
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <p>
                  The materials on VehicleCare’s site are given “as is”. VehicleCare makes no guarantees, communicated or suggested, and thus renounces and nullifies every single other warranties, including without impediment, inferred guarantees or states of merchantability, fitness for a specific reason, or non-encroachment of licensed property or other infringement of rights. Further, VehicleCare does not warrant or make any representations concerning the precision, likely results, or unwavering quality of the utilization of the materials on its Internet site or generally identifying with such materials or on any destinations connected to this website.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2 text-foreground">
                <Shield className="w-6 h-6 text-primary" />
                4. Constraints
              </h2>
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <p>
                  In no occasion should VehicleCare or its suppliers subject for any harms (counting, without constraint, harms for loss of information or benefit, or because of business interference,) emerging out of the utilization or powerlessness to utilize the materials on VehicleCare’s Internet webpage, regardless of the possibility that VehicleCare or a VehicleCare approved agent has been told orally or in written of the likelihood of such harm. Since a few purviews don’t permit constraints on inferred guarantees, or impediments of obligation for weighty or coincidental harms, these confinements may not make a difference to you.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2 text-foreground">
                <Edit className="w-6 h-6 text-primary" />
                5. Amendments and Errata
              </h2>
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <p>
                  The materials showing up on VehicleCare’s site could incorporate typographical, or photographic mistakes. VehicleCare does not warrant that any of the materials on its site are exact, finished, or current. VehicleCare may roll out improvements to the materials contained on its site whenever without notification. VehicleCare does not, then again, make any dedication to update the materials.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2 text-foreground">
                <LinkIcon className="w-6 h-6 text-primary" />
                6. Links
              </h2>
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <p>
                  VehicleCare has not checked on the majority of the websites or links connected to its website and is not in charge of the substance of any such connected webpage. The incorporation of any connection does not infer support by VehicleCare of the site. Utilization of any such connected site is at the user’s own risk.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2 text-foreground">
                <Globe className="w-6 h-6 text-primary" />
                7. Site Terms of Use Modifications
              </h2>
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <p>
                  VehicleCare may update these terms of utilization for its website whenever without notification. By utilizing this site you are consenting to be bound by the then current form of these Terms and Conditions of Use.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2 text-foreground">
                <Gavel className="w-6 h-6 text-primary" />
                8. Governing Law
              </h2>
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <p>
                  Any case identifying with VehicleCare’s site should be administered by the laws of the country of india VehicleCare State without respect to its contention of law provisions.
                </p>
              </div>
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

export default TermsPage;
