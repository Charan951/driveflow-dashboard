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
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

const PublicServices = () => {
  const { hash } = useLocation();
  const [searchParams] = useSearchParams();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, role } = useAuthStore();
  const navigate = useNavigate();

  const categoryParam = searchParams.get('category'); // "Cars"
  const serviceParam = searchParams.get('service'); // "Periodic Service", "Teflon Coating", etc.

  useEffect(() => {
    fetchServices();
  }, []);

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
      setLoading(true);
      const data = await serviceService.getServices();
      setServices(data);
    } catch (error) {
      console.error('Failed to fetch services:', error);
      // Fallback to static data or show error? 
      // For now, we'll just show empty or let the static part handle it if we kept it.
      // But we are replacing static data.
    } finally {
      setLoading(false);
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
      case 'Insurance': return 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&q=80&w=800';
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
        'insurance claim': ['Insurance'],
        'amaron': ['Battery'],
        'exide': ['Battery'],
        'tyres': ['Tyres']
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
    <div className="min-h-screen bg-background pb-20">
      {/* Hero Section */}
      <section className="relative h-[300px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={isDetailView && displayServices.length > 0 ? (displayServices[0].image || getServiceFallbackImage(displayServices[0].category)) : "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=80&w=2000"}
            alt="Services Background" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"></div>
        </div>
        
        <div className="container mx-auto px-4 text-center relative z-10 text-white">
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {isDetailView && (
              <button 
                onClick={() => navigate('/services')}
                className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-white/70 hover:text-white transition-colors bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                Back to All Services
              </button>
            )}
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              {isDetailView && displayServices.length > 0 ? displayServices[0].name : 'Our Services'}
            </h1>
            <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto leading-relaxed">
              {isDetailView && displayServices.length > 0
                ? displayServices[0].description
                : 'Comprehensive automotive care solutions designed for your convenience and safety.'}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Services List */}
      <div className="container mx-auto px-4 py-12 -mt-10 relative z-20">
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
          <div className="max-w-5xl mx-auto">
            {displayServices.map((service) => (
              <motion.div 
                key={service._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-[2.5rem] overflow-hidden shadow-2xl border border-border"
              >
                <div className="flex flex-col lg:flex-row">
                  {/* Left Side: Large Image */}
                  <div className="lg:w-1/2 relative h-[300px] lg:h-auto min-h-[400px]">
                    <img 
                      src={(service.image && service.image.trim() !== '') ? service.image : getServiceFallbackImage(service.category)} 
                      alt={service.name} 
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent lg:bg-gradient-to-r" />
                    <div className="absolute bottom-8 left-8 text-white">
                      <div className="bg-primary/90 backdrop-blur-md px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-widest mb-4 inline-block">
                        {service.category}
                      </div>
                      <h2 className="text-4xl font-black">{service.name}</h2>
                    </div>
                  </div>

                  {/* Right Side: Details */}
                  <div className="lg:w-1/2 p-10 lg:p-14 space-y-10 flex flex-col justify-between">
                    <div className="space-y-8">
                      <div>
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4">Description</h3>
                        <p className="text-xl text-foreground/80 leading-relaxed font-medium italic">
                          "{service.description}"
                        </p>
                      </div>

                      {service.features && service.features.length > 0 && (
                        <div>
                          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-6">What's Included</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {service.features.map((feature, i) => (
                              <div key={i} className="flex items-center gap-3 bg-muted/50 p-4 rounded-2xl border border-border/50 group hover:border-primary/50 transition-colors">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                  <CheckCircle className="w-5 h-5 text-primary" />
                                </div>
                                <span className="text-sm font-semibold text-foreground/90">{feature}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-10 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-8">
                      <div className="flex items-center gap-6">
                        <div className="text-center sm:text-left">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Service Price</p>
                          <p className="text-4xl font-black text-primary">₹{service.price}</p>
                        </div>
                        <div className="h-10 w-px bg-border hidden sm:block" />
                        <div className="text-center sm:text-left">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Duration</p>
                          <div className="flex items-center gap-2 text-foreground/80 font-bold">
                            <Clock className="w-4 h-4 text-primary" />
                            {service.duration} mins
                          </div>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => handleBookNow(service)}
                        className="w-full sm:w-auto px-10 py-5 bg-primary text-primary-foreground rounded-2xl font-black text-lg hover:bg-primary/90 transition-all hover:scale-105 shadow-2xl shadow-primary/30 flex items-center justify-center gap-3"
                      >
                        Book Now
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    </div>
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
            className={`bg-card/50 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-border/50 flex flex-col ${index % 2 === 1 ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-12 items-center`}
          >
            {/* Image Side */}
            <div className="w-full lg:w-1/2">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl group">
                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-300" />
                <img 
                  src={(service.image && service.image.trim() !== '') ? service.image : getServiceFallbackImage(service.category)} 
                  alt={service.name} 
                  className="w-full h-[400px] object-cover transform group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute top-6 right-6 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-lg">
                  <Car className="w-8 h-8 text-primary" />
                </div>
              </div>
            </div>

            {/* Content Side */}
            <div className="w-full lg:w-1/2 space-y-6">
              <div className="flex justify-between items-start">
                <h2 className="text-3xl md:text-4xl font-bold">{service.name}</h2>
                <span className="bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium">
                  {service.category}
                </span>
              </div>
              
              <p className="text-lg text-muted-foreground leading-relaxed">
                {service.description}
              </p>
              
              {service.features && service.features.length > 0 && (
                <div className="bg-muted/30 p-6 rounded-2xl border border-border/50">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-primary" />
                    What's Included:
                  </h3>
                  <ul className="grid sm:grid-cols-2 gap-3">
                    {service.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-border/50">
                <div>
                  <p className="text-sm text-muted-foreground">Price</p>
                  <p className="text-3xl font-bold text-primary">₹{service.price}</p>
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {service.duration} mins
                  </p>
                </div>
                <button 
                  onClick={() => handleBookNow(service)}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-full font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
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
