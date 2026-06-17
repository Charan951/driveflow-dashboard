import React, { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Wrench, 
  Shield, 
  Droplets, 
  Battery, 
  CheckCircle,
  ArrowRight,
  Clock,
  CreditCard,
  Car,
} from 'lucide-react';
import { serviceService, Service } from '@/services/serviceService';
import { heroService } from '@/services/heroService';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

const PublicServices = () => {
  const { hash } = useLocation();
  const [searchParams] = useSearchParams();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [hero, setHero] = useState({
    image: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=80&w=2000",
    title: "Professional Vehicle Services",
    subtitle: "Comprehensive maintenance, repair, and detailing services delivered at your convenience."
  });
  const { isAuthenticated, role } = useAuthStore();
  const navigate = useNavigate();

  const categoryParam = searchParams.get('category'); // "Cars"
  const serviceParam = searchParams.get('service'); // "Periodic Service", "Teflon Coating", etc.

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchServices(),
        fetchHero()
      ]);
    } catch (error) {
      console.error('Failed to fetch services:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHero = async () => {
    try {
      const data = await heroService.getHeroSettings();
      const pageHero = data.pageHeroes?.['services'];
      if (pageHero) {
        setHero({
          image: pageHero.image || hero.image,
          title: pageHero.title || hero.title,
          subtitle: pageHero.subtitle || hero.subtitle
        });
      }
    } catch (error) {
      console.error('Failed to fetch services hero from S3', error);
    }
  };

  useEffect(() => {
    if (hash) {
      const element = document.getElementById(hash.replace('#', ''));
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [hash, services]); // Re-run scroll when services load

  const fetchServices = async () => {
    try {
      const data = await serviceService.getServices();
      setServices(data);
    } catch (error) {
      console.error('Failed to fetch services:', error);
    }
  };

  const getServiceFallbackImage = (category: string) => {
    switch (category) {
      case 'Periodic': return 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&q=80&w=800';
      case 'Repair': return 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&q=80&w=800';
      case 'Wash': return 'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&q=80&w=800';
      case 'Tyres': return 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=80&w=800';
      case 'Denting': 
      case 'Painting': return 'https://images.unsplash.com/photo-1552857187-0b44555d4924?auto=format&fit=crop&q=80&w=800';
      case 'Detailing': return 'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&q=80&w=800';
      case 'AC': return 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=800';
      case 'Accessories': return 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=800';
      case 'Battery': return 'https://images.unsplash.com/photo-1620939511593-29937a54457e?auto=format&fit=crop&q=80&w=800';
      default: return 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&q=80&w=800';
    }
  };

  const filteredServices = services.filter(s => {
    // Only show Car services
    if (s.vehicleType !== 'Car') return false;

    if (serviceParam) {
      const paramLower = serviceParam.toLowerCase();
      
      // 1. Exact match (case insensitive)
      if (s.name.toLowerCase() === paramLower) return true;
      
      // 2. Category match
      if (s.category.toLowerCase() === paramLower) return true;
      
      // 3. Mapping match
      const mappings: Record<string, string[]> = {
        'general service': ['Periodic'],
        'body shop': ['Painting', 'Repair'],
        'essentials': ['Essentials', 'Accessories'],
        'amaron': ['Battery'],
        'exide': ['Battery'],
        'tyres': ['Tyres'],
        'car wash': ['Wash'],
        'tires & battery': ['Tyres', 'Battery'],
        'tyres & battery': ['Tyres', 'Battery']
      };

      const mappedCategories = mappings[paramLower];
      if (mappedCategories && mappedCategories.includes(s.category)) {
        return true;
      }

      // 4. Fallback search (substring match)
      if (s.name.toLowerCase().includes(paramLower)) return true;

      return false;
    }
    
    return true;
  });

  const displayServices = (serviceParam || categoryParam) ? filteredServices : services;
  const isDetailView = !!serviceParam;

  const handleBookNow = (service: Service) => {
    if (isAuthenticated) {
      if (role === 'customer') {
        navigate('/book-service', { state: { service } });
      } else {
        toast.info('Please login as a customer to book a service');
        navigate('/login');
      }
    } else {
      navigate('/login', { state: { from: '/book-service', service } });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 overflow-x-hidden w-full max-w-full">
      {/* Hero Section */}
      <section className="relative h-[260px] sm:h-[340px] flex items-center justify-center overflow-hidden w-full max-w-full pt-16">
        <div className="absolute inset-0 z-0">
          <img 
            src={isDetailView && displayServices.length > 0 ? (displayServices[0].image || getServiceFallbackImage(displayServices[0].category)) : hero.image}
            alt="Services Background" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"></div>
        </div>
        
        <div className="container mx-auto px-4 sm:px-6 text-center relative z-10 text-white w-full max-w-full min-w-0">
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="px-1"
          >
            {isDetailView && (
              <button 
                onClick={() => navigate('/services')}
                className="mb-4 sm:mb-6 inline-flex items-center gap-2 text-sm font-medium text-white/70 hover:text-white transition-colors bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                Back to All Services
              </button>
            )}
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 break-words">
              {isDetailView && displayServices.length > 0 ? displayServices[0].name : hero.title}
            </h1>
            <p className="text-sm sm:text-lg opacity-90 max-w-2xl mx-auto break-words px-1">
              {isDetailView && displayServices.length > 0 ? displayServices[0].description : hero.subtitle}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Services List */}
      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 -mt-6 sm:-mt-10 relative z-20 w-full max-w-full min-w-0">
        {displayServices.length === 0 ? (
           <div className="bg-card/50 backdrop-blur-sm rounded-3xl p-12 shadow-xl border border-border/50 text-center">
             <h3 className="text-2xl font-semibold mb-4">No services found</h3>
             <p className="text-muted-foreground mb-8">
               We couldn't find any services matching your criteria.
             </p>
             <Link to="/services">
               <button className="px-6 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:bg-primary/90 transition-colors">
                 View All Services
               </button>
             </Link>
           </div>
        ) : isDetailView ? (
          <div className="max-w-5xl mx-auto w-full min-w-0">
            {displayServices.map((service) => (
              <motion.div 
                key={service._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl border border-border w-full max-w-full min-w-0"
              >
                <div className="flex flex-col w-full min-w-0">
                  {/* Row 1: Image + Title/Description */}
                  <div className="flex flex-col lg:flex-row gap-0 w-full min-w-0">
                  <div className="lg:w-1/2 p-4 sm:p-6 lg:p-8 flex items-start justify-center min-w-0">
                    <div className="relative rounded-2xl sm:rounded-3xl border border-border/70 bg-muted/30 overflow-hidden p-3 w-full max-w-full">
                      <img
                        src={(service.image && service.image.trim() !== '') ? service.image : getServiceFallbackImage(service.category)}
                        alt={service.name}
                        className="w-full max-w-full h-auto max-h-[280px] sm:max-h-[420px] object-contain mx-auto"
                      />
                    </div>
                  </div>

                  <div className="lg:w-1/2 p-4 sm:p-8 lg:p-10 min-w-0">
                    <div className="space-y-4 sm:space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight text-foreground break-words min-w-0">{service.name}</h2>
                        <span className="bg-primary/10 text-primary px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider self-start shrink-0">
                          {service.category}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-3 sm:mb-4">Description</h3>
                        <p className="text-base sm:text-lg md:text-xl text-foreground/85 leading-relaxed font-medium italic break-words">
                          "{service.description}"
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                  {/* Row 2: What's Included */}
                  {service.features && service.features.length > 0 && (
                    <div className="px-4 sm:px-8 lg:px-10 pt-2 pb-4 sm:pb-6">
                      <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4 sm:mb-6">What's Included</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {service.features.map((feature, i) => (
                          <div key={i} className="flex items-start gap-3 bg-muted/50 p-3 sm:p-4 rounded-2xl border border-border/50 group hover:border-primary/50 hover:bg-primary/5 transition-colors min-w-0">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0">
                              <CheckCircle className="w-5 h-5 text-primary" />
                            </div>
                            <span className="text-sm font-semibold text-foreground/90 break-words">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Row 3: Bottom details row */}
                  <div className="mx-4 sm:mx-8 lg:mx-10 mb-6 sm:mb-8 lg:mb-10 pt-6 sm:pt-8 border-t border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-6 sm:gap-8">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6">
                      <div className="text-left">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Service Price</p>
                        <p className="text-3xl sm:text-4xl font-black text-primary">₹{service.price}</p>
                      </div>
                      <div className="h-px sm:h-10 w-full sm:w-px bg-border" />
                      <div className="text-left">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Duration</p>
                        <div className="flex items-center gap-2 text-foreground/80 font-bold">
                          <Clock className="w-4 h-4 text-primary shrink-0" />
                          {service.duration} mins
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => handleBookNow(service)}
                      className="w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 bg-primary text-primary-foreground rounded-2xl font-black text-base sm:text-lg hover:bg-primary/90 transition-all hover:scale-[1.02] shadow-2xl shadow-primary/30 flex items-center justify-center gap-3"
                    >
                      Book Now
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
        <div className="grid gap-12"> 
          {/* Changed from space-y-24 to grid gap-12 for better handling of multiple items */}
          {displayServices.map((service, index) => (
          <motion.div 
            key={service._id}
            id={service._id}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className={`bg-card/50 backdrop-blur-sm rounded-3xl p-4 sm:p-6 lg:p-8 shadow-xl border border-border/50 flex flex-col w-full max-w-full min-w-0 overflow-hidden ${index % 2 === 1 ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-6 sm:gap-8 lg:gap-12 items-stretch lg:items-center`}
          >
            {/* Image Side */}
            <div className="w-full lg:w-1/2 min-w-0">
              <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl group w-full max-w-full bg-muted/20">
                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-300 pointer-events-none" />
                <img 
                  src={(service.image && service.image.trim() !== '') ? service.image : getServiceFallbackImage(service.category)} 
                  alt={service.name} 
                  className="w-full max-w-full h-[220px] sm:h-[320px] lg:h-[400px] object-contain object-center mx-auto transform group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute top-4 right-4 sm:top-6 sm:right-6 bg-white/90 backdrop-blur-md p-3 sm:p-4 rounded-2xl shadow-lg">
                  <Car className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                </div>
              </div>
            </div>

            {/* Content Side */}
            <div className="w-full lg:w-1/2 min-w-0 space-y-4 sm:space-y-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold break-words min-w-0">{service.name}</h2>
                <span className="bg-primary/10 text-primary px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium self-start shrink-0">
                  {service.category}
                </span>
              </div>
              
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed break-words">
                {service.description}
              </p>
              
              {service.features && service.features.length > 0 && (
                <div className="bg-muted/30 p-4 sm:p-6 rounded-2xl border border-border/50 w-full min-w-0">
                  <h3 className="font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-primary shrink-0" />
                    What's Included:
                  </h3>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    {service.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground min-w-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                        <span className="break-words">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-border/50">
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">Price</p>
                  <p className="text-2xl sm:text-3xl font-bold text-primary">₹{service.price}</p>
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 shrink-0" /> {service.duration} mins
                  </p>
                </div>
                <button 
                  onClick={() => handleBookNow(service)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-primary text-primary-foreground rounded-full font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                >
                  Book Now
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
        </div>
        )}
      </div>

      {/* Bottom CTA */}
      <section className="container mx-auto px-4 mt-24 mb-12">
        <div className="bg-primary text-primary-foreground rounded-3xl p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-6">Need something else?</h2>
            <p className="text-primary-foreground/80 mb-8 text-lg">
              We offer custom service packages tailored to your specific vehicle needs. 
              Contact our support team for a personalized quote.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/contact"
                className="px-8 py-3 bg-white text-primary rounded-full font-bold hover:bg-gray-100 transition-colors"
              >
                Contact Support
              </Link>
              <Link 
                to="/register"
                className="px-8 py-3 bg-primary-foreground/10 backdrop-blur-sm border border-white/20 text-white rounded-full font-bold hover:bg-primary-foreground/20 transition-colors"
              >
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PublicServices;
