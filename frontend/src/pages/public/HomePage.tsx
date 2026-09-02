/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Wrench,
  Shield,
  ArrowRight,
  ChevronRight,
  Droplets,
  Battery,
  Star,
  Zap,
  Disc,
  PaintBucket,
  Thermometer,
  Package,
  ReceiptText,
  CalendarCheck,
  MapPin,
  Award,
  Sparkles,
  Wallet,
  Headset,
  Car,
  Home,
  UserCheck,
  ClipboardCheck,
  type LucideIcon,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { serviceService, Service } from "@/services/serviceService";
import { heroService } from "@/services/heroService";

const staticServices = [
  {
    icon: Wrench,
    title: "Maintenance",
    description:
      "Complete vehicle servicing and repairs by certified professionals.",
    color: "bg-blue-500",
    image:
      "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&q=80&w=600",
    link: "/services?category=Cars&service=Periodic%20Maintenance",
  },
  {
    icon: Shield,
    title: "Essentials",
    description:
      "Essential add-ons and safety checks to keep you protected on the road.",
    color: "bg-purple-500",
    image:
      "https://images.unsplash.com/photo-1560520134-94391c380e1a?auto=format&fit=crop&q=80&w=600",
    link: "/services?service=Essentials",
  },
  {
    icon: Droplets,
    title: "Car Wash",
    description:
      "Premium washing and detailing packages for that showroom shine.",
    color: "bg-cyan-500",
    image:
      "https://images.unsplash.com/photo-1607958996333-41a2c7324e8f?auto=format&fit=crop&q=80&w=600",
    link: "/services?category=Cars&service=Car%20Wash",
  },
  {
    icon: Battery,
    title: "Tires & Battery",
    description: "Quality parts replacement and installation you can trust.",
    color: "bg-orange-500",
    image:
      "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&q=80&w=600",
    link: "/services?category=Cars&service=Tyres%20%26%20Battery",
  },
];

const howItWorks = [
  {
    step: 1,
    title: "Add Your Vehicle",
    description: "Register your vehicle details in our system",
  },
  {
    step: 2,
    title: "Book a Service",
    description: "Choose from our wide range of services",
  },
  {
    step: 3,
    title: "Pickup & Service",
    description: "Our driver picks up your vehicle for service",
  },
  {
    step: 4,
    title: "Track & Relax",
    description: "Real-time updates on your service status",
  },
];

const defaultHeroSlides = [
  {
    id: 1,
    image:
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80&w=1200",
    titleWhite: "Expert Maintenance &",
    titleBlue: "Repair",
    subtitle:
      "Certified mechanics, genuine parts, and transparent pricing. We treat your vehicle like our own.",
  },
  // {
  //   id: 2,
  //   image: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=80&w=1920",
  //   titleWhite: "Expert",
  //   titleBlue: "Maintenance",
  //   subtitle: "Certified mechanics, genuine parts, and transparent pricing. We treat your car like our own."
  // },
  // {
  //   id: 3,
  //   image: "https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?auto=format&fit=crop&q=80&w=1920",
  //   titleWhite: "Premium",
  //   titleBlue: "Detailing",
  //   subtitle: "Give your vehicle the shine it deserves with our eco-friendly and detailed washing services."
  // }
];

const getHomeHeroImageSources = (imageUrl?: string) => {
  if (!imageUrl) {
    return { src: "", srcSet: undefined as string | undefined };
  }

  if (imageUrl.includes("unsplash.com")) {
    const base = imageUrl.split("?")[0];
    const build = (width: number, height: number) =>
      `${base}?auto=format&fm=webp&fit=crop&crop=entropy&q=80&w=${width}&h=${height}`;

    return {
      src: build(1200, 900),
      srcSet: `${build(640, 960)} 640w, ${build(1200, 900)} 1200w, ${build(1920, 1080)} 1920w`,
    };
  }

  return { src: imageUrl, srcSet: undefined as string | undefined };
};

interface WorkflowStep {
  icon: LucideIcon;
  title: string;
  caption: string;
  image: string;
}

interface Workflow {
  name: string;
  journeyName: string;
  steps: WorkflowStep[];
}

const workflows: Workflow[] = [
  {
    name: "General Service",
    journeyName: "The Carzzi Service Journey",
    steps: [
      {
        icon: CalendarCheck,
        title: "Service Booking",
        caption: "Choose your service and schedule it easily through the Carzzi App.",
        image: "/images/workflows/general/1.jpg",
      },
      {
        icon: UserCheck,
        title: "Appointing a Driver",
        caption: "We appoint a verified driver from our trained team who will pick up your vehicle.",
        image: "/images/workflows/general/2.jpg",
      },
      {
        icon: Car,
        title: "Vehicle Pickup",
        caption: "Our verified driver performs a digital inspection and picks up your vehicle from your doorstep.",
        image: "/images/workflows/general/3.jpg",
      },
      {
        icon: Home,
        title: "We Deliver",
        caption: "We deliver your serviced vehicle back to your doorstep.",
        image: "/images/workflows/general/4.jpg",
      },
    ],
  },
  {
    name: "Car Wash",
    journeyName: "The Carzzi Car Wash Journey",
    steps: [
      {
        icon: CalendarCheck,
        title: "Service Booking",
        caption: "Book your car wash service in just a few taps through the Carzzi App.",
        image: "/images/workflows/wash/1.jpg",
      },
      {
        icon: UserCheck,
        title: "Assigning a Professional",
        caption: "We assign a trained and verified car wash technician to provide the service at your location.",
        image: "/images/workflows/wash/2.jpg",
      },
      {
        icon: Droplets,
        title: "Car Wash at Your Doorstep",
        caption: "Enjoy a professional car wash at your doorstep without leaving your home.",
        image: "/images/workflows/wash/3.jpg",
      },
    ],
  },
  {
    name: "Tyre Replacement",
    journeyName: "The Carzzi Tyre Replacement Journey",
    steps: [
      {
        icon: CalendarCheck,
        title: "Book Your Service",
        caption: "Book your tyre replacement in just a few taps through the Carzzi App.",
        image: "/images/workflows/tyre/1.jpg",
      },
      {
        icon: UserCheck,
        title: "Assigning a Professional",
        caption: "We connect you with the professional to handle your tyre replacement process.",
        image: "/images/workflows/tyre/2.jpg",
      },
      {
        icon: ClipboardCheck,
        title: "Pickup & Inspection",
        caption: "You hand over the keys, our professional performs a quick inspection and picks up your vehicle.",
        image: "/images/workflows/tyre/3.jpg",
      },
      {
        icon: Disc,
        title: "Delivered Back to You",
        caption: "New tyres professionally fitted & balanced, delivered safely to your doorstep.",
        image: "/images/workflows/tyre/4.jpg",
      },
    ],
  },
  {
    name: "Battery Replacement",
    journeyName: "The Carzzi Battery Replacement Journey",
    steps: [
      {
        icon: CalendarCheck,
        title: "Book Your Service",
        caption: "Book your battery replacement in just a few taps through the Carzzi App.",
        image: "/images/workflows/battery/1.jpg",
      },
      {
        icon: UserCheck,
        title: "Assigning a Professional",
        caption: "We assign a verified Carzzi technician who comes to you at your preferred time.",
        image: "/images/workflows/battery/2.jpg",
      },
      {
        icon: ClipboardCheck,
        title: "Doorstep Inspection",
        caption: "Our expert checks your battery and electrical system to ensure the right replacement.",
        image: "/images/workflows/battery/3.jpg",
      },
      {
        icon: Battery,
        title: "Delivered — Peace of Mind",
        caption: "New battery professionally fitted & tested, delivered safely to your doorstep.",
        image: "/images/workflows/battery/4.jpg",
      },
    ],
  },
];

const WORKFLOW_AUTOPLAY_MS = 5800;

const WorkflowsSection: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % workflows.length);
    }, WORKFLOW_AUTOPLAY_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeIndex]);

  const active = workflows[activeIndex];
  const stepCount = active.steps.length;

  return (
    <section className="py-24 bg-background overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            How Carzzi Works
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            One simple journey, tailored to every service.
          </p>
        </div>

        {/* Tab pills with autoplay progress */}
        <div className="flex flex-wrap justify-center gap-3 mb-14">
          {workflows.map((wf, i) => {
            const isActive = i === activeIndex;
            return (
              <button
                key={wf.name}
                onClick={() => setActiveIndex(i)}
                className={`relative overflow-hidden px-5 py-2.5 rounded-full font-semibold text-sm transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                {isActive && (
                  <span
                    key={activeIndex}
                    className="absolute inset-0 bg-white/25 origin-left"
                    style={{
                      animation: `workflow-progress ${WORKFLOW_AUTOPLAY_MS}ms linear forwards`,
                    }}
                  />
                )}
                <span className="relative">{wf.name}</span>
              </button>
            );
          })}
        </div>

        <div key={activeIndex} className="max-w-6xl mx-auto">
          {/* Road header: START — 1 — 2 — 3 ... — END */}
          <div
            className="mb-2 text-center opacity-0"
            style={{ animation: "workflow-fade-up 0.4s ease-out forwards" }}
          >
            <span className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-primary">
              <span className="h-px w-8 bg-primary/40" />
              {active.journeyName}
              <span className="h-px w-8 bg-primary/40" />
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 mb-6 px-6">
            <MapPin className="w-6 h-6 text-primary shrink-0" />
            <div className="relative flex-1 flex items-center justify-between">
              <div className="absolute left-0 right-0 h-0.5 border-t-2 border-dashed border-primary/40" />
              {active.steps.map((_, i) => (
                <span
                  key={i}
                  className="relative z-10 flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow shrink-0 opacity-0"
                  style={{
                    animation: "workflow-step-in 0.4s ease-out forwards",
                    animationDelay: `${0.1 + i * 0.15}s`,
                  }}
                >
                  {i + 1}
                </span>
              ))}
            </div>
            <MapPin className="w-6 h-6 text-primary shrink-0 fill-primary/20" />
          </div>
          <div className="hidden sm:flex justify-between px-1 mb-10 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <span>Start</span>
            <span className="text-primary">Delivered</span>
          </div>

          {/* Step cards */}
          <div
            className={`grid gap-5 sm:gap-6 workflow-steps-grid-${stepCount}`}
            style={{ gridTemplateColumns: `repeat(${Math.min(stepCount, 2)}, minmax(0, 1fr))` }}
          >
            <style>{`
              @media (min-width: 640px) {
                .workflow-steps-grid-${stepCount} { grid-template-columns: repeat(${stepCount}, minmax(0, 1fr)) !important; }
              }
            `}</style>
            <div className="contents">
              {active.steps.map((step, i) => (
                <div
                  key={step.title}
                  className="opacity-0"
                  style={{
                    animation: "workflow-fade-up 0.5s ease-out forwards",
                    animationDelay: `${0.15 + i * 0.15}s`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                      {i + 1}
                    </span>
                    <h3 className="font-bold text-sm sm:text-base leading-snug">
                      {step.title}
                    </h3>
                  </div>
                  <div className="relative rounded-2xl overflow-hidden aspect-[4/3] mb-3 shadow-md bg-muted">
                    <img
                      src={step.image}
                      alt={step.title}
                      loading={i === 0 ? "eager" : "lazy"}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-2 left-2 flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground shadow-lg">
                      <step.icon className="w-4 h-4" />
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                    {step.caption}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes workflow-progress {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
        @keyframes workflow-fade-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes workflow-step-in {
          from { opacity: 0; transform: scale(0.7); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </section>
  );
};

const HomePage: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [heroSlides, setHeroSlides] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem("hero_slides");
      return cached ? JSON.parse(cached) : defaultHeroSlides;
    } catch {
      return defaultHeroSlides;
    }
  });
  const [showGetStarted, setShowGetStarted] = useState<boolean>(() => {
    try {
      const cached = localStorage.getItem("hero_show_get_started");
      return cached !== null ? JSON.parse(cached) : true;
    } catch {
      return true;
    }
  });
  const [showLearnMore, setShowLearnMore] = useState<boolean>(() => {
    try {
      const cached = localStorage.getItem("hero_show_learn_more");
      return cached !== null ? JSON.parse(cached) : true;
    } catch {
      return true;
    }
  });
  // Initialize with staticServices to ensure content is always visible (Optimistic UI / Fallback)

  const [services, setServices] = useState<any[]>(staticServices);
  const { data: servicesData, isLoading: isServicesLoading } = useQuery({
    queryKey: ["services", "premium"],
    queryFn: () =>
      serviceService.getServices(undefined, undefined, undefined, true),
    staleTime: 1000 * 60 * 5,
  });

  const { data: heroData, isLoading: isHeroLoading } = useQuery({
    queryKey: ["heroSettings"],
    queryFn: heroService.getHeroSettings,
    staleTime: 1000 * 60 * 5,
  });

  const loading = isServicesLoading || isHeroLoading;

  useEffect(() => {
    const timer = setInterval(() => {
      if (heroSlides.length > 0) {
        setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  useEffect(() => {
    if (heroSlides.length > 0 && currentSlide >= heroSlides.length) {
      setCurrentSlide(0);
    }
  }, [heroSlides.length, currentSlide]);

  useEffect(() => {
    if (heroData) {
      if (
        Array.isArray(heroData.homeSlides) &&
        heroData.homeSlides.length > 0
      ) {
        const processedSlides = heroData.homeSlides.map((s: any) => {
          if (s.title && !s.titleWhite && !s.titleBlue) {
            const parts = s.title.split(" ");
            const titleBlue = parts.pop() || "";
            const titleWhite = parts.join(" ");
            return { ...s, titleWhite, titleBlue };
          }
          return {
            ...s,
            titleWhite: s.titleWhite || "",
            titleBlue: s.titleBlue || "",
          };
        });
        setHeroSlides(processedSlides);
        try {
          localStorage.setItem("hero_slides", JSON.stringify(processedSlides));
        } catch (e) {
          console.error("Failed to cache hero slides", e);
        }
      }
      if (heroData.showGetStarted !== undefined) {
        setShowGetStarted(heroData.showGetStarted);
        try {
          localStorage.setItem(
            "hero_show_get_started",
            JSON.stringify(heroData.showGetStarted),
          );
        } catch (e) {
          console.error("Failed to cache hero_show_get_started", e);
        }
      }
      if (heroData.showLearnMore !== undefined) {
        setShowLearnMore(heroData.showLearnMore);
        try {
          localStorage.setItem(
            "hero_show_learn_more",
            JSON.stringify(heroData.showLearnMore),
          );
        } catch (e) {
          console.error("Failed to cache hero_show_learn_more", e);
        }
      }
    }
  }, [heroData]);

  useEffect(() => {
    if (
      servicesData &&
      Array.isArray(servicesData) &&
      servicesData.length > 0
    ) {
      const mappedServices = servicesData
        .slice(0, 4)
        .map((service: Service) => {
          const config = getServiceConfig(service.category);
          return {
            icon: config.icon,
            title: service.name,
            description: service.description,
            color: config.color,
            image:
              service.image ||
              "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&q=80&w=600",
            link: `/services?category=Cars&service=${encodeURIComponent(service.name)}`,
          };
        });
      setServices(mappedServices);
    }
  }, [servicesData]);

  const getServiceConfig = (category: string) => {
    switch (category) {
      case "Periodic":
        return { icon: Wrench, color: "bg-blue-500" };
      case "Repair":
        return { icon: Wrench, color: "bg-red-500" };
      case "Wash":
        return { icon: Droplets, color: "bg-cyan-500" };
      case "Tyres":
        return { icon: Disc, color: "bg-orange-500" };
      case "Denting":
      case "Painting":
        return { icon: PaintBucket, color: "bg-purple-500" };
      case "Detailing":
        return { icon: Star, color: "bg-indigo-500" };
      case "AC":
        return { icon: Thermometer, color: "bg-sky-500" };
      case "Accessories":
        return { icon: Package, color: "bg-green-500" };
      default:
        return { icon: Wrench, color: "bg-gray-500" };
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative w-full min-h-[600px] h-[100svh] overflow-hidden">
        {/* Carousel Background */}
        {heroSlides.map((slide, index) => {
          const isActive = index === currentSlide;
          const imageSources = getHomeHeroImageSources(slide?.image);
          return (
            <div
              key={slide.id || index}
              className={`absolute inset-0 transition-opacity duration-[1500ms] ease-in-out ${
                isActive
                  ? "opacity-100 z-10"
                  : "opacity-0 z-0 pointer-events-none"
              }`}
            >
              {imageSources.src ? (
                <img
                  src={imageSources.src}
                  srcSet={imageSources.srcSet}
                  sizes="100vw"
                  alt={slide?.titleWhite || slide?.title || "Carzzi hero"}
                  className="absolute inset-0 h-full w-full object-cover object-[50%_38%] md:object-center"
                  loading={index === 0 ? "eager" : "lazy"}
                  fetchPriority={index === 0 ? "high" : "low"}
                  decoding="async"
                />
              ) : (
                <div className="absolute inset-0 bg-muted" />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/65 to-black/35 md:via-black/40 md:to-transparent" />
            </div>
          );
        })}

        <div className="relative z-20 mx-auto flex min-h-[600px] h-[100svh] items-center px-4 pt-16 pb-10 container">
          <div className="relative min-h-[250px] flex flex-col justify-center w-full">
            {heroSlides.map((slide, index) => {
              const isActive = index === currentSlide;
              return (
                <div
                  key={slide.id || index}
                  className={`max-w-4xl flex flex-col justify-center transition-all duration-500 ease-in-out transform ${
                    isActive
                      ? "relative opacity-100 translate-x-0 z-10"
                      : "absolute inset-0 opacity-0 -translate-x-12 pointer-events-none z-0"
                  }`}
                >
                  <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-[1.1] min-h-[90px] md:min-h-[140px]">
                    {slide?.titleWhite || ""} <br />
                    <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">
                      {slide?.titleBlue || ""}
                    </span>
                  </h1>
                  <p className="text-lg md:text-xl text-gray-200 mb-8 max-w-2xl leading-relaxed opacity-90">
                    {slide?.subtitle || ""}
                  </p>
                  {(showGetStarted || showLearnMore) && (
                    <div className="flex flex-row items-center gap-3 sm:gap-5">
                      {showGetStarted && (
                        <Link
                          to="/register"
                          className="inline-flex items-center justify-center gap-2 px-6 py-3 sm:px-10 sm:py-4.5 bg-primary text-primary-foreground rounded-full font-bold text-lg sm:text-xl hover:bg-primary/90 transition-all duration-300 shadow-xl hover:shadow-primary/40 hover:-translate-y-1.5 whitespace-nowrap"
                        >
                          Get Started
                          <ArrowRight className="w-4 h-4 sm:w-6 sm:h-6" />
                        </Link>
                      )}
                      {showLearnMore && (
                        <Link
                          to="/about-us"
                          aria-label="Learn more about Carzzi's automotive services"
                          className="inline-flex items-center justify-center gap-2 px-6 py-3 sm:px-10 sm:py-4.5 bg-white/5 backdrop-blur-xl text-white rounded-full font-bold text-lg sm:text-xl hover:bg-white/15 transition-all border border-white/30 whitespace-nowrap"
                        >
                          Learn More{" "}
                          <span className="sr-only">about our services</span>
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
                      currentSlide === index
                        ? "w-16 bg-primary shadow-lg shadow-primary/50"
                        : "w-3 bg-white/30 hover:bg-white/50"
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* App Download Section */}
      <section className="relative overflow-hidden bg-primary py-20 sm:py-28">
        <img
          src="https://images.unsplash.com/photo-1485291571150-772bcfc10da5?auto=format&fit=crop&q=80&w=1200"
          alt="Road texture"
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover opacity-10 mix-blend-overlay"
        />

        <div className="container relative mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
            {/* Copy + CTAs */}
            <div className="text-center lg:text-left order-2 lg:order-1">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-white text-xs font-bold uppercase tracking-wider mb-6">
                <Sparkles className="w-3.5 h-3.5" />
                Now on your phone
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-5 leading-tight">
                Your car&apos;s new
                <br className="hidden lg:block" /> best friend, in your pocket
              </h2>
              <p className="text-white/80 text-lg mb-8 max-w-md mx-auto lg:mx-0">
                Book services, track your vehicle live, and manage everything from one app. Faster booking, real-time updates, zero hassle.
              </p>

              <ul className="flex flex-col gap-3 mb-10 max-w-sm mx-auto lg:mx-0">
                {[
                  "Book a service in under a minute",
                  "Live GPS tracking of your vehicle",
                  "Digital invoices & service history",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-white">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white/15 shrink-0">
                      <CalendarCheck className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-sm sm:text-base">{item}</span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                <a
                  href="https://play.google.com/store/apps/details?id=com.carzzi.user&pcampaignid=web_share"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 px-5 py-3 bg-white text-primary rounded-xl font-semibold hover:bg-gray-100 transition-all shadow-xl hover:-translate-y-0.5 min-w-[200px]"
                >
                  <svg viewBox="0 0 24 24" className="w-7 h-7 shrink-0" fill="currentColor">
                    <path d="M3.6 2.4C3.2 2.8 3 3.4 3 4.1v15.8c0 .7.2 1.3.6 1.7l.1.1L13 12.5v-.1L3.6 2.4z" />
                    <path d="M16.2 15.7l-3.2-3.2v-.1l3.2-3.2 3.7 2.1c1 .6 1 1.6 0 2.2l-3.7 2.1z" />
                    <path d="M16.2 8.3L12.9 12l-9.3-9.6c.3-.2.9-.2 1.5.1l11.1 5.8z" />
                    <path d="M16.2 15.7L5.1 21.5c-.6.3-1.2.3-1.5.1l9.3-9.5 3.3 3.6z" />
                  </svg>
                  <span className="text-left leading-tight">
                    <span className="block text-[11px] opacity-70">GET IT ON</span>
                    <span className="block text-base font-bold -mt-0.5">Google Play</span>
                  </span>
                </a>
                <a
                  href="https://apps.apple.com/us/app/carzzi/id6799390325"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 px-5 py-3 bg-white text-primary rounded-xl font-semibold hover:bg-gray-100 transition-all shadow-xl hover:-translate-y-0.5 min-w-[200px]"
                >
                  <svg viewBox="0 0 24 24" className="w-7 h-7 shrink-0" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.52-3.23 0-1.44.66-2.2.47-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.09l-.01-.01zM12.03 7.25c-.15-2.23 1.66-4.09 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  <span className="text-left leading-tight">
                    <span className="block text-[11px] opacity-70">Download on the</span>
                    <span className="block text-base font-bold -mt-0.5">App Store</span>
                  </span>
                </a>
              </div>
            </div>

            {/* Phone mockup */}
            <div className="order-1 lg:order-2 flex justify-center lg:justify-end">
              <div className="relative w-[240px] sm:w-[280px]">
                {/* Device frame */}
                <div className="relative rounded-[2.5rem] bg-black p-2.5 shadow-2xl animate-[float_6s_ease-in-out_infinite]">
                  <div className="rounded-[2rem] overflow-hidden bg-white aspect-[9/19.5]">
                    <img
                      src="/images/app-dashboard-screenshot.png"
                      alt="Carzzi mobile app customer dashboard"
                      loading="lazy"
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-16px); }
          }
        `}</style>
      </section>

      {/* Services Section */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Premium Services
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Everything your car needs, delivered with excellence.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {services.map((service, index) => (
              <div key={index} className="h-full">
                <Link
                  to={service.link}
                  className="group block relative overflow-hidden rounded-2xl bg-card border border-border shadow-sm hover:shadow-xl transition-all duration-300 h-full"
                >
                  <div className="aspect-[4/3] overflow-hidden">
                    <img
                      src={
                        service.image?.includes("unsplash.com")
                          ? `${service.image.split("?")[0]}?auto=format&fm=webp&fit=crop&q=50&w=400`
                          : service.image?.includes("amazonaws.com") ||
                              service.image?.includes("/uploads/")
                            ? `https://wsrv.nl/?url=${encodeURIComponent(service.image)}&w=400&output=webp&q=50`
                            : service.image
                      }
                      srcSet={
                        service.image?.includes("unsplash.com")
                          ? `${service.image.split("?")[0]}?auto=format&fm=webp&fit=crop&q=50&w=400 400w, ${service.image.split("?")[0]}?auto=format&fm=webp&fit=crop&q=50&w=800 800w`
                          : service.image?.includes("amazonaws.com") ||
                              service.image?.includes("/uploads/")
                            ? `https://wsrv.nl/?url=${encodeURIComponent(service.image)}&w=400&output=webp&q=50 400w, https://wsrv.nl/?url=${encodeURIComponent(service.image)}&w=800&output=webp&q=50 800w`
                            : undefined
                      }
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      alt={service.title}
                      loading="lazy"
                      className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                    <div
                      className={`absolute top-4 right-4 p-3 rounded-xl ${service.color} text-white shadow-lg`}
                    >
                      <service.icon className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-2">{service.title}</h3>
                    <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                      {service.description}
                    </p>
                    <span className="inline-flex items-center text-primary font-medium group-hover:gap-2 transition-all">
                      View Details <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <WorkflowsSection />

      {/* Why Choose Us */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-stretch">
            {/* Left: heading + 8-card feature grid */}
            <div>
              <h2 className="text-3xl sm:text-5xl font-extrabold mb-3 leading-tight">
                Why Choose <span className="text-primary">Carzzi?</span>
              </h2>
              <p className="text-muted-foreground text-lg mb-10">
                Smart care. Honest service.{" "}
                <span className="text-primary font-semibold">
                  Total peace of mind.
                </span>
              </p>

              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  {
                    icon: Shield,
                    title: "100% Authorized Dealers Only",
                    desc: "Your car is in the hands of 100% authorized dealers and trained professionals.",
                  },
                  {
                    icon: ReceiptText,
                    title: "Upfront Estimates, Always",
                    desc: "Clear, upfront service estimates before any work begins. No surprises later.",
                  },
                  {
                    icon: CalendarCheck,
                    title: "Easy & Convenient",
                    desc: "Book in minutes, choose your time slot, and we handle the rest.",
                  },
                  {
                    icon: MapPin,
                    title: "Free Pickup & Drop",
                    desc: "Hassle-free pickup & drop at your doorstep so you save time and effort.",
                  },
                  {
                    icon: Award,
                    title: "Genuine Parts & Quality Service",
                    desc: "100% genuine parts and quality checks at every step.",
                  },
                  {
                    icon: Sparkles,
                    title: "Beauty Care for Your Car",
                    desc: "Premium cleaning, polishing & detailing to keep your car looking its best.",
                  },
                  {
                    icon: Wallet,
                    title: "Secure Payments",
                    desc: "Safe, secure and multiple payment options for a worry-free experience.",
                  },
                  {
                    icon: Headset,
                    title: "Dedicated Support",
                    desc: "Real people. Real help. We're here for you, whenever you need us.",
                  },
                ].map((item, index) => (
                  <div
                    key={index}
                    className="bg-card border border-border rounded-2xl p-5 hover:shadow-md hover:border-primary/30 transition-all"
                  >
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-3 text-primary">
                      <item.icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-base mb-1">
                      {item.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: photo showcase */}
            <div className="lg:sticky lg:top-24 flex flex-col h-full">
              <div className="relative flex-1 min-h-[420px] rounded-3xl overflow-hidden shadow-2xl bg-muted">
                <img
                  src="https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&q=80&w=1000"
                  alt="Carzzi car care"
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/30" />
                <div className="relative h-full flex flex-col p-8 sm:p-10">
                  <span className="inline-flex w-fit items-center px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-white text-xs font-bold uppercase tracking-wider">
                    We Care For
                  </span>

                  <div className="mt-auto pt-6 border-t border-white/20">
                    <p className="text-white/90 text-sm font-medium mb-3">
                      All Brands & Models • Regular Service & Repairs • Tyres &
                      Batteries • Beauty Care & Detailing • Roadside Assistance
                    </p>
                    <p className="text-2xl font-extrabold text-white">
                      Better care. Happier drives.
                    </p>
                    <p className="text-white/70 italic mt-1">
                      That's the Carzzi promise.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary z-0">
          <img
            src="https://images.unsplash.com/photo-1485291571150-772bcfc10da5?auto=format&fit=crop&q=80&w=1200"
            alt="Road texture"
            loading="lazy"
            className="w-full h-full object-cover opacity-10 mix-blend-overlay"
          />
        </div>
        <div className="container relative z-10 mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              Built For Modern Car Owners?
            </h2>
            <p className="text-white text-xl mb-10">
              Manage, Maintain, and Elevate your vehicle experience with
              Carzzi.{" "}
            </p>
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 px-10 py-4 bg-white text-primary rounded-full font-bold text-lg hover:bg-gray-100 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1"
            >
              Create Free Account
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
