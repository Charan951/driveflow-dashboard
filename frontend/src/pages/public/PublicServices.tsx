import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Clock,
} from 'lucide-react';
import { serviceService, Service } from '@/services/serviceService';
import { heroService } from '@/services/heroService';
import { useAuthStore } from '@/store/authStore';
import { isGeneralServiceItem } from '@/lib/orderPricing';
import { toast } from 'sonner';

const SERVICE_MAPPINGS: Record<string, string[]> = {
  'general service': ['Periodic', 'Services'],
  'periodic maintenance': ['Periodic', 'Services'],
  'body shop': ['Painting', 'Repair'],
  essentials: ['Essentials', 'Accessories'],
  amaron: ['Battery'],
  exide: ['Battery'],
  tyres: ['Tyres'],
  'car wash': ['Wash', 'Car Wash'],
  'tires & battery': ['Tyres', 'Battery', 'Tyre & Battery'],
  'tyres & battery': ['Tyres', 'Battery', 'Tyre & Battery'],
};

const getServiceImage = (service: Service) => {
  if (service.image && service.image.trim() !== '') return service.image;
  switch (service.category) {
    case 'Periodic':
    case 'Services':
    case 'Repair':
      return 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&q=80&w=800';
    case 'Wash':
    case 'Car Wash':
    case 'Detailing':
      return 'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&q=80&w=800';
    case 'Tyres':
    case 'Tyre & Battery':
      return 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=80&w=800';
    case 'Denting':
    case 'Painting':
      return 'https://images.unsplash.com/photo-1552857187-0b44555d4924?auto=format&fit=crop&q=80&w=800';
    case 'AC':
      return 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=800';
    case 'Accessories':
    case 'Essentials':
      return 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=800';
    case 'Battery':
      return 'https://images.unsplash.com/photo-1620939511593-29937a54457e?auto=format&fit=crop&q=80&w=800';
    default:
      return 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&q=80&w=800';
  }
};

const matchesServiceParam = (service: Service, serviceParam: string) => {
  const paramLower = serviceParam.toLowerCase();

  if (service.name.toLowerCase() === paramLower) return true;
  if (service.category.toLowerCase() === paramLower) return true;

  const mappedCategories = SERVICE_MAPPINGS[paramLower];
  if (mappedCategories?.includes(service.category)) return true;

  if (service.name.toLowerCase().includes(paramLower)) return true;

  return false;
};

const PublicServices = () => {
  const { hash } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [hero, setHero] = useState({
    image:
      'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=80&w=2000',
    title: 'Professional Vehicle Services',
    subtitle:
      'Comprehensive maintenance, repair, and detailing services delivered at your convenience.',
  });
  const [activeCategory, setActiveCategory] = useState('All');
  const { isAuthenticated, role } = useAuthStore();
  const navigate = useNavigate();

  const categoryParam = searchParams.get('category');
  const serviceParam = searchParams.get('service');
  const isDetailView = !!serviceParam;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchServices(), fetchHero()]);
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
        setHero((prev) => ({
          image: pageHero.image || prev.image,
          title: pageHero.title || prev.title,
          subtitle: pageHero.subtitle || prev.subtitle,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch services hero from S3', error);
    }
  };

  const fetchServices = async () => {
    try {
      const data = await serviceService.getServices();
      setServices(data);
    } catch (error) {
      console.error('Failed to fetch services:', error);
    }
  };

  const carServices = useMemo(
    () => services.filter((s) => s.vehicleType === 'Car'),
    [services]
  );

  const categories = useMemo(() => {
    const unique = Array.from(new Set(carServices.map((s) => s.category))).sort();
    return ['All', ...unique];
  }, [carServices]);

  useEffect(() => {
    if (!categoryParam || categoryParam.toLowerCase() === 'cars') return;
    const match = categories.find(
      (c) => c.toLowerCase() === categoryParam.toLowerCase()
    );
    if (match) setActiveCategory(match);
  }, [categoryParam, categories]);

  useEffect(() => {
    if (hash) {
      const element = document.getElementById(hash.replace('#', ''));
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [hash, services]);

  const serviceMatches = useMemo(() => {
    if (!serviceParam) return [];
    return carServices.filter((s) => matchesServiceParam(s, serviceParam));
  }, [carServices, serviceParam]);

  const browseServices = useMemo(() => {
    if (activeCategory === 'All') return carServices;
    return carServices.filter((s) => s.category === activeCategory);
  }, [carServices, activeCategory]);

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

  const openServiceDetail = (service: Service) => {
    setSearchParams({ service: service.name });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearServiceFilter = () => {
    navigate('/services');
  };

  const selectCategory = (category: string) => {
    setActiveCategory(category);
    if (category === 'All') {
      setSearchParams({});
    } else {
      setSearchParams({ category });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden w-full max-w-full">
      {/* Compact full-bleed hero (browse only) */}
      {!isDetailView && (
        <section className="relative h-[200px] sm:h-[240px] flex items-center justify-center overflow-hidden w-full pt-16">
          <div className="absolute inset-0 z-0">
            <img
              src={hero.image}
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-foreground/75 via-foreground/65 to-foreground/80" />
          </div>

          <div className="container mx-auto px-4 sm:px-6 text-center relative z-10 text-white">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] text-white/70 mb-2">
                Carzzi
              </p>
              <h1 className="text-2xl sm:text-4xl font-bold mb-2 break-words">
                {hero.title}
              </h1>
              <p className="text-sm sm:text-base text-white/85 max-w-xl mx-auto break-words">
                {hero.subtitle}
              </p>
            </motion.div>
          </div>
        </section>
      )}

      <div
        className={`container mx-auto px-4 sm:px-6 relative z-20 w-full max-w-full min-w-0 ${
          isDetailView ? 'pt-20 sm:pt-24 pb-28 lg:pb-16' : 'py-8 sm:py-10'
        }`}
      >
        {isDetailView ? (
          <DetailSection
            matches={serviceMatches}
            serviceParam={serviceParam}
            onBack={clearServiceFilter}
            onBook={handleBookNow}
            onOpenDetail={openServiceDetail}
          />
        ) : (
          <BrowseSection
            categories={categories}
            activeCategory={activeCategory}
            onSelectCategory={selectCategory}
            services={browseServices}
            onBook={handleBookNow}
            onViewDetails={openServiceDetail}
          />
        )}
      </div>

      {/* Quiet contact strip */}
      <section className="border-t border-border bg-card/60">
        <div className="container mx-auto px-4 sm:px-6 py-10 sm:py-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-foreground">
              Need something else?
            </h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Talk to support for a custom package, or create an account to book faster.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/contact"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              Contact Support
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-muted/60 transition-colors"
            >
              Create Account
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

type BrowseSectionProps = {
  categories: string[];
  activeCategory: string;
  onSelectCategory: (category: string) => void;
  services: Service[];
  onBook: (service: Service) => void;
  onViewDetails: (service: Service) => void;
};

const BrowseSection: React.FC<BrowseSectionProps> = ({
  categories,
  activeCategory,
  onSelectCategory,
  services,
  onBook,
  onViewDetails,
}) => (
  <>
    <div className="sticky top-16 z-30 -mx-4 sm:mx-0 px-4 sm:px-0 py-3 mb-6 bg-background/95 backdrop-blur-sm border-b border-border/80">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {categories.map((category) => {
          const active = category === activeCategory;
          return (
            <button
              key={category}
              type="button"
              onClick={() => onSelectCategory(category)}
              className={`shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/60 text-foreground hover:bg-muted'
              }`}
            >
              {category}
            </button>
          );
        })}
      </div>
    </div>

    {services.length === 0 ? (
      <div className="rounded-2xl border border-border bg-card p-10 sm:p-12 text-center">
        <h3 className="text-xl font-semibold mb-2">No services found</h3>
        <p className="text-muted-foreground mb-6">
          Nothing matches this category right now.
        </p>
        <button
          type="button"
          onClick={() => onSelectCategory('All')}
          className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
        >
          View all services
        </button>
      </div>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
        {services.map((service, index) => (
          <motion.article
            key={service._id}
            id={service._id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{
              duration: 0.4,
              delay: Math.min(index * 0.05, 0.25),
              ease: [0.22, 1, 0.36, 1],
            }}
            className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col min-w-0"
          >
            <div className="aspect-[16/10] bg-muted/40 overflow-hidden">
              <img
                src={getServiceImage(service)}
                alt={service.name}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="p-4 sm:p-5 flex flex-col flex-1 gap-3">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-bold text-foreground leading-snug break-words">
                  {service.name}
                </h2>
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded-md">
                  {service.category}
                </span>
              </div>

              <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                {service.description}
              </p>

              <div className="mt-auto pt-3 border-t border-border flex items-end justify-between gap-3">
                <div>
                  <p className="text-xl font-bold text-primary">₹{service.price}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {service.duration} mins
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onViewDetails(service)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
                >
                  View details
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onBook(service)}
                  className="flex-1 inline-flex items-center justify-center px-3 py-2.5 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors"
                >
                  Book Now
                </button>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    )}
  </>
);

type DetailSectionProps = {
  matches: Service[];
  serviceParam: string | null;
  onBack: () => void;
  onBook: (service: Service) => void;
  onOpenDetail: (service: Service) => void;
};

const DetailSection: React.FC<DetailSectionProps> = ({
  matches,
  serviceParam,
  onBack,
  onBook,
  onOpenDetail,
}) => {
  if (matches.length === 0) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <button
          type="button"
          onClick={onBack}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to all services
        </button>
        <h2 className="text-2xl font-semibold mb-2">No services found</h2>
        <p className="text-muted-foreground mb-6">
          We couldn&apos;t find anything matching “{serviceParam}”.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
        >
          Browse all services
        </button>
      </div>
    );
  }

  if (matches.length > 1) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <button
          type="button"
          onClick={onBack}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to all services
        </button>

        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {serviceParam}
          </h1>
          <p className="text-muted-foreground mt-1">
            {matches.length} matching services — pick one to see details or book.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {matches.map((service, index) => (
            <motion.article
              key={service._id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.2) }}
              className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col"
            >
              <div className="aspect-[16/10] bg-muted/40 overflow-hidden">
                <img
                  src={getServiceImage(service)}
                  alt={service.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4 flex flex-col flex-1 gap-3">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-bold text-foreground">{service.name}</h2>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded-md shrink-0">
                    {service.category}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {service.description}
                </p>
                <p className="text-lg font-bold text-primary mt-auto">₹{service.price}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenDetail(service)}
                    className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"
                  >
                    View details
                  </button>
                  <button
                    type="button"
                    onClick={() => onBook(service)}
                    className="flex-1 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted/50"
                  >
                    Book Now
                  </button>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </motion.div>
    );
  }

  const service = matches[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="max-w-6xl mx-auto"
    >
      <button
        type="button"
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to all services
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
        <div className="w-full min-w-0">
          <div className="relative w-full overflow-hidden rounded-2xl bg-muted/30 border border-border aspect-[4/3] sm:aspect-[16/11]">
            <img
              src={getServiceImage(service)}
              alt={service.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        </div>

        <div className="min-w-0 space-y-6">
          <div>
            <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-md mb-3">
              {service.category}
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight break-words">
              {service.name}
            </h1>
            <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed break-words">
              {service.description}
            </p>
          </div>

          {service.features && service.features.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
                What&apos;s included
              </h2>
              <ul className="space-y-2.5">
                {service.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-foreground">
                    <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span className="break-words">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="pt-4 border-t border-border space-y-4">
            <div className="flex flex-wrap items-end gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Price
                </p>
                <p className="text-3xl font-bold text-primary">₹{service.price}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Duration
                </p>
                <p className="text-lg font-semibold text-foreground flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-primary" />
                  {service.duration} mins
                </p>
              </div>
            </div>

            {isGeneralServiceItem(service) && (
              <p className="text-xs sm:text-sm text-muted-foreground">
                Displayed prices are indicative only. The final amount will be as per the
                generated invoice.
              </p>
            )}

            {/* Desktop CTA */}
            <button
              type="button"
              onClick={() => onBook(service)}
              className="hidden lg:inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3.5 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              Book Now
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Sticky mobile Book Now */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-4 max-w-lg mx-auto">
          <div className="min-w-0">
            <p className="text-lg font-bold text-primary leading-none">₹{service.price}</p>
            <p className="text-xs text-muted-foreground mt-1 truncate">{service.name}</p>
          </div>
          <button
            type="button"
            onClick={() => onBook(service)}
            className="ml-auto shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold"
          >
            Book Now
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default PublicServices;
