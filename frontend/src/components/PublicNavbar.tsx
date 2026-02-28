import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";

const serviceCategories = [
  {
    title: "1. Services",
    items: [
      { name: "General Service", path: "/services?service=General Service" },
      { name: "Body Shop", path: "/services?service=Body Shop" },
      { name: "Insurance Claim", path: "/services?service=Insurance Claim" }
    ]
  },
  {
    title: "2. CAR WASH",
    items: [
      { name: "Exterior only (45 mins)", path: "/services?service=Exterior only (45 mins)" },
      { name: "Interior + Exterior (60–70 mins)", path: "/services?service=Interior + Exterior (60–70 mins)" },
      { name: "Interior + Exterior + Underbody (90 mins)", path: "/services?service=Interior + Exterior + Underbody (90 mins)" }
    ]
  },
  {
    title: "3. TYRES & BATTERY",
    items: [
      { name: "Default OEM size", path: "/services?service=Default OEM size" },
      { name: "Customer can opt change", path: "/services?service=Customer can opt change" },
      { name: "Battery - Amaron", path: "/services?service=Amaron Battery" },
      { name: "Battery - Exide", path: "/services?service=Exide Battery" }
    ]
  },
  {
    title: "4. INSURANCE",
    path: "/services?service=Insurance",
    items: [] // Ensure it doesn't crash if items is missing
  }
];

const PublicNavbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

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

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled 
        ? 'bg-card/80 backdrop-blur-xl border-b border-border shadow-sm' 
        : 'bg-transparent'
    }`}>
      <div className="w-full px-4 md:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img
            src="/speshway-logo.png"
            alt="Speshway Solutions"
            className="w-10 h-10 rounded-xl object-cover"
          />
          <span className={`font-semibold text-lg ${isScrolled ? 'text-foreground' : 'text-white'}`}>Speshway Solutions</span>
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
                          : (isScrolled ? 'text-foreground hover:text-primary' : 'text-white/90 hover:text-white')
                      }`}>
                        {link.name}
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <div className="grid grid-cols-2 w-[500px] p-6 gap-6 bg-card border border-border shadow-2xl rounded-2xl">
                          {serviceCategories.map((category) => (
                            <div key={category.title} className="space-y-3">
                              <h4 className="text-sm font-bold text-primary uppercase tracking-wider">{category.title}</h4>
                              <div className="flex flex-col gap-2">
                                {category.items ? (
                                  category.items.map((item) => (
                                    <NavigationMenuLink key={item.name} asChild>
                                      <Link 
                                        to={item.path}
                                        className="text-sm text-muted-foreground hover:text-primary transition-colors py-1"
                                      >
                                        {item.name}
                                      </Link>
                                    </NavigationMenuLink>
                                  ))
                                ) : (
                                  <NavigationMenuLink asChild>
                                    <Link 
                                      to={category.path!}
                                      className="text-sm text-muted-foreground hover:text-primary transition-colors py-1"
                                    >
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
                            : (isScrolled ? 'text-foreground hover:text-primary' : 'text-white/90 hover:text-white')
                        }`}
                      >
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
              isScrolled ? 'text-foreground hover:text-primary' : 'text-white/90 hover:text-white'
            }`}
          >
            Login
          </Link>
          <Link 
            to="/register" 
            className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`md:hidden p-2 transition-colors ${
            isScrolled ? 'text-foreground hover:text-primary' : 'text-white hover:text-white/80'
          }`}
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border bg-card overflow-y-auto max-h-[calc(100vh-64px)]"
          >
            <div className="container mx-auto px-4 py-6 flex flex-col gap-2">
              {links.map((link) => {
                if (link.name === 'Services') {
                  return (
                    <div key={link.name} className="flex flex-col gap-2">
                      <div className="text-sm font-semibold text-primary uppercase tracking-wider px-2 py-1">
                        {link.name}
                      </div>
                      <div className="flex flex-col gap-4 pl-4 border-l border-border ml-2 my-2">
                        {serviceCategories.map((category) => (
                          <div key={category.title} className="flex flex-col gap-2">
                            <div className="text-xs font-bold text-muted-foreground uppercase tracking-tight">
                              {category.title}
                            </div>
                            <div className="flex flex-col gap-1">
                              {category.items ? (
                                category.items.map((item) => (
                                  <Link
                                    key={item.name}
                                    to={item.path}
                                    onClick={() => setIsOpen(false)}
                                    className="text-sm text-foreground hover:text-primary transition-colors py-1.5"
                                  >
                                    {item.name}
                                  </Link>
                                ))
                              ) : (
                                <Link
                                  to={category.path!}
                                  onClick={() => setIsOpen(false)}
                                  className="text-sm text-foreground hover:text-primary transition-colors py-1.5"
                                >
                                  View Insurance
                                </Link>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setIsOpen(false)}
                    className={`text-sm font-medium transition-colors px-2 py-2 rounded-lg ${
                      location.pathname === link.path
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
              <div className="flex flex-col gap-3 pt-6 mt-4 border-t border-border">
                <Link 
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-center text-foreground hover:text-primary transition-colors"
                >
                  Login
                </Link>
                <Link 
                  to="/register"
                  onClick={() => setIsOpen(false)}
                  className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium text-center hover:bg-primary/90 transition-colors"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default PublicNavbar;
