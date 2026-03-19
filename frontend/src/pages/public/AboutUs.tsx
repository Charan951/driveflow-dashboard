import React from "react";
import { motion } from "framer-motion";
import { Award, Users, Clock, Shield, CheckCircle, Target, Heart, Wrench } from "lucide-react";

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const AboutUs = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative h-[400px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=2000"
            alt="About Us Background" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
        </div>
        
        <div className="container mx-auto px-4 text-center relative z-10 text-white">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="max-w-3xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Revolutionizing Vehicle Care
            </h1>
            <p className="text-xl opacity-90 mb-8 leading-relaxed">
              We're on a mission to make car maintenance as simple as ordering a pizza. 
              Quality service, transparent pricing, and convenience at your doorstep.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission Section */}
      <div className="container mx-auto px-4 py-16 -mt-20 relative z-20">
        <div className="bg-card/50 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-border/50">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <img 
                src="https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=1000" 
                alt="Mechanic working on car" 
                className="rounded-2xl shadow-2xl w-full h-[400px] object-cover"
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                <Target className="w-4 h-4" />
                Our Mission
              </div>
              <h2 className="text-3xl font-bold mb-6 text-foreground">Driven by Excellence, Service You Can Trust</h2>
              <p className="text-muted-foreground mb-6 text-lg">
                Founded in 2024, DriveFlow started with a simple question: "Why is car maintenance so complicated?" 
                We decided to build a platform that connects car owners with trusted mechanics, ensuring transparency 
                and quality every step of the way.
              </p>
              <div className="space-y-4">
                {[
                  "Certified & Vetted Mechanics",
                  "Transparent Pricing - No Hidden Fees",
                  "Real-time Service Tracking",
                  "12-Month Warranty on Parts & Labor"
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="font-medium text-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { number: "15k+", label: "Happy Customers", icon: Users },
              { number: "50k+", label: "Services Completed", icon: Wrench },
              { number: "4.8", label: "Average Rating", icon: Heart },
              { number: "24/7", label: "Support Available", icon: Clock },
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-6"
              >
                <div className="flex justify-center mb-4">
                  <stat.icon className="w-8 h-8 opacity-80" />
                </div>
                <div className="text-4xl font-bold mb-2">{stat.number}</div>
                <div className="text-primary-foreground/80">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold mb-4">Why Choose DriveFlow?</h2>
            <p className="text-muted-foreground">
              We're not just another car service app. We're your partner in vehicle maintenance.
            </p>
          </div>
          
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-8"
          >
            {[
              {
                icon: Shield,
                title: "Trusted & Secure",
                desc: "Every mechanic is background checked and verified. Your vehicle is insured during service."
              },
              {
                icon: Clock,
                title: "Time Saving",
                desc: "We pick up and drop off your car. No more waiting at the repair shop for hours."
              },
              {
                icon: Award,
                title: "Premium Quality",
                desc: "We use only genuine parts and follow manufacturer recommended service guidelines."
              }
            ].map((feature, index) => (
              <motion.div 
                key={index}
                variants={fadeInUp}
                className="bg-background p-8 rounded-2xl shadow-sm border border-border hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-6">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>


    </div>
  );
};

export default AboutUs;
