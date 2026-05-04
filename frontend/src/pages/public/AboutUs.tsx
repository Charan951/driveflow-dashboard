import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Award, Users, Clock, Shield, CheckCircle, Target, Heart, Wrench, Car, Zap, Sparkles, AlertTriangle, ArrowRight, Star } from "lucide-react";
import { heroService } from "@/services/heroService";
import { easeOut } from "framer-motion";

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: easeOut } }
} as any;

const fadeInLeft = {
  hidden: { opacity: 0, x: -60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: easeOut } }
} as any;

const fadeInRight = {
  hidden: { opacity: 0, x: 60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: easeOut } }
} as any;

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2
    }
  }
} as any;

const AboutUs = () => {
  const [hero, setHero] = useState({
    image: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80&w=2400",
    title: "About Us – Carzzi",
    subtitle: "Redefining how vehicle owners experience car care"
  });

  const fetchHero = useCallback(async () => {
    try {
      const data = await heroService.getHeroSettings();
      const pageHero = data.pageHeroes?.['about'];
      if (pageHero) {
        setHero(prev => ({
          image: pageHero.image || prev.image,
          title: pageHero.title || prev.title,
          subtitle: pageHero.subtitle || prev.subtitle
        }));
      }
    } catch (error) {
      console.error('Failed to fetch about hero from S3', error);
    }
  }, []);

  useEffect(() => {
    fetchHero();
  }, [fetchHero]);

  const services = [
    {
      icon: Wrench,
      title: "End-to-End Car Servicing",
      image: "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&q=80&w=1200",
      features: [
        "Book your service directly through the app",
        "Doorstep vehicle pickup and drop",
        "Servicing at authorized service centers only",
        "Real-time updates at every stage",
        "Instant approval for additional work — no calls, no confusion",
        "Clean, clutter-free communication (no spam, no WhatsApp overload)",
        "Vehicle delivered back after service completion"
      ],
      bonus: "Get access to real-time vehicle health data directly in the app."
    },
    {
      icon: Zap,
      title: "Battery & Tyre Services",
      image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&q=80&w=1200",
      features: [
        "Battery replacement",
        "Tyre replacement",
        "Wheel balancing",
        "Wheel alignment"
      ]
    },
    {
      icon: Sparkles,
      title: "Premium Car Washing",
      image: "https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&q=80&w=1200",
      features: [
        "Interior & exterior cleaning",
        "Professional-grade products",
        "Attention to detail for a spotless finish"
      ]
    },
    {
      icon: AlertTriangle,
      title: "Breakdown Assistance",
      image: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&q=80&w=1200",
      features: [
        "Quick response during breakdowns",
        "Reliable support when you need it the most",
        "Ensuring your safety and minimal downtime"
      ]
    }
  ];

  const whyChoose = [
    {
      icon: Shield,
      title: "100% Transparency",
      desc: "No hidden work, no surprises",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: Award,
      title: "Authorized Service Only",
      desc: "Your car is in trusted hands",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: Zap,
      title: "Tech-Driven Experience",
      desc: "Real-time tracking & vehicle health data",
      color: "from-orange-500 to-red-500"
    },
    {
      icon: Heart,
      title: "Zero Noise Communication",
      desc: "No unnecessary calls or clutter",
      color: "from-green-500 to-emerald-500"
    }
  ];

  const stats = [
    { number: "100%", label: "Transparent", icon: Shield },
    { number: "24/7", label: "Support", icon: Clock },
    { number: "5000+", label: "Happy Customers", icon: Users },
    { number: "4.9", label: "Rating", icon: Star }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative h-[600px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={hero.image}
            alt="About Us Background" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-background"></div>
        </div>
        
        <div className="container mx-auto px-4 text-center relative z-10 text-white">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="max-w-4xl mx-auto"
          >
            <motion.div 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-8"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <Car className="w-5 h-5" />
              <span className="text-sm font-medium">Welcome to Carzzi</span>
            </motion.div>
            <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
              <span className="bg-gradient-to-r from-white via-gray-200 to-white bg-clip-text text-transparent">
                {hero.title}
              </span>
            </h1>
            <p className="text-xl md:text-2xl opacity-90 mb-12 leading-relaxed max-w-2xl mx-auto">
              {hero.subtitle}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-8 bg-gradient-to-r from-primary via-primary/90 to-primary">
        <div className="container mx-auto px-4">
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
          >
            {stats.map((stat, index) => (
              <motion.div key={index} variants={fadeInUp} className="p-6">
                <div className="flex justify-center mb-3">
                  <stat.icon className="w-8 h-8 text-primary-foreground/80" />
                </div>
                <div className="text-4xl md:text-5xl font-black text-primary-foreground mb-1">{stat.number}</div>
                <div className="text-primary-foreground/80 text-lg font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Introduction Section */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInLeft}
              className="relative"
            >
              <div className="relative z-10">
                <img 
                  src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1200" 
                  alt="Car care service" 
                  className="rounded-3xl shadow-2xl w-full h-[500px] object-cover"
                />
              </div>
              <div className="absolute -bottom-8 -right-8 w-48 h-48 bg-gradient-to-br from-primary to-primary/60 rounded-3xl -z-10"></div>
              <div className="absolute -top-8 -left-8 w-32 h-32 bg-gradient-to-br from-accent to-accent/60 rounded-2xl -z-10"></div>
            </motion.div>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInRight}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6">
                <Car className="w-4 h-4" />
                Our Story
              </div>
              <h2 className="text-4xl md:text-5xl font-black mb-8 text-foreground leading-tight">
                Redefining <span className="text-primary">Car Care</span>
              </h2>
              <p className="text-muted-foreground mb-6 text-xl leading-relaxed">
                At Carzzi, we’re redefining how vehicle owners experience car care. Built for convenience, transparency, and control, Carzzi is a tech-driven mobility platform designed to eliminate the chaos and uncertainty that comes with traditional car servicing.
              </p>
              <p className="text-muted-foreground text-xl leading-relaxed">
                Carzzi is owned and operated by <span className="font-bold text-foreground">Hyper Mobility Services</span>, an Indian partnership firm.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* What We Do Section */}
      <section className="py-24 md:py-32 bg-gradient-to-b from-muted/50 to-background">
        <div className="container mx-auto px-4">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="text-center max-w-3xl mx-auto mb-20"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6">
              <Wrench className="w-4 h-4" />
              Our Services
            </div>
            <h2 className="text-4xl md:text-5xl font-black mb-6">What We Do</h2>
            <p className="text-xl text-muted-foreground">
              Carzzi is your one-stop solution for everything your car needs — from servicing and maintenance to emergency support — all managed effortlessly through a single app.
            </p>
          </motion.div>
          
          <div className="space-y-12">
            {services.map((service, index) => (
              <motion.div
                key={index}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeInUp}
                className={`bg-background rounded-3xl overflow-hidden shadow-xl border border-border/50 hover:shadow-2xl transition-all duration-500 ${index % 2 === 1 ? 'lg:flex-row-reverse' : ''} lg:flex`}
              >
                <div className="lg:w-1/2">
                  <img 
                    src={service.image} 
                    alt={service.title}
                    className="w-full h-64 lg:h-full object-cover"
                  />
                </div>
                <div className="lg:w-1/2 p-8 md:p-12">
                  <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg">
                    <service.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-3xl font-black mb-6 text-foreground">{service.title}</h3>
                  <ul className="space-y-4 mb-6">
                    {service.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-4">
                        <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-muted-foreground text-lg">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {service.bonus && (
                    <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl p-4 border border-primary/20">
                      <p className="text-primary font-bold text-lg flex items-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        Bonus: {service.bonus}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Carzzi Section */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="text-center max-w-3xl mx-auto mb-20"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6">
              <Star className="w-4 h-4" />
              Why Choose Us
            </div>
            <h2 className="text-4xl md:text-5xl font-black mb-6">Why Carzzi?</h2>
            <p className="text-xl text-muted-foreground">
              We stand out from the crowd with our unwavering commitment to excellence.
            </p>
          </motion.div>
          
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {whyChoose.map((feature, index) => (
              <motion.div 
                key={index}
                variants={fadeInUp}
                className="group bg-background p-8 rounded-3xl shadow-sm border border-border hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 text-center"
              >
                <div className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg mx-auto group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Vision & Mission Section */}
      <section className="py-24 md:py-32 bg-gradient-to-b from-muted/50 to-background">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInLeft}
              className="bg-gradient-to-br from-primary/5 to-primary/10 p-10 rounded-3xl border border-primary/20 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/20 to-transparent rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 text-primary text-sm font-semibold mb-6">
                  <Target className="w-4 h-4" />
                  Our Vision
                </div>
                <h3 className="text-3xl font-black mb-6 text-foreground">Our Vision</h3>
                <p className="text-muted-foreground text-xl leading-relaxed">
                  To become Hyderabad’s most trusted and intelligent car care platform, delivering a complete ecosystem where vehicle owners can manage every aspect of their car effortlessly.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInRight}
              className="bg-gradient-to-br from-accent/5 to-accent/10 p-10 rounded-3xl border border-accent/20 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-accent/20 to-transparent rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 text-accent text-sm font-semibold mb-6">
                  <Heart className="w-4 h-4" />
                  Our Mission
                </div>
                <h3 className="text-3xl font-black mb-6 text-foreground">Our Mission</h3>
                <p className="text-muted-foreground text-xl leading-relaxed">
                  To simplify car ownership by creating a single, reliable platform that handles everything — so you never have to worry about your car again.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutUs;