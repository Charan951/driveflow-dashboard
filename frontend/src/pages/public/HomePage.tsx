import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wrench, 
  Shield, 
  ArrowRight,
  ChevronRight,
  Droplets,
  Battery,
  Clock,
  CheckCircle,
  Users,
  Truck,
  Star,
  Zap,
  Disc,
  PaintBucket,
  Thermometer,
  Package
} from 'lucide-react';
import { staggerContainer, staggerItem } from '@/animations/variants';
import { serviceService, Service } from '@/services/serviceService';
import { heroService } from '@/services/heroService';

const staticServices = [
  { 
    icon: Wrench, 
    title: 'Maintenance', 
    description: 'Complete vehicle servicing and repairs by certified professionals.', 
    color: 'bg-blue-500', 
    image: "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&q=80&w=800",
    link: '/services?category=Cars&service=Periodic%20Maintenance'
  },
  { 
    icon: Shield, 
    title: 'Insurance', 
    description: 'Comprehensive coverage plans to keep you protected on the road.', 
    color: 'bg-purple-500', 
    image: "https://images.unsplash.com/photo-1560520134-94391c380e1a?auto=format&fit=crop&q=80&w=800",
    link: '/contact'
  },
  { 
    icon: Droplets, 
    title: 'Car Wash', 
    description: 'Premium washing and detailing packages for that showroom shine.', 
    color: 'bg-cyan-500', 
    image: "https://images.unsplash.com/photo-1607958996333-41a2c7324e8f?auto=format&fit=crop&q=80&w=800",
    link: '/services?category=Cars&service=Car%20Wash'
  },
  { 
    icon: Battery, 
    title: 'Tires & Battery', 
    description: 'Quality parts replacement and installation you can trust.', 
    color: 'bg-orange-500', 
    image: "https://images.unsplash.com/photo-1579454320454-3d69559b3173?auto=format&fit=crop&q=80&w=800",
    link: '/services?category=Cars&service=Tyres%20%26%20Battery'
  },
];

const howItWorks = [
  { step: 1, title: 'Add Your Vehicle', description: 'Register your vehicle details in our system' },
  { step: 2, title: 'Book a Service', description: 'Choose from our wide range of services' },
  { step: 3, title: 'Pickup & Service', description: 'Our driver picks up your vehicle for service' },
  { step: 4, title: 'Track & Relax', description: 'Real-time updates on your service status' },
];

const defaultHeroSlides = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80&w=1920",
    titleWhite: "Vehicle Care",
    titleBlue: "Reimagined",
    subtitle: "Experience premium vehicle services at your doorstep. Book, track, and manage all your car needs in one seamless platform."
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=80&w=1920",
    titleWhite: "Expert",
    titleBlue: "Maintenance",
    subtitle: "Certified mechanics, genuine parts, and transparent pricing. We treat your car like our own."
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?auto=format&fit=crop&q=80&w=1920",
    titleWhite: "Premium",
    titleBlue: "Detailing",
    subtitle: "Give your vehicle the shine it deserves with our eco-friendly and detailed washing services."
  }
];

const HomePage: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [heroSlides, setHeroSlides] = useState<any[]>(defaultHeroSlides);
  // Initialize with staticServices to ensure content is always visible (Optimistic UI / Fallback)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [services, setServices] = useState<any[]>(staticServices);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      if (heroSlides.length > 0) {
        setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchServices(),
        fetchHeroSlides()
      ]);
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (heroSlides.length > 0 && currentSlide >= heroSlides.length) {
      setCurrentSlide(0);
    }
  }, [heroSlides.length, currentSlide]);

  const fetchHeroSlides = async () => {
    try {
      const data = await heroService.getHeroSettings();
      if (data.homeSlides && data.homeSlides.length > 0) {
        // Migrate or ensure fields exist
        const processedSlides = data.homeSlides.map(s => {
          if (s.title && !s.titleWhite && !s.titleBlue) {
            const parts = s.title.split(' ');
            const titleBlue = parts.pop() || '';
            const titleWhite = parts.join(' ');
            return { ...s, titleWhite, titleBlue };
          }
          return {
            ...s,
            titleWhite: s.titleWhite || '',
            titleBlue: s.titleBlue || ''
          };
        });
        setHeroSlides(processedSlides);
      }
    } catch (error) {
      console.error('Failed to fetch hero settings from S3', error);
    }
  };

  const fetchServices = async () => {
    try {
      const data = await serviceService.getServices();
      // Transform data to display format
      if (data && Array.isArray(data) && data.length > 0) {
        // We want to show a mix of services, maybe top 4 or random 4
        // For now, let's take the first 4
        const mappedServices = data.slice(0, 4).map((service: Service) => {
          const config = getServiceConfig(service.category);
          return {
            icon: config.icon,
            title: service.name,
            description: service.description,
            color: config.color,
            image: service.image || 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&q=80&w=800',
            link: `/services?category=Cars&service=${encodeURIComponent(service.name)}`
          };
        });
        setServices(mappedServices);
      }
      // If data is empty or fetch fails, we keep the initial staticServices
    } catch (error) {
      console.error('Failed to fetch services', error);
      // Keep static services on error
    } finally {
      setLoading(false);
    }
  };

  const getServiceConfig = (category: string) => {
    switch (category) {
      case 'Periodic': return { icon: Wrench, color: 'bg-blue-500' };
      case 'Repair': return { icon: Wrench, color: 'bg-red-500' };
      case 'Wash': return { icon: Droplets, color: 'bg-cyan-500' };
      case 'Tyres': return { icon: Disc, color: 'bg-orange-500' };
      case 'Denting': 
      case 'Painting': return { icon: PaintBucket, color: 'bg-purple-500' };
      case 'Detailing': return { icon: Star, color: 'bg-indigo-500' };
      case 'AC': return { icon: Thermometer, color: 'bg-sky-500' };
      case 'Accessories': return { icon: Package, color: 'bg-green-500' };
      default: return { icon: Wrench, color: 'bg-gray-500' };
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative w-full h-[100dvh] min-h-[600px] flex items-center overflow-hidden">
        {/* Carousel Background */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0 z-0"
          >
            <img 
              src={heroSlides[currentSlide]?.image || ''}
              alt={heroSlides[currentSlide]?.title || ''}
              className="w-full h-full object-cover object-center transition-opacity duration-1000"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent" />
          </motion.div>
        </AnimatePresence>
        
        <div className="container relative z-10 mx-auto px-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="max-w-4xl"
            >
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-[1.1]">
                {heroSlides[currentSlide]?.titleWhite || ''} <br />
                <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">
                  {heroSlides[currentSlide]?.titleBlue || ''}
                </span>
              </h1>
              <p className="text-lg md:text-xl text-gray-200 mb-8 max-w-2xl leading-relaxed opacity-90">
                {heroSlides[currentSlide]?.subtitle || ''}
              </p>
              <div className="flex flex-row items-center gap-3 sm:gap-5">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 sm:px-10 sm:py-4.5 bg-primary text-primary-foreground rounded-full font-bold text-lg sm:text-xl hover:bg-primary/90 transition-all duration-300 shadow-xl hover:shadow-primary/40 hover:-translate-y-1.5 whitespace-nowrap"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4 sm:w-6 sm:h-6" />
                </Link>
                <Link
                  to="/about-us"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 sm:px-10 sm:py-4.5 bg-white/5 backdrop-blur-xl text-white rounded-full font-bold text-lg sm:text-xl hover:bg-white/15 transition-all border border-white/30 whitespace-nowrap"
                >
                  Learn More
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Bar: Indicators & Stats */}
        <div className="absolute bottom-0 left-0 right-0 z-20 pb-10 md:pb-16">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row md:items-end justify-start gap-8">
              {/* Slider Indicators */}
              <div className="flex gap-3 mb-2">
                {heroSlides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`h-2 rounded-full transition-all duration-700 ${
                      currentSlide === index ? 'w-16 bg-primary shadow-lg shadow-primary/50' : 'w-3 bg-white/30 hover:bg-white/50'
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Premium Services
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Everything your car needs, delivered with excellence.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {services.map((service, index) => (
              <motion.div
                key={index}
                variants={staggerItem}
                className="h-full"
              >
                <Link
                  to={service.link}
                  className="group block relative overflow-hidden rounded-2xl bg-card border border-border shadow-sm hover:shadow-xl transition-all duration-300 h-full"
                >
                  <div className="aspect-[4/3] overflow-hidden">
                    <img 
                      src={service.image} 
                      alt={service.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                    <div className={`absolute top-4 right-4 p-3 rounded-xl ${service.color} text-white shadow-lg`}>
                      <service.icon className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-2">{service.title}</h3>
                    <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                      {service.description}
                    </p>
                    <span 
                      className="inline-flex items-center text-primary font-medium group-hover:gap-2 transition-all"
                    >
                      View Details <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                Why Drivers Choose <span className="text-primary">Carzzi</span>
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                We combine technology with automotive expertise to deliver a service experience 
                that fits your modern lifestyle.
              </p>
              
              <div className="space-y-6">
                {[
                  { icon: Truck, title: "Free Pickup & Delivery", desc: "We handle the logistics so you don't have to." },
                  { icon: Clock, title: "Real-time Tracking", desc: "Monitor your service status every step of the way." },
                  { icon: CheckCircle, title: "Quality Guaranteed", desc: "100% satisfaction promise on all services." },
                  { icon: Users, title: "Expert Professionals", desc: "Verified professionals with years of experience." }
                ].map((item, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                      <item.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-1">{item.title}</h3>
                      <p className="text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-3xl blur-3xl" />
              <img 
                src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1000" 
                alt="App Dashboard Preview" 
                className="relative rounded-3xl shadow-2xl border border-white/10"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary z-0">
          <img 
            src="https://images.unsplash.com/photo-1485291571150-772bcfc10da5?auto=format&fit=crop&q=80&w=2000" 
            alt="Road texture" 
            className="w-full h-full object-cover opacity-10 mix-blend-overlay"
          />
        </div>
        <div className="container relative z-10 mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto"
          >
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              Ready to Hit the Road?
            </h2>
            <p className="text-white/80 text-xl mb-10">
              Join thousands of happy customers who trust Carzzi for all their vehicle needs.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 px-10 py-4 bg-white text-primary rounded-full font-bold text-lg hover:bg-gray-100 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1"
            >
              Create Free Account
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
