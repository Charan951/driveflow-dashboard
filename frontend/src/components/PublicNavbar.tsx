import React, { useState, useEffect, useMemo } from 'react';
  import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { serviceService, Service } from '@/services/serviceService';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";

const PublicNavbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [isServicesExpanded, setIsServicesExpanded] = useState(false);
  const location = useLocation();

  const closeSidebar = () => {
    setIsOpen(false);
  };

  const toggleCategory = (title: string) => {
    setExpandedCategories(prev => 
      prev.includes(title) 
        ? prev.filter(t => t !== title) 
        : [...prev, title]
    );
  };

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const data = await serviceService.getServices();
        // Ensure data is an array before setting it
        if (Array.isArray(data)) {
          setServices(data);
        } else {
          // Handle cases where data is not an array (e.g., API error returns an object)
          console.error('Received non-array data for services:', data);
          setServices([]); // Set to empty array to prevent crash
        }
      } catch (error) {
        console.error('Failed to fetch services for navbar:', error);
        setServices([]); // Also set to empty array on fetch failure
      }
    };
    fetchServices();
  }, []);

  const serviceCategories = useMemo(() => {
    const categories = [
       { title: "1. Services", dbKeys: ["Services", "Periodic", "Repair", "AC"], items: [] as any[] },
       { title: "2. CAR WASH", dbKeys: ["Car Wash", "Wash", "Detailing"], items: [] as any[] },
       { title: "3. TYRES & BATTERY", dbKeys: ["Tyre & Battery", "Tyres", "Battery"], items: [] as any[] },
       { title: "4. INSURANCE", dbKeys: ["Insurance"], items: [] as any[], path: "/services?service=Insurance" },
       { title: "5. OTHER", dbKeys: ["Other", "Painting", "Denting", "Accessories"], items: [] as any[] }
     ];

    services.forEach(service => {
      const category = categories.find(c => c.dbKeys.includes(service.category));
      if (category) {
        category.items.push({
          name: service.name,
          path: `/services?service=${encodeURIComponent(service.name)}`
        });
      } else {
        // Fallback to "OTHER" if category doesn't match
        const otherCategory = categories.find(c => c.title === "5. OTHER");
        if (otherCategory) {
          otherCategory.items.push({
            name: service.name,
            path: `/services?service=${encodeURIComponent(service.name)}`
          });
        }
      }
    });

    return categories;
  }, [services]);

  // Close sidebar on route change
  useEffect(() => {
    closeSidebar();
  }, [location.pathname]);

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const links = [
    { name: 'Home', path: '/' },
    { name: 'About Us', path: '/about-us' },
    { name: 'Services', path: '/services' },
    { name: 'Reviews', path: '/reviews' },
    { name: 'Blog', path: '/blog' },
    { name: 'Careers', path: '/careers' },
    { name: 'FAQs', path: '/faqs' },
    { name: 'Contact', path: '/contact' },
  ];

  const transparentPaths = ['/', '/about-us', '/careers', '/contact', '/faqs', '/reviews'];
  const isTransparentPage = transparentPaths.includes(location.pathname);
  const shouldBeScrolled = isScrolled || !isTransparentPage;

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        shouldBeScrolled 
          ? 'bg-card/80 backdrop-blur-xl border-b border-border shadow-sm' 
          : 'bg-transparent'
      }`}>
        <div className="w-full px-4 md:px-8 h-16 flex items-center justify-between">
          <Link 
            to="/" 
            className="flex items-center gap-2">
            <div className="w-70 h-16 flex items-center justify-center mt-4 md:mt-3">
              <img
                src="/carzzilogo.png"
                alt="Carzzi"
                className="w-full h-full object-contain"
              />
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <NavigationMenu>
              <NavigationMenuList className="gap-6">
                {links.map((link) => {
                  if (link.name === 'Services') {
                    return (
                      <NavigationMenuItem key={link.name}>
                        <NavigationMenuTrigger className={`flex items-center gap-1 text-sm font-medium transition-colors outline-none bg-transparent hover:bg-transparent focus:bg-transparent data-[state=open]:bg-transparent p-0 h-auto ${
                          location.pathname.startsWith('/services')
                            ? 'text-primary'
                            : (shouldBeScrolled ? 'text-foreground hover:text-primary' : 'text-white/90 hover:text-white')
                        }`}>
                          {link.name}
                        </NavigationMenuTrigger>
                        <NavigationMenuContent>
                          <div className="grid grid-cols-2 w-[500px] p-6 gap-6 bg-card border border-border shadow-2xl rounded-2xl">
                            {serviceCategories.filter(c => c.items.length > 0 || c.dbKeys.includes('Insurance')).map((category) => (
                              <div key={category.title} className="space-y-3">
                                <h4 className="text-sm font-bold text-primary uppercase tracking-wider">{category.title}</h4>
                                <div className="flex flex-col gap-2">
                                  {category.items.length > 0 ? (
                                    category.items.map((item) => (
                                      <NavigationMenuLink key={item.name} asChild>
                                        <Link 
                                          to={item.path}
                                          className="text-sm text-muted-foreground hover:text-primary transition-colors py-1">
                                          {item.name}
                                        </Link>
                                      </NavigationMenuLink>
                                    ))
                                  ) : (
                                    <NavigationMenuLink asChild>
                                      <Link 
                                        to={category.path!}
                                        className="text-sm text-muted-foreground hover:text-primary transition-colors py-1">
                                        View Insurance
                                      </Link>
                                    </NavigationMenuLink>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </NavigationMenuContent>
                      </NavigationMenuItem>
                    );
                  }
                  return (
                    <NavigationMenuItem key={link.path}>
                      <NavigationMenuLink asChild>
                        <Link
                          to={link.path}
                          className={`text-sm font-medium transition-colors ${
                            location.pathname === link.path
                              ? 'text-primary'
                              : (shouldBeScrolled ? 'text-foreground hover:text-primary' : 'text-white/90 hover:text-white')
                          }`}>
                          {link.name}
                        </Link>
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                  );
                })}
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Link 
              to="/login" 
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                shouldBeScrolled ? 'text-foreground hover:text-primary' : 'text-white/90 hover:text-white'
              }`}>
              Login
            </Link>
            <Link 
              to="/register" 
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-semibold hover:bg-primary/90 transition-all shadow-md hover:shadow-lg active:scale-95">
              Get Started
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`md:hidden p-2 transition-colors ${
              isScrolled ? 'text-foreground hover:text-primary' : 'text-white hover:text-white/80'
            }`}>
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeSidebar}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] md:hidden"/>
            
            {/* Sidebar */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-[300px] bg-card border-r border-border z-[70] md:hidden flex flex-col shadow-2xl">
              <div className="h-16 flex items-center justify-between px-4 border-b border-border">
                <Link 
                  to="/" 
                  className="flex items-center gap-2">
                  <img
                      src="/speshway-logo.png"
                      alt="Carzzi"
                      className="w-10 h-10 rounded-lg object-cover mt-1"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = '<svg class="w-5 h-5 text-primary-foreground" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 13.1V16c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>';
                        }
                      }}
                    />
                  <span className="font-semibold text-base">Carzzi</span>
                </Link>
                <button
                  onClick={closeSidebar}
                  className="p-2 hover:bg-muted rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-2 py-6 flex flex-col gap-1 custom-scrollbar">
                {links.map((link) => {
                  if (link.name === 'Services') {
                    return (
                      <div key={link.name} className="flex flex-col gap-1">
                        <button
                          onClick={() => setIsServicesExpanded(!isServicesExpanded)}
                          className={`w-full flex items-center justify-between text-sm font-semibold text-primary uppercase tracking-wider px-3 py-2.5 rounded-lg hover:bg-muted transition-colors ${
                            location.pathname.startsWith('/services') ? 'bg-primary/5' : ''
                          }`}>
                          {link.name}
                          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isServicesExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {isServicesExpanded && (
                          <div className="flex flex-col gap-1 pl-4 border-l border-border ml-3 my-1">
                            {serviceCategories.filter(c => c.items.length > 0 || c.dbKeys.includes('Insurance')).map((category) => (
                              <div key={category.title} className="flex flex-col gap-1">
                                <button
                                  onClick={() => toggleCategory(category.title)}
                                  className="w-full flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-tight px-3 py-2 hover:bg-muted rounded-md transition-colors text-left">
                                  {category.title}
                                  <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${expandedCategories.includes(category.title) ? 'rotate-180' : ''}`} />
                                </button>
                                
                                {expandedCategories.includes(category.title) && (
                                  <div className="flex flex-col gap-1 pl-4">
                                    {category.items.length > 0 ? (
                                      category.items.map((item) => (
                                        <Link
                                          key={item.name}
                                          to={item.path}
                                          className="text-sm text-foreground hover:text-primary transition-colors py-2 px-3 rounded-md hover:bg-muted/50">
                                          {item.name}
                                        </Link>
                                      ))
                                    ) : (
                                      <Link
                                        to={category.path!}
                                        className="text-sm text-foreground hover:text-primary transition-colors py-2 px-3 rounded-md hover:bg-muted/50">
                                        View Insurance
                                      </Link>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                            <Link
                              to="/services"
                              className="text-sm font-medium text-primary hover:underline px-3 py-2.5">
                              View All Services
                            </Link>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      className={`text-sm font-medium transition-colors px-3 py-2.5 rounded-lg ${
                        location.pathname === link.path
                          ? 'bg-primary/10 text-primary'
                          : 'text-foreground hover:bg-muted'
                      }`}>
                      {link.name}
                    </Link>
                  );
                })}
                
                <div className="flex flex-col gap-3 pt-6 mt-4 border-t border-border px-2">
                  <Link 
                    to="/login"
                    className="px-4 py-2.5 text-sm font-medium text-center text-foreground hover:text-primary transition-colors border border-border rounded-xl">
                    Login
                  </Link>
                  <Link 
                    to="/register"
                    className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium text-center hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
                    Get Started
                  </Link>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default PublicNavbar;
